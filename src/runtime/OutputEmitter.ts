import { IOutputStatement, OutputStatement } from '../core/models/OutputStatement';
import { IAnalyticsEngine } from '../core/contracts/IAnalyticsEngine';
import { MetricContainer } from '../core/models/MetricContainer';
import { IMetric, MetricType } from '../core/models/Metric';
import { TimeSpan } from './models/TimeSpan';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeStack } from './contracts/IRuntimeStack';
import { IEvent } from './contracts/events/IEvent';
import type { WhiteboardScript } from '../parser/WhiteboardScript';
import type { OutputListener } from './contracts/IScriptRuntime';
import type { Unsubscribe } from './contracts/IRuntimeStack';

/**
 * OutputEmitter — the single module responsible for everything that flows into
 * the output log: buffering, subscriber notification, analytics enrichment,
 * and all runtime emission helpers.
 *
 * ## Why this exists
 *
 * Previously ScriptRuntime owned the output buffer, 5 private emission methods,
 * analytics integration, and subscriber management — 8 separate emission sites
 * scattered across the runtime. OutputEmitter concentrates all of that behind a
 * narrow interface so that:
 *
 * - **Locality**: every output invariant (GC guard for system outputs, analytics
 *   enrichment, listener error isolation) lives in one place.
 * - **Leverage**: callers call `add()` and the whole policy runs automatically.
 * - **Testability**: the output pipeline can be tested without constructing a
 *   full ScriptRuntime.
 *
 * ## Interface
 *
 * ```
 * add(output)                 — buffer + notify (called by runtime, behaviors, blocks)
 * subscribe(listener)         — reactive subscription with deferred catch-up
 * getAll()                    — snapshot of accumulated statements
 * setAnalyticsEngine(engine)  — attach enrichment pipeline
 * finalizeAnalytics()         — flush summary statements after workout ends
 * dispose()                   — release buffer and listeners
 * ```
 *
 * ## Emission helpers
 *
 * The five helpers that were private methods of ScriptRuntime are now methods
 * here. They read their clock/stack/script from {@link OutputEmitter.attach}
 * (wired once by ScriptRuntime) rather than taking runtime-shaped args at every
 * call — closing the "carve-out moved code without moving the bugs" defect.
 *
 * - emitLoad()
 * - emitStackEvent(event)
 * - emitSegmentFromResultMemory(block, stackDepth)
 * - emitRuntimeEvent(event)
 * - emitCompilerBlock(block)
 */
export class OutputEmitter {
    private _outputStatements: IOutputStatement[] = [];
    private _outputListeners: Set<OutputListener> = new Set();
    private _analyticsEngine: IAnalyticsEngine | null = null;

    // Runtime dependencies wired once via attach() — the emission helpers read
    // these instead of taking clock/stack/script across the seam at every call.
    // This closes the "carve-out moved code without moving the bugs" defect:
    // OutputEmitter no longer takes runtime-shaped args per emit.
    private _clock: IRuntimeClock | null = null;
    private _stack: IRuntimeStack | null = null;
    private _script: WhiteboardScript | null = null;

    /**
     * Wire the runtime dependencies the emission helpers read. Called once by
     * ScriptRuntime's constructor after its own stack/clock/script are set.
     * Replaces the per-call clock/stack/script parameters the helpers used to take.
     */
    attach(deps: { clock: IRuntimeClock; stack: IRuntimeStack; script: WhiteboardScript }): void {
        this._clock = deps.clock;
        this._stack = deps.stack;
        this._script = deps.script;
    }

    private _requireClock(): IRuntimeClock {
        if (!this._clock) {
            throw new Error('[OutputEmitter] emission helper called before attach() — clock is not wired');
        }
        return this._clock;
    }

    // =========================================================================
    // Core output API
    // =========================================================================

    /**
     * Add an output statement, run it through analytics enrichment, buffer it,
     * and notify all subscribers.
     *
     * GC guard: system-typed outputs are skipped entirely when no listener is
     * present to prevent object allocation pressure during high-iteration
     * workloads (e.g. 10 000-round performance tests).
     */
    add(output: IOutputStatement): void {
        if (output.outputType === 'system' && this._outputListeners.size === 0) {
            return;
        }

        const processed = this._analyticsEngine
            ? this._analyticsEngine.run(output)
            : output;

        this._outputStatements.push(processed);

        for (const listener of this._outputListeners) {
            try {
                listener(processed);
            } catch (err) {
                console.error('[OutputEmitter] Listener error:', err);
            }
        }
    }

