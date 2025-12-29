import { IScriptRuntime } from './contracts/IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { IRuntimeStack } from './contracts/IRuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
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
import { NextEventHandler } from './events/NextEventHandler';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { StackPushEvent, StackPopEvent } from './events/StackEvents';

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
        this.eventBus.register('stack:push', this._spanTracker, 'runtime');
        this.eventBus.register('stack:pop', this._spanTracker, 'runtime');

        // Handle explicit next events to advance the current block once per request
        this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime');

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

        // Start the clock
        this.clock.start();
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
        this._hooks.onBeforePush?.(block, parentBlock);

        const parentSpanId = parentBlock
            ? this._tracker.getActiveSpanId?.(parentBlock.key.toString()) ?? null
            : null;
        this._tracker.startSpan?.(block, parentSpanId);

        const wrappedBlock = this._wrapper.wrap?.(block, parentBlock) ?? block;

        const startTime = options.startTime ?? this.clock.now;
        this.setStartTime(wrappedBlock, startTime);

        // Check if wrapped block has optional setRuntime method
        const blockWithRuntime = wrappedBlock as IRuntimeBlock & { setRuntime?: (runtime: IScriptRuntime) => void };
        if (typeof blockWithRuntime.setRuntime === 'function') {
            blockWithRuntime.setRuntime(this);
        }

        this.stack.push(wrappedBlock);
        this.eventBus.dispatch(new StackPushEvent(this.stack.blocks), this);

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
        if (!currentBlock) {
            return undefined;
        }

        const completedAt = options.completedAt ?? this.clock.now;
        const lifecycleOptions: BlockLifecycleOptions = { ...options, completedAt };
        this.setCompletedTime(currentBlock, completedAt);

        this._hooks.onBeforePop?.(currentBlock);

        const unmountActions = currentBlock.unmount(this, lifecycleOptions) ?? [];

        const popped = this.stack.pop();
        if (!popped) {
            return undefined;
        }

        this.eventBus.dispatch(new StackPopEvent(this.stack.blocks), this);

        const ownerKey = this.resolveOwnerKey(popped);

        this._tracker.endSpan?.(ownerKey);
        popped.dispose(this);
        popped.context?.release?.();
        this._hooks.unregisterByOwner?.(ownerKey);
        this._wrapper.cleanup?.(popped);

        this._logger.debug?.('runtime.popBlock', {
            blockKey: ownerKey,
            stackDepth: this.stack.count,
        });

        for (const action of unmountActions) {
            action.do(this);
        }

        const parent = this.stack.current;
        if (parent) {
            const nextActions = parent.next(this, lifecycleOptions) ?? [];
            for (const action of nextActions) {
                action.do(this);
            }
        }

        this._hooks.onAfterPop?.(popped);

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
}
