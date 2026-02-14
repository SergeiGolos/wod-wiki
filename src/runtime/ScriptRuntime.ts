import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { JitCompiler } from './compiler/JitCompiler';
import { IRuntimeStack, Unsubscribe, StackObserver, StackSnapshot } from './contracts/IRuntimeStack';
import { WodScript } from '../parser/WodScript';
import type { RuntimeError } from './actions/ErrorAction';
import { IEventBus } from './contracts/events/IEventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions
} from './contracts/IRuntimeOptions';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { NextEventHandler } from './events/NextEventHandler';
import { IOutputStatement, OutputStatement } from '../core/models/OutputStatement';
import { IRuntimeAction } from './contracts';
import { IEvent } from './contracts/events/IEvent';
import { ExecutionContext } from './ExecutionContext';
import { PushBlockAction } from './actions/stack/PushBlockAction';
import { PopBlockAction } from './actions/stack/PopBlockAction';
import { ICodeFragment, FragmentType } from '../core/models/CodeFragment';
import { TimeSpan } from './models/TimeSpan';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export interface ScriptRuntimeDependencies {
    stack: IRuntimeStack;
    clock: IRuntimeClock;
    eventBus: IEventBus;
}

export class ScriptRuntime implements IScriptRuntime {

    public readonly eventBus: IEventBus;
    public readonly clock: IRuntimeClock;
    public readonly stack: IRuntimeStack;
    public readonly jit: JitCompiler;

    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;

    // Output statement tracking
    private _outputStatements: IOutputStatement[] = [];
    private _outputListeners: Set<OutputListener> = new Set();

    // Stack observer tracking
    private _stackObservers: Set<StackObserver> = new Set();
    private _stackSubscriptionUnsub: (() => void) | null = null;

    // The current execution context for the "turn"
    private _activeContext: ExecutionContext | null = null;

    public get tracker(): any {
        return this.options.tracker;
    }

    // Unsubscribe function for the global NextEventHandler
    private _nextHandlerUnsub: (() => void) | null = null;

    constructor(
        public readonly script: WodScript,
        compiler: JitCompiler,
        dependencies: ScriptRuntimeDependencies,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };

        this.stack = dependencies.stack;
        this.clock = dependencies.clock;
        this.eventBus = dependencies.eventBus;

        // Handle explicit next events to advance the current block once per request
        this._nextHandlerUnsub = this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime', { scope: 'global' });

        this.jit = compiler;

        // Bridge stack events to StackSnapshot observers and emit system outputs
        this._stackSubscriptionUnsub = this.stack.subscribe((event) => {
            // Emit system output for push/pop events
            if (event.type === 'push' || event.type === 'pop') {
                this.emitSystemOutput(event);
            }

            // Notify stack observers
            if (this._stackObservers.size === 0) return;

            const snapshot: StackSnapshot = {
                type: event.type === 'initial' ? 'initial' : event.type,
                blocks: event.type === 'initial' ? event.blocks : event.blocks,
                affectedBlock: event.type !== 'initial' ? event.block : undefined,
                depth: event.type === 'initial' ? event.blocks.length : event.depth,
                clockTime: this.clock.now,
            };

            for (const observer of this._stackObservers) {
                try {
                    observer(snapshot);
                } catch (err) {
                    console.error('[RT] Stack observer error:', err);
                }
            }
        });

