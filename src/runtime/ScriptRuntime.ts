import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { ExecutionSpan } from './models/ExecutionSpan';
import { ExecutionTracker } from '../tracker/ExecutionTracker';
import { EventBus } from './EventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions,
    RuntimeStackLogger,
    RuntimeStackTracker,
    RuntimeStackWrapper,
    RuntimeStackHooks,
    BlockWrapperFactory,
    DebugLogEvent
} from './IRuntimeOptions';
import { TestableBlock, TestableBlockConfig } from './testing/TestableBlock';
import { RuntimeClock, RuntimeTimestamp } from './RuntimeClock';
import { NextEventHandler } from './NextEventHandler';
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';

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

const noopLogger: RuntimeStackLogger = {
    debug: () => { },
    error: () => { },
};

const noopHooks: RuntimeStackHooks = {
    onBeforePush: () => { },
    onAfterPush: () => { },
    onBeforePop: () => { },
    onAfterPop: () => { },
    unregisterByOwner: () => { },
};

/**
 * Default block wrapper factory that uses TestableBlock in spy mode.
 */
const defaultBlockWrapperFactory: BlockWrapperFactory = (
    block: IRuntimeBlock,
    config?: TestableBlockConfig
): IRuntimeBlock => {
    return new TestableBlock(block, {
        testId: config?.testId ?? `debug-${block.key.toString()}`,
        labelOverride: config?.labelOverride,
        mountMode: config?.mountMode ?? 'spy',
        nextMode: config?.nextMode ?? 'spy',
        unmountMode: config?.unmountMode ?? 'spy',
        disposeMode: config?.disposeMode ?? 'spy',
        mountOverride: config?.mountOverride,
        nextOverride: config?.nextOverride,
        unmountOverride: config?.unmountOverride,
        disposeOverride: config?.disposeOverride,
    });
};

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {

    public readonly eventBus: EventBus;
    public readonly stack: RuntimeStack;
    public readonly memory: IRuntimeMemory;

    public readonly clock: RuntimeClock;
    public readonly jit: JitCompiler;

    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;

    private readonly executionTracker: ExecutionTracker;

    private _lastUpdatedBlocks: Set<string> = new Set();

    // Internal state for stack orchestration not exposed on IScriptRuntime
    private readonly _wrappedBlocks: Map<string, TestableBlock> = new Map();
    private readonly _wrapperFactory: BlockWrapperFactory;
    private readonly _defaultConfig: Partial<TestableBlockConfig>;
    private readonly _onDebugLog?: (event: DebugLogEvent) => void;
    private readonly _tracker: RuntimeStackTracker;
    private readonly _wrapper: RuntimeStackWrapper;
    private readonly _logger: RuntimeStackLogger;
    private readonly _hooks: RuntimeStackHooks;

    constructor(
        public readonly script: WodScript,
        compiler: JitCompiler,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };

        this.memory = new RuntimeMemory();
        this.executionTracker = new ExecutionTracker(this.memory);
        this.eventBus = new EventBus();
        // Handle explicit next events to advance the current block once per request
        this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime');

        // Setup stack helpers
        this._wrapperFactory = this.options.blockWrapperFactory ?? defaultBlockWrapperFactory;
        this._defaultConfig = this.options.defaultTestableConfig ?? {};
        this._onDebugLog = this.options.onDebugLog;

        this._tracker = this.options.tracker ?? this.executionTracker ?? noopTracker;

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

        // Setup wrapper based on debug mode
        this._wrapper = this.options.wrapper ?? this.createDefaultWrapper();

        // Initialize empty lightweight stack
        this.stack = new RuntimeStack();

        if (this.options.debugMode) {
            console.log('🔍 ScriptRuntime: Debug mode enabled - blocks will be wrapped with TestableBlock');
        }

        this.clock = new RuntimeClock();
        this.jit = compiler;

        // Start the clock
        this.clock.start();
    }

    /**
     * Gets the currently active execution spans from memory.
     * Used by UI to display ongoing execution state.     
     */
    public get activeSpans(): ReadonlyMap<string, ExecutionSpan> {
        return this.executionTracker.getActiveSpansMap();
    }

    /**
     * Gets the ExecutionTracker for direct metric recording.
     * Used by actions and behaviors to record metrics to active spans.
     */
    public get tracker(): ExecutionTracker {
        return this.executionTracker;
    }

    handle(event: IEvent): void {
        this.eventBus.dispatch(event, this);
    }

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty.
     */
    public isComplete(): boolean {
        return this.stack.count === 0;
    }

    // ========== Stack Lifecycle Operations ==========

    public pushBlock(block: IRuntimeBlock, options: BlockLifecycleOptions = {}): IRuntimeBlock {
        this.validateBlock(block);

        const parentBlock = this.stack.current;
        this.safeCall(() => this._hooks.onBeforePush?.(block, parentBlock), 'hooks.onBeforePush', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
        });

        const parentSpanId = parentBlock
            ? this._tracker.getActiveSpanId?.(parentBlock.key.toString()) ?? null
            : null;

        this.safeCall(() => this._tracker.startSpan?.(block, parentSpanId), 'tracker.startSpan', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
            parentSpanId,
        });

        const wrappedBlock = this.wrapBlock(block, parentBlock);

        const startTime = this.getTimestamp(options.startTime);
        this.setStartTime(wrappedBlock, startTime);

        if (typeof (wrappedBlock as any).setRuntime === 'function') {
            (wrappedBlock as any).setRuntime(this);
        }

        // Push to lightweight stack
        this.stack.push(wrappedBlock);
        const stackDepth = this.stack.count;

        this._logDebugEvent({
            type: 'stack-push',
            timestamp: Date.now(),
            blockKey: block.key.toString(),
            blockType: block.blockType,
            details: {
                stackDepth,
                isWrapped: this.isDebugMode && !(block instanceof TestableBlock),
            },
        });

        this.safeCall(() => this._logger.debug?.('runtime.pushBlock', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
            stackDepth,
        }), 'logger.debug', {
            blockKey: block.key.toString(),
        });

        this.safeCall(() => this._hooks.onAfterPush?.(wrappedBlock, parentBlock), 'hooks.onAfterPush', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
        });

        // Note: Mount Logic is usually called by the caller of pushBlock (like PushBlockAction), 
        // to check actions. RuntimeStack.push didn't call mount. PushBlockAction did.
        // We stick to the pattern where this method only handles stack mechanism and lifecycle hooks.
        // The action executing/mounting is separate. 
        // Wait, user said "operations on the nodes... should be done in the runtime".
        // But mount returns actions. A return void method can't return them.
        // If we want mount here, we might need to queue them or execute them.
        // PushBlockAction executes them.

        // For now, I assume PushBlockAction continues to call mount() after pushing, 
        // or uses the returned block (which might be wrapped!)
        // Wait, PushBlockAction holds `this.block`. If I wrapped it, `this.block` is stale?
        // Ah. `RuntimeStack.push` used to wrap it and put it on stack.
        // `PushBlockAction` then called `this.block.mount()`. Uses the ORIGINAL block.
        // This works if wrapper delegates or if mount is on original. TestableBlock calls inner.
        // However, if we want to spy on mount, we should call it on the wrapped block on the stack.

        // This complexity suggests PushBlockAction should delegate more to runtime,
        // OR PushBlockAction should get the current block from stack after push.

        return wrappedBlock;
    }

    public popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
        const currentBlock = this.stack.current;
        if (!currentBlock) {
            return undefined;
        }

        const completedAt = this.getTimestamp(options.completedAt);
        const lifecycleOptions: BlockLifecycleOptions = { ...options, completedAt };
        this.setCompletedTime(currentBlock, completedAt);

        this.safeCall(() => this._hooks.onBeforePop?.(currentBlock), 'hooks.onBeforePop', {
            blockKey: currentBlock.key.toString(),
        });

        const unmountActions =
            this.safeCall(() => currentBlock.unmount(this, lifecycleOptions) ?? [], 'block.unmount', {
                blockKey: currentBlock.key.toString(),
            }) ?? [];

        // Pop from lightweight stack
        const popped = this.stack.pop();
        if (!popped) {
            return undefined;
        }

        const ownerKey = this.resolveOwnerKey(popped);
        const wasWrapped = this._wrappedBlocks.has(ownerKey) || this._wrappedBlocks.has(popped.key.toString());

        this.safeCall(() => this._tracker.endSpan?.(ownerKey), 'tracker.endSpan', {
            blockKey: ownerKey,
        });

        this.safeCall(() => popped.dispose(this), 'block.dispose', {
            blockKey: ownerKey,
        });

        this.safeCall(() => popped.context?.release?.(), 'context.release', {
            blockKey: ownerKey,
        });

        this.safeCall(() => this._hooks.unregisterByOwner?.(ownerKey), 'hooks.unregisterByOwner', {
            blockKey: ownerKey,
        });

        this.safeCall(() => this._wrapper.cleanup?.(popped), 'wrapper.cleanup', {
            blockKey: ownerKey,
        });

        this._logDebugEvent({
            type: 'stack-pop',
            timestamp: Date.now(),
            blockKey: popped.key.toString(),
            blockType: popped.blockType,
            details: {
                stackDepth: this.stack.count,
                wasWrapped,
            },
        });

        this.safeCall(() => this._logger.debug?.('runtime.popBlock', {
            blockKey: ownerKey,
            stackDepth: this.stack.count,
        }), 'logger.debug', {
            blockKey: ownerKey,
        });

        this.runActions(unmountActions, 'block.unmount.actions', {
            blockKey: ownerKey,
        });

        const parent = this.stack.current;
        if (parent) {
            const nextActions =
                this.safeCall(() => parent.next(this, lifecycleOptions) ?? [], 'parent.next', {
                    parentKey: parent.key.toString(),
                    childKey: ownerKey,
                }) ?? [];

            this.runActions(nextActions, 'parent.next.actions', {
                parentKey: parent.key.toString(),
                childKey: ownerKey,
            });
        }

        this.safeCall(() => this._hooks.onAfterPop?.(popped), 'hooks.onAfterPop', {
            blockKey: ownerKey,
        });

        return popped;
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
    public disposeAllBlocks(): void {
        // Stop the clock
        this.clock.stop();

        while (this.stack.count > 0) {
            this.popBlock();
        }
    }

    // ========== Debug API ==========

    public get isDebugMode(): boolean {
        return this.options.debugMode ?? false;
    }

    /**
     * Get all wrapped TestableBlock instances (debug mode only).
     */
    public getWrappedBlocks(): ReadonlyMap<string, TestableBlock> {
        return this._wrappedBlocks;
    }

    /**
     * Get a specific wrapped block by its key (debug mode only).
     */
    public getWrappedBlock(blockKey: string): TestableBlock | undefined {
        return this._wrappedBlocks.get(blockKey);
    }

    /**
     * Get all method calls from all wrapped blocks (debug mode only).
     */
    public getAllBlockCalls(): Array<{ blockKey: string; calls: ReadonlyArray<any> }> {
        const result: Array<{ blockKey: string; calls: ReadonlyArray<any> }> = [];
        for (const [key, block] of this._wrappedBlocks) {
            result.push({ blockKey: key, calls: block.calls });
        }
        return result;
    }

    /**
     * Clear all recorded calls from wrapped blocks (debug mode only).
     */
    public clearAllBlockCalls(): void {
        for (const block of this._wrappedBlocks.values()) {
            block.clearCalls();
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

    private wrapBlock(block: IRuntimeBlock, parentBlock: IRuntimeBlock | undefined): IRuntimeBlock {
        const wrapped = this.safeCall(() => this._wrapper.wrap?.(block, parentBlock), 'wrapper.wrap', {
            blockKey: block.key.toString(),
            parentKey: parentBlock?.key.toString(),
        });
        return wrapped ?? block;
    }

    private setStartTime(block: IRuntimeBlock, startTime: RuntimeTimestamp): void {
        const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
        target.executionTiming = { ...(target.executionTiming ?? {}), startTime };
    }

    private setCompletedTime(block: IRuntimeBlock, completedAt: RuntimeTimestamp): void {
        const target = block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
        target.executionTiming = { ...(target.executionTiming ?? {}), completedAt };
    }

    private getTimestamp(seed?: RuntimeTimestamp): RuntimeTimestamp {
        const fallback = (): RuntimeTimestamp => ({
            wallTimeMs: seed?.wallTimeMs ?? Date.now(),
            monotonicTimeMs: seed?.monotonicTimeMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
        });

        const capture = this.clock?.captureTimestamp;
        if (typeof capture === 'function') {
            try {
                // bind clock context
                return capture.call(this.clock, seed) ?? fallback();
            } catch {
                return fallback();
            }
        }

        return fallback();
    }

    private resolveOwnerKey(block: IRuntimeBlock): string {
        if (block instanceof TestableBlock) {
            return block.wrapped.key.toString();
        }
        return block.key.toString();
    }

    private cleanupWrappedBlock(blockKey: string): void {
        this._wrappedBlocks.delete(blockKey);
        this._wrappedBlocks.delete(blockKey.replace('debug-', ''));
    }

    private createDefaultWrapper(): RuntimeStackWrapper {
        if (!this.options.debugMode) {
            return noopWrapper;
        }

        return {
            wrap: (block: IRuntimeBlock) => {
                if (block instanceof TestableBlock) {
                    this._wrappedBlocks.set(block.key.toString(), block);
                    return block;
                }

                const config: TestableBlockConfig = {
                    ...this._defaultConfig,
                    testId: this._defaultConfig.testId ?? `debug-${block.key.toString()}`,
                };

                const wrapped = this._wrapperFactory(block, config);
                this._wrappedBlocks.set(block.key.toString(), wrapped as TestableBlock);

                this._logDebugEvent({
                    type: 'block-wrapped',
                    timestamp: Date.now(),
                    blockKey: block.key.toString(),
                    blockType: block.blockType,
                    details: {
                        wrapperTestId: (wrapped as TestableBlock).testId,
                        config,
                    },
                });

                return wrapped;
            },
            cleanup: (block: IRuntimeBlock) => {
                const ownerKey = this.resolveOwnerKey(block);
                this.cleanupWrappedBlock(ownerKey);
                this.cleanupWrappedBlock(block.key.toString());
            },
        };
    }

    private runActions(actions: IRuntimeAction[], stage: string, context: Record<string, unknown>): void {
        for (const action of actions) {
            this.safeCall(() => action.do(this), stage, context);
        }
    }

    private safeCall<T>(fn: () => T, stage: string, details?: Record<string, unknown>): T | undefined {
        try {
            return fn();
        } catch (error) {
            this._logger.error?.(stage, error, details);
            return undefined;
        }
    }

    private _logDebugEvent(event: DebugLogEvent): void {
        if (this._onDebugLog) {
            this._onDebugLog(event);
        }
    }
}
