import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { JitCompiler } from './compiler/JitCompiler';
import { IRuntimeStack, Unsubscribe } from './contracts/IRuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./contracts/events/IEvent";
import { IRuntimeMemory } from './contracts/IRuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { RuntimeSpan } from './models/RuntimeSpan';
import { SpanTrackingHandler } from '../tracker/SpanTrackingHandler';
import { IEventBus } from './contracts/events/IEventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions,
    RuntimeStackLogger,
    RuntimeStackTracker,
    RuntimeStackWrapper,
    RuntimeStackHooks,
} from './contracts/IRuntimeOptions';
import { TestableBlock } from '../testing/testable/TestableBlock';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { SnapshotClock } from './RuntimeClock';
import { NextEventHandler } from './events/NextEventHandler';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { StackPushEvent, StackPopEvent } from './events/StackEvents';
import { IOutputStatement, OutputStatement } from '../core/models/OutputStatement';
import { TimeSpan } from './models/TimeSpan';

const MAX_STACK_DEPTH = 10;

const noopTracker: RuntimeStackTracker = {
    getActiveSpanId: () => null,
    startSpan: () => { },
    endSpan: () => { },
};

const noopWrapper: RuntimeStackWrapper = {
    wrap: block => block,
    cleanup: () => { },
};

const noopHooks: RuntimeStackHooks = {
    onBeforePush: () => { },
    onAfterPush: () => { },
    onBeforePop: () => { },
    onAfterPop: () => { },
    unregisterByOwner: () => { },
};

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export interface ScriptRuntimeDependencies {
    memory: IRuntimeMemory;
    stack: IRuntimeStack;
    clock: IRuntimeClock;
    eventBus: IEventBus;
}

export class ScriptRuntime implements IScriptRuntime {

    public readonly eventBus: IEventBus;
    public readonly stack: IRuntimeStack;
    public readonly memory: IRuntimeMemory;

    public readonly clock: IRuntimeClock;
    public readonly jit: JitCompiler;

    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;

    private readonly _spanTracker: SpanTrackingHandler;

    private readonly _tracker: RuntimeStackTracker;
    private readonly _wrapper: RuntimeStackWrapper;
    private readonly _logger: RuntimeStackLogger;
    private readonly _hooks: RuntimeStackHooks;

    private _actionQueue: IRuntimeAction[] = [];
    private _isProcessingActions = false;

    // Output statement tracking
    private _outputStatements: IOutputStatement[] = [];
    private _outputListeners: Set<OutputListener> = new Set();

    // Statement index for O(1) lookups by ID
    private _statementIndex: Map<number, typeof this.script.statements[0]> = new Map();

    constructor(
        public readonly script: WodScript,
        compiler: JitCompiler,
        dependencies: ScriptRuntimeDependencies,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };

        this.memory = dependencies.memory;
        this.stack = dependencies.stack;
        this.clock = dependencies.clock;
        this.eventBus = dependencies.eventBus;

        // Note: Memory events are now dispatched by BlockContext, not via a centralized bridge.
        // This keeps RuntimeMemory pure and decoupled from the event system.

        // Event-based span tracking handler
        this._spanTracker = new SpanTrackingHandler();
        this.eventBus.register('stack:push', this._spanTracker, 'runtime', { scope: 'global' });
        this.eventBus.register('stack:pop', this._spanTracker, 'runtime', { scope: 'global' });

        // Handle explicit next events to advance the current block once per request
        this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime', { scope: 'global' });

        this._tracker = this.options.tracker ?? this._spanTracker ?? noopTracker;

        // Hooks setup
        const unregisterHook = this.options.hooks?.unregisterByOwner;
        this._hooks = {
            ...noopHooks,
            ...this.options.hooks,
            unregisterByOwner: (ownerKey: string) => {
                unregisterHook?.(ownerKey);
                this.eventBus.unregisterByOwner(ownerKey);
            }
        };

        this._logger = this.options.logger ?? this.createStackLogger();
        this._wrapper = this.options.wrapper ?? noopWrapper;

        this.jit = compiler;

        // Build statement index for O(1) lookups
        this.buildStatementIndex();

