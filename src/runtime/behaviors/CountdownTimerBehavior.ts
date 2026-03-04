import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState, ChildrenStatusState, RoundState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { IMetric, MetricType } from '../../core/models/Metric';
import { ClearChildrenAction } from '../actions/stack/ClearChildrenAction';
import { calculateElapsed } from '../time/calculateElapsed';
import { CurrentRoundMetric } from '../compiler/metrics/CurrentRoundMetric';

/**
 * Controls what happens when the countdown reaches zero.
 *
 * - `complete-block`: marks the block complete and clears children.
 *   Use for timers that own the block's lifecycle (AMRAP cap, timed effort).
 * - `reset-interval`: resets spans and children state for the next round.
 *   Use for repeating-interval timers where the block lives across many rounds (EMOM).
 */
export type CountdownMode = 'complete-block' | 'reset-interval';

export interface CountdownTimerConfig {
    /** Duration in milliseconds — required for a countdown */
    durationMs: number;
    /** Human-readable label shown in the display layer */
    label?: string;
    /** Timer role for display priority */
    role?: 'primary' | 'secondary' | 'hidden' | 'auto';
    /**
     * What happens when elapsed >= durationMs.
     * Defaults to `'complete-block'`.
     */
    mode?: CountdownMode;
    /** Factory to create a rest block for "next" transitions */
    restBlockFactory?: (durationMs: number, label?: string) => IRuntimeAction[];
}

/**
 * CountdownTimerBehavior manages the full lifecycle of a count-down timer.
 *
 * ## Aspect: Time (Count-down)
 *
 * Covers the complete lifecycle for blocks with a fixed duration:
 * - **mount**: opens an initial TimeSpan; checks immediate expiry
 * - **tick events**: monitors elapsed time and fires `timer:complete` on expiry
 * - **pause/resume events**: closes/opens spans to exclude paused time
 * - **unmount**: closes the current span to finalise elapsed time
 *
 * Strategies assign this one behavior instead of composing the old quartet
 * (TimerInitBehavior + TimerTickBehavior + TimerEndingBehavior + TimerPauseBehavior).
 */
export class CountdownTimerBehavior implements IRuntimeBehavior {
    constructor(public readonly config: CountdownTimerConfig) { }

    private subscriptions: Unsubscribe[] = [];
    private isPaused = false;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();
        const label = this.config.label ?? ctx.block.label;
        const role = this.config.role === 'hidden' ? 'auto' : (this.config.role ?? 'primary');
        const mode = this.config.mode ?? 'complete-block';

        ctx.pushMemory('time', [this.createFragment(ctx, {
            spans: [new TimeSpan(now)],
            direction: 'down',
            durationMs: this.config.durationMs,
            label,
            role
        })]);

        // Immediate expiry check (e.g. duration was already 0 when compiled)
        if (this.config.durationMs <= 0) {
            this.handleExpiry(ctx, mode);
            return [new ClearChildrenAction(ctx.block.key.toString())];
        }

        // Tick subscription — monitors elapsed and triggers expiry
        this.subscriptions.push(
            ctx.subscribe('tick', (_event, tickCtx) => {
                const timer = tickCtx.getMemoryByTag('time')[0]?.metrics[0]?.value as TimerState | undefined;
                if (!timer || timer.direction !== 'down' || timer.durationMs === undefined) {
                    return [];
                }
                // Once block is complete in complete-block mode, stop monitoring
                if (mode === 'complete-block' && tickCtx.block.isComplete) {
                    return [];
                }

                const elapsed = calculateElapsed(timer, tickCtx.clock.now.getTime());
                if (elapsed < timer.durationMs) return [];

                this.handleExpiry(tickCtx, mode);
                return [new ClearChildrenAction(tickCtx.block.key.toString())];
            }, { scope: 'bubble' })
        );

        // Timer Reset — for EMOM manual skip or synchronization
        this.subscriptions.push(
            ctx.subscribe('timer:reset' as any, (_event, rCtx) => {
                if (mode !== 'reset-interval') return [];
                const timeLoc = rCtx.getMemoryByTag('time')[0];
                const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
                if (!timer || !timeLoc?.metrics[0]) return [];
                rCtx.updateMemory('time', [{...timeLoc.metrics[0], value: {...timer, spans: [new TimeSpan(rCtx.clock.now.getTime())]}}]);
                return [];
            })
        );

        // Pause — close current span
        this.subscriptions.push(
            ctx.subscribe('timer:pause' as any, (_event, pCtx) => {
                if (this.isPaused) return [];
                const timeLoc = pCtx.getMemoryByTag('time')[0];
                const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
                if (!timer || !timeLoc?.metrics[0]) return [];
                pCtx.updateMemory('time', [{...timeLoc.metrics[0], value: {...timer, spans: closeCurrentSpan(timer.spans, pCtx.clock.now.getTime())}}]);
                this.isPaused = true;
                return [];
            })
        );