    /**
     * Subscribe to output statements.
     *
     * New subscribers receive a deferred catch-up of all statements emitted so
     * far (setTimeout 0) to avoid synchronous React render warnings.
     */
    subscribe(listener: OutputListener): Unsubscribe {
        this._outputListeners.add(listener);

        const snapshot = [...this._outputStatements];
        if (snapshot.length > 0) {
            setTimeout(() => {
                if (this._outputListeners.has(listener)) {
                    for (const output of snapshot) {
                        listener(output);
                    }
                }
            }, 0);
        }

        return () => this._outputListeners.delete(listener);
    }

    /** Returns a copy of all output statements accumulated so far. */
    getAll(): IOutputStatement[] {
        return [...this._outputStatements];
    }

    /** Returns true when at least one subscriber is listening. */
    hasListeners(): boolean {
        return this._outputListeners.size > 0;
    }

    setAnalyticsEngine(engine: IAnalyticsEngine): void {
        this._analyticsEngine = engine;
    }

    /**
     * Flush the analytics engine's summary outputs after a workout ends.
     * Summary statements bypass the enrichment chain (already fully processed).
     */
    finalizeAnalytics(): IOutputStatement[] {
        if (!this._analyticsEngine) return [];

        const summaryOutputs = this._analyticsEngine.finalize();

        for (const output of summaryOutputs) {
            this._outputStatements.push(output);
            for (const listener of this._outputListeners) {
                try {
                    listener(output);
                } catch (err) {
                    console.error('[OutputEmitter] Finalize listener error:', err);
                }
            }
        }

        return summaryOutputs;
    }

    dispose(): void {
        this._outputStatements = [];
        this._outputListeners.clear();
    }

    // =========================================================================
    // Emission helpers (previously private methods of ScriptRuntime)
    // =========================================================================

    /**
     * Emit a `'load'` output for every statement in the script.
     * Called once during ScriptRuntime construction. Reads the attached script
     * and clock (see {@link attach}); no runtime-shaped args cross the seam.
     */
    emitLoad(): void {
        if (!this._script) {
            throw new Error('[OutputEmitter] emitLoad() called before attach() — script is not wired');
        }
        const script = this._script;
        const now = this._requireClock().currentDate;

        for (const stmt of script.statements) {
            const rawText = script.source.substring(
                stmt.meta.startOffset,
                stmt.meta.endOffset + 1
            );

            const metrics = MetricContainer.from(stmt.metrics as any, stmt.id);
            metrics.add({
                type: MetricType.Label,
                image: rawText || 'Statement',
                value: rawText,
                origin: 'runtime',
                timestamp: now,
            });

            // Logical depth: count ancestors
            let logicalDepth = 0;
            let parentId = stmt.parent;
            while (parentId !== undefined) {
                const parent = script.getId(parentId);
                if (parent) { logicalDepth++; parentId = parent.parent; }
                else break;
            }

            this.add(new OutputStatement({
                outputType: 'load',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'root',
                sourceStatementId: stmt.id,
                stackLevel: logicalDepth,
                metrics,
            }));
        }
    }

    /**
     * Emit a `'system'` output for a push or pop stack event.
     * Reads the attached clock and stack blocks; only the event (which carries
     * the affected block + depth) crosses the seam.
     */
    emitStackEvent(event: { type: 'push' | 'pop'; block: IRuntimeBlock; depth: number }): void {
        // GC guard: only create objects when a listener wants them
        if (!this.hasListeners()) return;

        const now = this._requireClock().currentDate;
        const block = event.block;
        // The stack's current blocks at emit time — equivalent to the per-call
        // `stackBlocks` arg this used to take (the subscription handler fires
        // after the mutation, so attached stack state is the post-event state).
        const stackBlocks = this._stack?.blocks ?? [];

        interface SystemValue {
            event: 'push' | 'pop';
            blockKey: string;
            blockLabel?: string;
            actionType?: string;
            [key: string]: unknown;
        }

        const value: SystemValue = {
            event: event.type,
            blockKey: block.key.toString(),
            blockLabel: block.label,
            actionType: event.type === 'push' ? 'push-block' : 'pop-block',
        };

        if (event.type === 'push') {
            const parentBlock = stackBlocks.length > 1 ? stackBlocks[1] : undefined;
            if (parentBlock) value.parentKey = parentBlock.key.toString();
        } else {
            value.completionReason = (block as any).completionReason ?? 'normal';
        }

        const metric: IMetric = {
            type: MetricType.System,
            image: event.type === 'push'
                ? `push: ${block.label ?? block.blockType ?? 'Block'} [${block.key.toString().slice(0, 8)}]`
                : `pop: ${block.label ?? block.blockType ?? 'Block'} [${block.key.toString().slice(0, 8)}] reason=${(block as any).completionReason ?? 'normal'}`,
            value,
            origin: 'runtime',
            timestamp: now,
        };

        this.add(new OutputStatement({
            outputType: 'system',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: block.key.toString(),
            stackLevel: event.depth,
            metrics: MetricContainer.empty(block.key.toString()).add(metric),
        }));
    }