        // Start the clock
        this.clock.start();
    }

    /**
     * Executes an action within a managed execution context (a "turn").
     * Actions can queue further actions which will be processed in the same turn.
     * Time is frozen during the turn.
     */
    public do(action: IRuntimeAction): void {
        if (this._activeContext) {
            this._activeContext.do(action);
            return;
        }

        this._activeContext = new ExecutionContext(this, this.options.maxActionDepth ?? 20);
        try {
            this._activeContext.execute(action);
        } finally {
            this._activeContext = null;
        }
    }

    /**
     * Pushes multiple actions onto the execution stack in the correct order
     * for LIFO processing. The first action in the array will execute first.
     * 
     * If called within an active execution context, delegates to it.
     * Otherwise, wraps in a new context as a composite action.
     */
    public doAll(actions: IRuntimeAction[]): void {
        if (actions.length === 0) return;
        if (this._activeContext) {
            this._activeContext.doAll(actions);
            return;
        }

        // No active context — create one with a composite wrapper that returns actions
        this.do({
            type: 'composite-doAll',
            do: () => actions
        });
    }

    /**
     * Dispatches an event to the event bus and executes any resulting actions
     * within a single execution turn.
     */
    public handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        if (actions.length === 0) return;

        this.doAll(actions);
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

    // ========== Stack Observer API ==========

    /**
     * Subscribe to stack snapshots. The observer receives a StackSnapshot
     * on every push/pop/clear event. New subscribers immediately receive
     * an 'initial' snapshot with the current stack state.
     */
    public subscribeToStack(observer: StackObserver): Unsubscribe {
        this._stackObservers.add(observer);

        // Immediate notification of current state
        observer({
            type: 'initial',
            blocks: this.stack.blocks,
            depth: this.stack.count,
            clockTime: this.clock.now,
        });

        return () => {
            this._stackObservers.delete(observer);
        };
    }

    /**
     * Cleanup method that properly unmounts and disposes all blocks in the stack.
     */
    public dispose(): void {
        // Stop the clock
        this.clock.stop();

        // Properly unmount and dispose each block (top-down)
        while (this.stack.count > 0) {
            const block = this.stack.current;
            if (block) {
                try {
                    block.unmount(this);
                } catch (_e) {
                    // Swallow errors during emergency cleanup
                }
                this.stack.pop();
                try {
                    block.dispose(this);
                } catch (_e) {
                    // Swallow errors during emergency cleanup
                }
            } else {
                this.stack.pop();
            }
        }

        // Unregister the global NextEventHandler
        if (this._nextHandlerUnsub) {
            this._nextHandlerUnsub();
            this._nextHandlerUnsub = null;
        }

        // Clear output state to release references
        this._outputStatements = [];
        this._outputListeners.clear();

        // Clear stack observers
        this._stackObservers.clear();
        if (this._stackSubscriptionUnsub) {
            this._stackSubscriptionUnsub();
            this._stackSubscriptionUnsub = null;
        }

        // Clear the event bus
        this.eventBus.dispose();
    }

    /**
     * Pushes a block onto the runtime stack.
     * This is a convenience method that wraps PushBlockAction.
     * Also handles hooks, tracking, wrapping, and logging if configured.
     * 
     * @param block The block to push
     * @param lifecycle Optional lifecycle options (startTime, etc.)
     */
    public pushBlock(block: import('./contracts/IRuntimeBlock').IRuntimeBlock, lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        const parentBlock = this.stack.current;

        // Call before hooks
        this.options.hooks?.onBeforePush?.(block, parentBlock);

        // Start tracking span
        const parentSpanId = parentBlock
            ? this.options.tracker?.getActiveSpanId?.(parentBlock.key.toString()) ?? null
            : null;
        this.options.tracker?.startSpan?.(block, parentSpanId);

        // Wrap block if wrapper is configured
        const wrappedBlock = this.options.wrapper?.wrap?.(block, parentBlock) ?? block;

        // Execute the push action
        this.do(new PushBlockAction(wrappedBlock, lifecycle));

        // Log the push
        this.options.logger?.debug?.('runtime.pushBlock', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
        });

        // Call after hooks
        this.options.hooks?.onAfterPush?.(wrappedBlock, parentBlock);
    }

    /**
     * Pops the current block from the runtime stack.
     * This is a convenience method that wraps PopBlockAction.
     * Handles the full lifecycle: unmount, pop, dispose, and parent notification.
     * Also handles hooks, tracking, wrapping cleanup, and logging if configured.
     * 
     * @param lifecycle Optional lifecycle options (completedAt, etc.)
     */
    public popBlock(lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        const currentBlock = this.stack.current;
        if (!currentBlock) {
            return;
        }

        // Call before hooks
        this.options.hooks?.onBeforePop?.(currentBlock);

        // Execute the pop action (which handles unmount, dispose, output statement, parent.next)
        this.do(new PopBlockAction(lifecycle));

        // End tracking span
        const ownerKey = currentBlock.key.toString();
        this.options.tracker?.endSpan?.(ownerKey);

        // Cleanup wrapper
        this.options.wrapper?.cleanup?.(currentBlock);

        // Unregister hooks by owner
        this.options.hooks?.unregisterByOwner?.(ownerKey);

        // Log the pop
        this.options.logger?.debug?.('runtime.popBlock', {
            blockKey: ownerKey,
            stackDepth: this.stack.count,
        });

        // Call after hooks
        this.options.hooks?.onAfterPop?.(currentBlock);
    }

    /**
     * Emit a system output for stack lifecycle events (push/pop).
     * Called directly from the stack subscription handler to ensure accurate timing.
     */
    private emitSystemOutput(event: { type: 'push' | 'pop'; block: IRuntimeBlock; depth: number }): void {
        const now = this.clock.now;
        const block = event.block;

        // Build structured data for the fragment value
        interface SystemOutputValue {
            event: 'push' | 'pop';
            blockKey: string;
            blockLabel?: string;
            [key: string]: unknown;
        }

        const value: SystemOutputValue = {
            event: event.type,
            blockKey: block.key.toString(),
            blockLabel: block.label,
        };

        // Add extra data based on event type
        if (event.type === 'push') {
            // For push, include parent key if available
            const parentBlock = this.stack.blocks.length > 1 ? this.stack.blocks[1] : undefined;
            if (parentBlock) {
                value.parentKey = parentBlock.key.toString();
            }
        } else if (event.type === 'pop') {
            // For pop, include completion reason
            const completionReason = (block as any).completionReason ?? 'normal';
            value.completionReason = completionReason;
        }

        // Create the fragment
        const fragment: ICodeFragment = {
            fragmentType: FragmentType.System,
            type: 'lifecycle',
            image: event.type === 'push'
                ? `push: ${block.label ?? block.blockType ?? 'Block'} [${block.key.toString().slice(0, 8)}]`
                : `pop: ${block.label ?? block.blockType ?? 'Block'} [${block.key.toString().slice(0, 8)}] reason=${(block as any).completionReason ?? 'normal'}`,
            value,
            origin: 'runtime',
            timestamp: now,
        };

        // Create and emit the output statement
        const output = new OutputStatement({
            outputType: 'system',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: block.key.toString(),
            stackLevel: event.depth,
            fragments: [fragment],
        });

        this.addOutput(output);
    }
}