        // Resume — open a new span
        this.subscriptions.push(
            ctx.subscribe('timer:resume' as any, (_event, rCtx) => {
                if (!this.isPaused) return [];
                const timeLoc = rCtx.getMemoryByTag('time')[0];
                const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
                if (!timer || !timeLoc?.metrics[0]) return [];
                rCtx.updateMemory('time', [{...timeLoc.metrics[0], value: {...timer, spans: [...timer.spans, new TimeSpan(rCtx.clock.now.getTime())]}}]);
                this.isPaused = false;
                return [];
            })
        );

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Parent blocks (those with child selection) should NEVER push their own rest.
        // ChildSelectionBehavior handles rest injection (EMOM) or sibling transitions.
        // We use constructor name check to avoid circular dependency.
        const hasChildSelection = ctx.block.behaviors.some(
            b => b.constructor.name === 'ChildSelectionBehavior'
        );
        
        if (hasChildSelection) {
            return [];
        }

        if (!this.config.restBlockFactory) {
            return [];
        }

        const timer = ctx.getMemoryByTag('time')[0]?.metrics[0]?.value as TimerState | undefined;
        if (!timer || timer.direction !== 'down' || !timer.durationMs) {
            return [];
        }

        const remainingMs = this.getRemainingCountdownMs(ctx);

        // Only inject rest if more than 1s remaining (matching ChildSelectionBehavior logic)
        if (remainingMs > 1000) {
            return this.config.restBlockFactory(remainingMs, 'Rest');
        }

        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timeLoc = ctx.getMemoryByTag('time')[0];
        const timer = timeLoc?.metrics[0]?.value as TimerState | undefined;
        if (!timer || timer.spans.length === 0 || !timeLoc?.metrics[0]) return [];
        ctx.updateMemory('time', [{...timeLoc.metrics[0], value: {...timer, spans: closeCurrentSpan(timer.spans, ctx.clock.now.getTime())}}]);
        return [];
    }

    onDispose(ctx: IBehaviorContext): void {
        for (const unsub of this.subscriptions) {
            try { unsub(); } catch { /* no-op */ }
        }
        this.subscriptions.length = 0;
    }

    // -------------------------------------------------------------------------

    private handleExpiry(ctx: IBehaviorContext, mode: CountdownMode): void {
        ctx.emitEvent({
            name: 'timer:complete',
            timestamp: ctx.clock.now,
            data: { blockKey: ctx.block.key.toString() }
        });

        if (mode === 'complete-block') {
            ctx.markComplete('timer-expired');
        } else {
            // reset-interval: new span starting now, reset child cursor
            const timeLoc = ctx.getMemoryByTag('time')[0];
            const timer = timeLoc?.metrics[0]?.value as TimerState;
            if (timeLoc?.metrics[0]) {
                ctx.updateMemory('time', [{...timeLoc.metrics[0], value: {...timer, spans: [new TimeSpan(ctx.clock.now.getTime())]}}]);
            }

            // If ChildSelectionBehavior is present, it will handle round/status advancement
            // via its own logic (coordinated with Rest block popping or manual next).
            // We use constructor name check to avoid circular dependency.
            const hasChildSelection = ctx.block.behaviors.some(
                b => b.constructor.name === 'ChildSelectionBehavior'
            );
            if (hasChildSelection) {
                return;
            }

            // Cycle complete — advance round counter directly before
            // resetting for the next cycle. This keeps round tracking
            // self-contained for simple repeating timers without children.
            const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
            if (round) {
                const roundFragment = new CurrentRoundMetric(
                    round.current + 1,
                    round.total,
                    ctx.block.key.toString(),
                    ctx.clock.now,
                );
                ctx.updateMemory('round', [roundFragment]);
            }

            const childLoc = ctx.getMemoryByTag('children:status')[0];
            const childStatus = childLoc?.metrics[0]?.value as ChildrenStatusState | undefined;
            const newChildStatus = { childIndex: 0, totalChildren: childStatus?.totalChildren ?? 0, allExecuted: false, allCompleted: false };
            if (childLoc?.metrics[0]) {
                ctx.updateMemory('children:status', [{...childLoc.metrics[0], value: newChildStatus}]);
            } else {
                ctx.pushMemory('children:status', [{metricType: 0 as any, type: 'children:status', image: '', origin: 'runtime' as any, value: newChildStatus}]);
            }
        }
    }

    private getRemainingCountdownMs(ctx: IBehaviorContext): number {
        const timer = ctx.getMemoryByTag('time')[0]?.metrics[0]?.value as TimerState | undefined;
        if (!timer || timer.direction !== 'down' || !timer.durationMs) {
            return 0;
        }

        const now = ctx.clock.now.getTime();
        const elapsed = calculateElapsed(timer, now);
        return Math.max(0, timer.durationMs - elapsed);
    }

    private createFragment(ctx: IBehaviorContext, state: TimerState): IMetric {
        return {
            metricType: MetricType.Time,
            type: 'time',
            image: formatDuration(state.durationMs),
            origin: 'runtime',
            value: state,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };
    }
}

function closeCurrentSpan(spans: readonly TimeSpan[], endMs: number): TimeSpan[] {
    return spans.map((span, i) =>
        i === spans.length - 1 && span.ended === undefined
            ? new TimeSpan(span.started, endMs)
            : span
    );
}

function formatDuration(durationMs: number | undefined): string {
    if (!durationMs || durationMs === 0) return '0:00';
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