    /**
     * Emit `'segment'` outputs from a block's `metric:result` memory.
     * Called when a block is popped from the stack. `stackDepth` is the
     * event-specific depth at pop time; clock is read from the attached deps.
     */
    emitSegmentFromResultMemory(block: IRuntimeBlock, stackDepth: number): void {
        const resultLocs = block.getMemoryByTag('metric:result');
        const displayLocs = block.getMemoryByTag('metric:display');

        if (resultLocs.length === 0) return;

        const fallbackEndMs = this._requireClock().currentDate.getTime();

        for (let i = 0; i < resultLocs.length; i++) {
            const resultFragments = MetricContainer.from(resultLocs[i].metrics, block.key.toString());

            // Match with corresponding display metrics if available
            // (Assumes 1:1 pairing from ReportOutputBehavior)
            const sourceFragments = MetricContainer.from(displayLocs[i]?.metrics, block.key.toString());

            // Keep source + result contributions as raw metrics.
            // Visibility winners are resolved downstream by ownership-aware
            // display reads — do NOT pre-filter source by result type here.
            const metrics = MetricContainer.empty(block.key.toString())
                .add(...sourceFragments.toArray())
                .add(...resultFragments.toArray());

            if (metrics.length === 0) continue;

            const fallbackStartMs = block.executionTiming?.startTime?.getTime() ?? fallbackEndMs;
            const timeSpan = new TimeSpan(fallbackStartMs, fallbackEndMs);

            this.add(new OutputStatement({
                outputType: 'segment',
                timeSpan,
                sourceBlockKey: block.key.toString(),
                sourceStatementId: block.sourceIds?.[i] ?? block.sourceIds?.[0],
                stackLevel: stackDepth,
                metrics,
            }));
        }
    }

    /**
     * Emit an `'event'` output for a dispatched runtime event.
     * Reads the attached clock and stack; only the event crosses the seam.
     */
    emitRuntimeEvent(event: IEvent): void {
        const now = this._requireClock().currentDate;
        const stack = this._stack;
        const blockKey = stack?.current?.key.toString() ?? 'root';

        const metrics = MetricContainer.empty(blockKey).add({
            type: MetricType.System,
            image: `event: ${event.name}`,
            value: { name: event.name, data: event.data, blockKey },
            origin: 'runtime',
            timestamp: now,
        });

        this.add(new OutputStatement({
            outputType: 'event',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: blockKey,
            stackLevel: stack?.count ?? 0,
            metrics,
        }));
    }

    /**
     * Emit a `'compiler'` output recording the behaviors attached to a block.
     * Reads the attached clock and stack count; only the block crosses the seam.
     */
    emitCompilerBlock(block: IRuntimeBlock): void {
        const now = this._requireClock().currentDate;
        // Pre-push count, same as the per-call `stackCount` this used to take —
        // ScriptRuntime calls this before queueing the PushBlockAction.
        const stackCount = this._stack?.count ?? 0;

        const metrics = MetricContainer.empty(block.key.toString()).add({
            type: MetricType.Label,
            image: `Behaviors: ${block.behaviors.map(b => b.constructor.name).join(', ')}`,
            value: block.behaviors.map(b => b.constructor.name),
            origin: 'runtime',
            timestamp: now,
        });

        this.add(new OutputStatement({
            outputType: 'compiler',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: block.key.toString(),
            stackLevel: stackCount,
            metrics,
        }));
    }

    // =========================================================================
    // Private helpers
    // =========================================================================
}