        // Start the clock
        this.clock.start();
    }

    /**
     * Build the statement index for O(1) lookups by ID.
     * Called once during construction.
     */
    private buildStatementIndex(): void {
        if (!this.script?.statements) return;
        for (const stmt of this.script.statements) {
            this._statementIndex.set(stmt.id, stmt);
        }
    }

    /**
     * Get a statement by its ID in O(1) time.
     * Used by behaviors that need to look up child statements.
     * 
     * @param id The statement ID to look up
     * @returns The statement, or undefined if not found
     */
    public getStatementById(id: number): typeof this.script.statements[0] | undefined {
        return this._statementIndex.get(id);
    }

    /**
     * Gets the currently active execution spans.
     * Used by UI to display ongoing execution state.
     */
    public get activeSpans(): ReadonlyMap<string, RuntimeSpan> {
        return this._spanTracker.getActiveSpansMap();
    }

    public get tracker(): SpanTrackingHandler {
        return this._spanTracker;
    }

    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        if (actions && actions.length > 0) {
            this.queueActions(actions);
        }
    }

    /**
     * Queue actions for processing. Actions are processed in order.
     * If already processing, actions are added to the queue and will be processed
     * after the current batch completes.
     */
    public queueActions(actions: IRuntimeAction[]) {
        if (actions.length > 0) {
            this.log(`[RT] queueActions: ${actions.map(a => a.type).join(', ')}`);
        }
        this._actionQueue.push(...actions);
        this.processActions();
    }

    private processActions() {
        if (this._isProcessingActions) {
            this.log(`[RT] processActions: already processing, queue size=${this._actionQueue.length}`);
            return;
        }

        this._isProcessingActions = true;
        this.log(`[RT] processActions: starting, queue size=${this._actionQueue.length}`);
        try {
            const MAX_ITERATIONS = 100; // Safety limit to prevent infinite loops
            let iterations = 0;

            do {
                // Process all queued actions
                while (this._actionQueue.length > 0 && iterations < MAX_ITERATIONS) {
                    const action = this._actionQueue.shift();
                    if (action) {
                        this.log(`[RT] executing: ${action.type}`);
                        action.do(this);
                    }
                    iterations++;
                }

                // Sweep completed blocks (may queue more actions via parent.next())
                this.sweepCompletedBlocks();

            } while (this._actionQueue.length > 0 && iterations < MAX_ITERATIONS);

            if (iterations >= MAX_ITERATIONS) {
                console.error('[RT] Max action iterations exceeded - possible infinite loop');
            }
        } finally {
            this._isProcessingActions = false;
            this.log(`[RT] processActions: done`);
        }
    }

    /**
     * Performs a completion sweep on the stack, popping all completed blocks.
     * Called after processing actions to autonomously clean up blocks that
     * have marked themselves as complete.
     */
    public sweepCompletedBlocks(): void {
        while (this.stack.current?.isComplete) {
            const block = this.stack.current;
            this.log(`[RT] sweepCompletedBlocks: popping completed block ${block.label}`);

            // Pop the completed block (this handles lifecycle and calls parent.next())
            this.popBlock();

            // Note: popBlock() already calls parent.next() which may:
            // - Mark the parent as complete
            // - Queue more actions
            // The outer loop in processActions will handle any new actions
        }
    }

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty.
     */
    public isComplete(): boolean {
        return this.stack.count === 0;
    }

    // ========== Output Statement API ==========

    /**
     * Subscribe to output statements generated during execution.
     */
    public subscribeToOutput(listener: OutputListener): Unsubscribe {
        this._outputListeners.add(listener);
        return () => {
            this._outputListeners.delete(listener);
        };
    }

    /**
     * Get all output statements generated so far.
     */
    public getOutputStatements(): IOutputStatement[] {
        return [...this._outputStatements];
    }

    /**
     * Add an output statement to the collection and notify subscribers.
     * Used by BehaviorContext to emit outputs at any lifecycle point.
     */
    public addOutput(output: IOutputStatement): void {
        this._outputStatements.push(output);

        for (const listener of this._outputListeners) {
            try {
                listener(output);
            } catch (err) {
                console.error('[RT] Output listener error:', err);
            }
        }
    }

    /**
     * Creates an output statement from a popped block and notifies subscribers.
     * Called during popBlock() to emit a 'completion' output.
     */
    private emitOutputStatement(block: IRuntimeBlock, stackLevel: number): void {
        // Build TimeSpan from execution timing
        const startTime = block.executionTiming?.startTime?.getTime() ?? Date.now();
        const endTime = block.executionTiming?.completedAt?.getTime() ?? Date.now();
        const timeSpan = new TimeSpan(startTime, endTime);

        // Get collected fragments from the block (if any)
        // For now, we use the block's static fragments - behaviors will add runtime fragments later
        const fragments = block.fragments?.flat() ?? [];

        // Create the output statement
        const output = new OutputStatement({
            outputType: 'completion',
            timeSpan,
            sourceBlockKey: block.key.toString(),
            sourceStatementId: block.sourceIds?.[0],
            stackLevel,
            fragments,
            parent: undefined,
            children: [],
        });

        // Store and notify via addOutput
        this.addOutput(output);
        this.log(`[RT] emitOutputStatement: ${block.label} -> ${output.outputType} (level=${stackLevel}, ${fragments.length} fragments)`);
    }

    // ========== Stack Lifecycle Operations ==========

    public pushBlock(block: IRuntimeBlock, options: BlockLifecycleOptions = {}): IRuntimeBlock {
        this.log(`[RT] pushBlock: ${block.label} (${block.key})`);
        this.validateBlock(block);

        const parentBlock = this.stack.current;
        this._hooks.onBeforePush?.(block, parentBlock);

        const parentSpanId = parentBlock
            ? this._tracker.getActiveSpanId?.(parentBlock.key.toString()) ?? null
            : null;
        this._tracker.startSpan?.(block, parentSpanId);

        const wrappedBlock = this._wrapper.wrap?.(block, parentBlock) ?? block;

        // Use frozen clock from options if provided (e.g., SnapshotClock for timing consistency)
        const clock = options.clock ?? this.clock;
        const startTime = options.startTime ?? clock.now;
        this.setStartTime(wrappedBlock, startTime);

        // Check if wrapped block has optional setRuntime method
        const blockWithRuntime = wrappedBlock as IRuntimeBlock & { setRuntime?: (runtime: IScriptRuntime) => void };
        if (typeof blockWithRuntime.setRuntime === 'function') {
            blockWithRuntime.setRuntime(this);
        }

        this.stack.push(wrappedBlock);
        this.log(`[RT] pushBlock: stack now [${this.stack.blocks.map(b => b.label).join(', ')}]`);
        this.eventBus.dispatch(new StackPushEvent(this.stack.blocks), this);

        const actions = wrappedBlock.mount(this, options);
        this.log(`[RT] pushBlock: mount returned ${actions.length} actions`);
        this.queueActions(actions);

        this._logger.debug?.('runtime.pushBlock', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
            stackDepth: this.stack.count,
        });

        this._hooks.onAfterPush?.(wrappedBlock, parentBlock);

        return wrappedBlock;
    }

    public popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
        const currentBlock = this.stack.current;
        this.log(`[RT] popBlock: current=${currentBlock?.label}`);
        if (!currentBlock) {
            return undefined;
        }

        // Capture stack level before pop (0-indexed: root = 0)
        const stackLevelBeforePop = this.stack.count - 1;

        // Create frozen clock at completion time - this ensures timing consistency
        // through the entire lifecycle chain: unmount → parent.next → child.mount
        const completedAt = options.completedAt ?? this.clock.now;
        const snapshotClock = options.clock ?? SnapshotClock.at(this.clock, completedAt);
        const lifecycleOptions: BlockLifecycleOptions = { ...options, completedAt, clock: snapshotClock };
        this.setCompletedTime(currentBlock, completedAt);

        this._hooks.onBeforePop?.(currentBlock);

        // 1. Get unmount actions before popping
        const unmountActions = currentBlock.unmount(this, lifecycleOptions) ?? [];
        this.log(`[RT] popBlock: unmount returned ${unmountActions.length} actions`);

        // 2. Pop from stack
        const popped = this.stack.pop();
        if (!popped) {
            return undefined;
        }
        this.log(`[RT] popBlock: popped ${popped.label}, stack now [${this.stack.blocks.map(b => b.label).join(', ')}]`);

        // 3. Dispatch pop event
        this.eventBus.dispatch(new StackPopEvent(this.stack.blocks), this);

        const ownerKey = this.resolveOwnerKey(popped);

        // 4. End tracking span
        this._tracker.endSpan?.(ownerKey);

        // 5. Execute unmount actions IMMEDIATELY (before dispose)
        // This ensures all cleanup actions complete before parent.next() is called
        this.log(`[RT] popBlock: executing ${unmountActions.length} unmount actions immediately`);
        this.executeActionsImmediately(unmountActions);

        // 6. Dispose and cleanup - child is now fully unmounted
        popped.dispose(this);
        popped.context?.release?.();
        this._hooks.unregisterByOwner?.(ownerKey);
        this._wrapper.cleanup?.(popped);

        this._logger.debug?.('runtime.popBlock', {
            blockKey: ownerKey,
            stackDepth: this.stack.count,
        });

        // 7. NOW call parent.next() - child is completely gone
        // Parent can make decisions knowing the child is fully cleaned up
        const parent = this.stack.current;
        this.log(`[RT] popBlock: calling parent.next() on ${parent?.label}`);
        if (parent) {
            const nextActions = parent.next(this, lifecycleOptions) ?? [];
            this.log(`[RT] popBlock: parent.next() returned ${nextActions.length} actions: ${nextActions.map(a => a.type).join(', ')}`);
            this.queueActions(nextActions);
        }

        // 8. Emit output statement for the popped block with its stack level
        this.emitOutputStatement(popped, stackLevelBeforePop);

        this._hooks.onAfterPop?.(popped);

        return popped;
    }

    /**
     * Execute actions immediately without queuing.
     * Used during popBlock to ensure unmount completes before parent.next().
     */
    private executeActionsImmediately(actions: IRuntimeAction[]): void {
        for (const action of actions) {
            action.do(this);
        }
    }

    /**
     * Helper method to safely pop and dispose a block following the new lifecycle pattern.
     */
    public popAndDispose(): void {
        this.popBlock();
    }

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     */
    public dispose(): void {
        // Stop the clock
        this.clock.stop();

        while (this.stack.count > 0) {
            this.popBlock();
        }
    }

    // ========== Private Helpers ==========

    private createStackLogger(): RuntimeStackLogger {
        return {
            debug: (message: string, details?: Record<string, unknown>) => {
                if (this.options.enableLogging || this.options.debugMode) {
                    console.debug(message, details);
                }
            },
            error: (message: string, error: unknown, details?: Record<string, unknown>) => {
                console.error(message, error, details);
            },
        };
    }

    private validateBlock(block: IRuntimeBlock): void {
        if (block === null || block === undefined) {
            throw new TypeError('Block cannot be null or undefined');
        }
        if (!block.key) {
            throw new TypeError('Block must have a valid key');
        }
        if (!block.sourceIds || !Array.isArray(block.sourceIds)) {
            throw new TypeError(`Block must have a valid sourceIds array (block key: ${block.key})`);
        }
        if (this.stack.count >= MAX_STACK_DEPTH) {
            throw new TypeError(
                `Stack overflow: maximum depth (${MAX_STACK_DEPTH}) exceeded (current depth: ${this.stack.count}, block: ${block.key})`
            );
        }
    }

    private setStartTime(block: IRuntimeBlock, startTime: Date): void {
        const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
        target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
    }

    private setCompletedTime(block: IRuntimeBlock, completedAt: Date): void {
        const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
        target.executionTiming = { ...(target.executionTiming ?? {}), completedAt };
    }

    private resolveOwnerKey(block: IRuntimeBlock): string {
        if (block instanceof TestableBlock) {
            return block.wrapped.key.toString();
        }
        return block.key.toString();
    }

    // ========== Private Logging Helper ==========

    /**
     * Log a debug message if logging is enabled.
     * Uses the configured logger or console.log as fallback.
     */
    private log(message: string, details?: Record<string, unknown>): void {
        if (!this.options.enableLogging) return;

        if (this._logger?.debug) {
            this._logger.debug(message, details);
        } else {
            console.log(message, details ?? '');
        }
    }
}
