import { IScriptRuntime, OutputListener, TrackerListener } from './contracts/IScriptRuntime';
import { JitCompiler } from './compiler/JitCompiler';
import { IRuntimeStack, Unsubscribe, StackObserver, StackSnapshot } from './contracts/IRuntimeStack';
import { WodScript } from '../parser/WodScript';
import type { RuntimeError } from './actions/ErrorAction';
import { IEventBus } from './contracts/events/IEventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions,
    RuntimeStackTracker
} from './contracts/IRuntimeOptions';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { NextEventHandler } from './events/NextEventHandler';
import { AbortEventHandler } from './events/AbortEventHandler';
import { IOutputStatement, OutputStatement } from '../core/models/OutputStatement';
import { IRuntimeAction } from './contracts';
import { IEvent } from './contracts/events/IEvent';
import { ExecutionContext } from './ExecutionContext';
import { PushBlockAction } from './actions/stack/PushBlockAction';
import { PopBlockAction } from './actions/stack/PopBlockAction';
import { IMetric, MetricType } from '../core/models/Metric';
import { TimeSpan } from './models/TimeSpan';
import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IAnalyticsEngine } from '../core/contracts/IAnalyticsEngine';

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

    // Tracker update tracking
    private _trackerListeners: Set<TrackerListener> = new Set();
    private _trackerSubscriptionUnsub: (() => void) | null = null;

    // Stack observer tracking
    private _stackObservers: Set<StackObserver> = new Set();
    private _stackSubscriptionUnsub: (() => void) | null = null;

    // The current execution context for the "turn"
    private _activeContext: ExecutionContext | null = null;

    private _analyticsEngine: IAnalyticsEngine | null = null;

    public get tracker(): RuntimeStackTracker | undefined {
        return this.options.tracker;
    }

    // Unsubscribe function for the global NextEventHandler
    private _nextHandlerUnsub: (() => void) | null = null;

    // Unsubscribe function for the global AbortEventHandler
    private _abortHandlerUnsub: (() => void) | null = null;

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

        // Handle abort events to force-terminate the session
        this._abortHandlerUnsub = this.eventBus.register('abort', new AbortEventHandler('runtime-abort-handler'), 'runtime', { scope: 'global' });

        this.jit = compiler;

        // Bridge stack events to StackSnapshot observers and emit system outputs
        this._stackSubscriptionUnsub = this.stack.subscribe((event) => {
            if (event.type === 'pop') {
                this.emitSegmentOutputFromResultMemory(event.block, event.depth);
            }

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

        // Emit 'load' output with initial state
        this.emitLoadOutput();
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
            this.emitEventOutput(event);
        }

        if (actions.length === 0) return;

        this.doAll(actions);
    }

    // ========== Output Statement API ==========

    /**
     * Subscribe to output statements generated during execution.
     */
    public subscribeToOutput(listener: OutputListener): Unsubscribe {
        this._outputListeners.add(listener);

        // Immediate notification of current state, deferred to next tick to avoid React render warnings
        const currentOutputs = [...this._outputStatements];
        if (currentOutputs.length > 0) {
            setTimeout(() => {
                if (this._outputListeners.has(listener)) {
                    for (const output of currentOutputs) {
                        listener(output);
                    }
                }
            }, 0);
        }

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
        const processedOutput = this._analyticsEngine ? this._analyticsEngine.run(output) : output;
        this._outputStatements.push(processedOutput);

        for (const listener of this._outputListeners) {
            try {
                listener(processedOutput);
            } catch (err) {
                console.error('[RT] Output listener error:', err);
            }
        }
    }

    /**
     * Subscribe to real-time tracker updates.
     */
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

    /**
     * Set the analytics engine for the runtime.
     */
    public setAnalyticsEngine(engine: IAnalyticsEngine): void {
        this._analyticsEngine = engine;
    }

    /**
     * Finalize the analytics engine and return any summary output statements.
     */
    public finalizeAnalytics(): IOutputStatement[] {
        if (!this._analyticsEngine) return [];

        const summaryOutputs = this._analyticsEngine.finalize();
        for (const output of summaryOutputs) {
            // We bypass addOutput here to avoid running the enrichment chain on 
            // summary statements that are already fully processed.
            this._outputStatements.push(output);

            for (const listener of this._outputListeners) {
                try {
                    listener(output);
                } catch (err) {
                    console.error('[RT] Finalize output listener error:', err);
                }
            }
        }
        return summaryOutputs;
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

        // Clear output state to release references
        this._outputStatements = [];
        this._outputListeners.clear();

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
        this.emitCompilerOutput(block);

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

        // Build structured data for the metrics value
        interface SystemOutputValue {
            event: 'push' | 'pop';
            blockKey: string;
            blockLabel?: string;
            actionType?: string;
            [key: string]: unknown;
        }

        const value: SystemOutputValue = {
            event: event.type,
            blockKey: block.key.toString(),
            blockLabel: block.label,
            // Include action type for debugging - helps trace lifecycle actions
            actionType: event.type === 'push' ? 'push-block' : 'pop-block',
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

        // Create the metrics
        const metric: IMetric = {
            type: MetricType.System,
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
            metrics: [metric],
        });

        this.addOutput(output);
    }

    private emitSegmentOutputFromResultMemory(block: IRuntimeBlock, stackDepth: number): void {
        const resultLocs = block.getMemoryByTag('metric:result');
        const displayLocs = block.getMemoryByTag('metric:display');

        if (resultLocs.length === 0) {
            return;
        }

        // If we have multiple result groups, emit one segment for each
        for (let i = 0; i < resultLocs.length; i++) {
            const resultFragments = resultLocs[i].metrics ?? [];
            
            // Match with corresponding display metrics if available
            // (Assumes 1:1 pairing from ReportOutputBehavior)
            const sourceFragments = displayLocs[i]?.metrics ?? [];

            // 2. Merge: Runtime results override source definitions (for same type)
            const resultTypes = new Set(resultFragments.map(f => f.type));
            const effectiveSourceFragments = sourceFragments.filter(f => !resultTypes.has(f.type));

            const metrics = [...effectiveSourceFragments, ...resultFragments];

            if (metrics.length === 0) {
                continue;
            }

            const fallbackEndMs = this.clock.now.getTime();
            const fallbackStartMs = block.executionTiming?.startTime?.getTime() ?? fallbackEndMs;

            // Use the actual execution timing for the main timeSpan (Push -> Pop)
            const timeSpan = new TimeSpan(fallbackStartMs, fallbackEndMs);

            // Extract internal timer spans if available
            const spans = this.extractSpansFromResultFragments(metrics);

            const output = new OutputStatement({
                outputType: 'segment',
                timeSpan,
                spans: spans.length > 0 ? spans : undefined,
                sourceBlockKey: block.key.toString(),
                sourceStatementId: block.sourceIds?.[i] ?? block.sourceIds?.[0],
                stackLevel: stackDepth,
                metrics,
            });

            this.addOutput(output);
        }
    }

    private extractSpansFromResultFragments(metrics: IMetric[]): TimeSpan[] {
        const spansFragment = metrics.find(
            metric => metric.type === MetricType.Spans || metric.type === 'spans'
        ) as (IMetric & { spans?: unknown }) | undefined;

        if (!spansFragment) {
            return [];
        }

        const rawSpans = Array.isArray(spansFragment.value)
            ? spansFragment.value
            : Array.isArray(spansFragment.spans)
                ? spansFragment.spans
                : [];

        return rawSpans
            .map(raw => {
                const rawObj = raw as { started?: unknown; ended?: unknown };
                if (typeof rawObj.started !== 'number' || isNaN(rawObj.started)) {
                    return undefined;
                }

                if (typeof rawObj.ended === 'number' && !isNaN(rawObj.ended)) {
                    return new TimeSpan(rawObj.started, rawObj.ended);
                }

                return new TimeSpan(rawObj.started);
            })
            .filter((span): span is TimeSpan => span !== undefined);
    }




    private emitLoadOutput(): void {
        const now = this.clock.now;

        // Emit a load output each statement in the script
        for (const stmt of this.script.statements) {
            const rawText = this.script.source.substring(stmt.meta.startOffset, stmt.meta.endOffset + 1);

            // Start with the parsed metrics from the statement
            const metrics: IMetric[] = stmt.metrics ? [...stmt.metrics] : [];

            // Add a Label metrics for the raw text if one doesn't exist? 
            // Or just always add it as the "Source" representation?
            // The existing code created a valid 'Label' metrics. Let's keep it but maybe ensuring it doesn't duplicate if 'Text' exists?
            // For 'load', having the raw text as a Label is useful for the "Name" column.

            metrics.push({
                type: MetricType.Label,
                image: rawText || 'Statement',
                value: rawText,
                origin: 'runtime',
                timestamp: now
            });

            // Calculate logical depth by traversing parents
            let logicalDepth = 0;
            let currentParentId = stmt.parent;
            while (currentParentId !== undefined) {
                const parent = this.script.getId(currentParentId);
                if (parent) {
                    logicalDepth++;
                    currentParentId = parent.parent;
                } else {
                    break;
                }
            }

            const output = new OutputStatement({
                outputType: 'load',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'root',
                sourceStatementId: stmt.id,
                stackLevel: logicalDepth,
                metrics
            });

            this.addOutput(output);
        }
    }

    private emitEventOutput(event: IEvent): void {
        const now = this.clock.now;
        const currentBlock = this.stack.current;
        const blockKey = currentBlock?.key.toString() ?? 'root';

        const metrics: IMetric[] = [
            {
                type: MetricType.System,
                image: `event: ${event.name}`,
                value: {
                    name: event.name,
                    data: event.data,
                    // source removed as it's not on IEvent
                    blockKey
                },
                origin: 'runtime',
                timestamp: now
            }
        ];

        const output = new OutputStatement({
            outputType: 'event',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: blockKey,
            stackLevel: this.stack.count,
            metrics
        });

        this.addOutput(output);
    }

    private emitCompilerOutput(block: IRuntimeBlock): void {
        // Emit behavior configuration/compiler info
        const now = this.clock.now;
        const metrics: IMetric[] = [
            {
                type: MetricType.Label,
                image: `Behaviors: ${block.behaviors.map(b => b.constructor.name).join(', ')}`,
                value: block.behaviors.map(b => b.constructor.name),
                origin: 'runtime',
                timestamp: now
            }
        ];

        const output = new OutputStatement({
            outputType: 'compiler',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: block.key.toString(),
            stackLevel: this.stack.count, // technically it's about to be pushed, so maybe count + 1? or current count is fine as pre-push
            metrics
        });

        this.addOutput(output);
    }
}
