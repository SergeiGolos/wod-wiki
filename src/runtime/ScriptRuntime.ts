import type { IScriptRuntime, OutputListener, TrackerListener } from './contracts/IScriptRuntime';
import type { IJitCompiler } from './contracts/IJitCompiler';
import type { IRuntimeStack, Unsubscribe, StackObserver, StackSnapshot } from './contracts/IRuntimeStack';
import type { WhiteboardScript } from '../parser/WhiteboardScript';
import type { RuntimeError } from './actions/ErrorAction';
import type { IEventBus } from './contracts/events/IEventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions,
    RuntimeStackTracker
} from './contracts/IRuntimeOptions';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { NextEventHandler } from './events/NextEventHandler';
import { AbortEventHandler } from './events/AbortEventHandler';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IRuntimeAction } from './contracts';
import { IEvent } from './contracts/events/IEvent';
import { ExecutionContext } from './ExecutionContext';
import { PushBlockAction } from './actions/stack/PushBlockAction';
import { PopBlockAction } from './actions/stack/PopBlockAction';
import { IAnalyticsEngine } from '../core/contracts/IAnalyticsEngine';
import { OutputEmitter } from './OutputEmitter';

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
    public readonly jit: IJitCompiler;

    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;

    // Output pipeline — all emission logic lives here
    private readonly _emitter: OutputEmitter;

    // Tracker update tracking
    private _trackerListeners: Set<TrackerListener> = new Set();
    private _trackerSubscriptionUnsub: (() => void) | null = null;

    // Stack observer tracking
    private _stackObservers: Set<StackObserver> = new Set();
    private _stackSubscriptionUnsub: (() => void) | null = null;

    // The current execution context for the "turn"
    private _activeContext: ExecutionContext | null = null;

    public get tracker(): RuntimeStackTracker | undefined {
        return this.options.tracker;
    }

    // Unsubscribe function for the global NextEventHandler
    private _nextHandlerUnsub: (() => void) | null = null;

    // Unsubscribe function for the global AbortEventHandler
    private _abortHandlerUnsub: (() => void) | null = null;

    constructor(
        public readonly script: WhiteboardScript,
        compiler: IJitCompiler,
        dependencies: ScriptRuntimeDependencies,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };

        this.stack = dependencies.stack;
        this.clock = dependencies.clock;
        this.eventBus = dependencies.eventBus;

        // Output pipeline
        this._emitter = new OutputEmitter();

        // Handle explicit next events to advance the current block once per request
        this._nextHandlerUnsub = this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime', { scope: 'global' });

        // Handle abort events to force-terminate the session
        this._abortHandlerUnsub = this.eventBus.register('abort', new AbortEventHandler('runtime-abort-handler'), 'runtime', { scope: 'global' });

        this.jit = compiler;

        // Bridge stack events to StackSnapshot observers and emit system outputs
        this._stackSubscriptionUnsub = this.stack.subscribe((event) => {
            if (event.type === 'pop') {
                this._emitter.emitSegmentFromResultMemory(event.block, event.depth, this.clock);
            }

            // Emit system output for push/pop events
            if (event.type === 'push' || event.type === 'pop') {
                this._emitter.emitStackEvent(event, this.stack.blocks, this.clock);
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

        // Emit 'load' output with initial state
        this._emitter.emitLoad(this.script, this.clock);
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
            // After the full execution turn settles (push + mount + child pushes all done),
            // re-notify stack observers with the current state. This ensures blocks that
            // set up timer memory during mount() are serialized with correct timer data.
            // Without this, leaf blocks (no children pushed on mount) would have timer:null
            // in the Chromecast snapshot because push fires before mount initializes memory.
            this._notifyStackSettled();
        }
    }

    private _notifyStackSettled(): void {
        if (this._stackObservers.size === 0) return;
        const blocks = this.stack.blocks;
        if (blocks.length === 0) return;
        const snapshot: StackSnapshot = {
            type: 'initial',
            blocks,
            depth: blocks.length,
            clockTime: this.clock.now,
        };
        for (const observer of this._stackObservers) {
            try {
                observer(snapshot);
            } catch (err) {
                console.error('[RT] Stack observer error (settled):', err);
            }
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

        // Only emit 'event' output if it's NOT a tick event OR if it produced actions
        // This prevents flooding the log with empty tick cycles
        if (event.name !== 'tick' || actions.length > 0) {
            this._emitter.emitRuntimeEvent(event, this.stack, this.clock);
        }

        if (actions.length === 0) return;

        this.doAll(actions);
    }

    // ========== Output Statement API (delegates to OutputEmitter) ==========

    public subscribeToOutput(listener: OutputListener): Unsubscribe {
        return this._emitter.subscribe(listener);
    }

    public getOutputStatements(): IOutputStatement[] {
        return this._emitter.getAll();
    }

    public addOutput(output: IOutputStatement): void {
        this._emitter.add(output);
    }

    public setAnalyticsEngine(engine: IAnalyticsEngine): void {
        this._emitter.setAnalyticsEngine(engine);
    }

    public finalizeAnalytics(): IOutputStatement[] {
        return this._emitter.finalizeAnalytics();
    }

    // ========== Tracker Update API ==========

    public subscribeToTracker(listener: TrackerListener): Unsubscribe {
        this._trackerListeners.add(listener);

        // If this is the first listener and we have a tracker, subscribe to it
        if (this._trackerListeners.size === 1 && this.tracker?.onUpdate) {
            this._trackerSubscriptionUnsub = this.tracker.onUpdate((update) => {
                for (const l of this._trackerListeners) {
                    try {
                        l(update);
                    } catch (err) {
                        console.error('[RT] Tracker listener error:', err);
                    }
                }
            });
        }

        return () => {
            this._trackerListeners.delete(listener);
            if (this._trackerListeners.size === 0 && this._trackerSubscriptionUnsub) {
                this._trackerSubscriptionUnsub();
                this._trackerSubscriptionUnsub = null;
            }
        };
    }

    // ========== Stack Observer API ==========

    /**
     * Subscribe to stack snapshots. The observer receives a StackSnapshot
     * on every push/pop/clear event. New subscribers immediately receive
     * an 'initial' snapshot with the current stack state.
     */
    public subscribeToStack(observer: StackObserver): Unsubscribe {
        this._stackObservers.add(observer);

        // Immediate notification of current state, deferred to next tick to avoid React render warnings
        const initialSnapshot: StackSnapshot = {
            type: 'initial',
            blocks: this.stack.blocks,
            depth: this.stack.count,
            clockTime: this.clock.now,
        };

        setTimeout(() => {
            if (this._stackObservers.has(observer)) {
                observer(initialSnapshot);
            }
        }, 0);

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

        // Unregister the global AbortEventHandler
        if (this._abortHandlerUnsub) {
            this._abortHandlerUnsub();
            this._abortHandlerUnsub = null;
        }

        // Clear output state
        this._emitter.dispose();

        // Clear stack observers
        this._stackObservers.clear();
        if (this._stackSubscriptionUnsub) {
            this._stackSubscriptionUnsub();
            this._stackSubscriptionUnsub = null;
        }

        // Clear tracker listeners
        this._trackerListeners.clear();
        if (this._trackerSubscriptionUnsub) {
            this._trackerSubscriptionUnsub();
            this._trackerSubscriptionUnsub = null;
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

        // Emit 'compiler' output for the new block
        this._emitter.emitCompilerBlock(block, this.stack.count, this.clock);

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

}
