import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState, ChildrenStatusState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { ClearChildrenAction } from '../actions/stack/ClearChildrenAction';
import { calculateElapsed } from '../time/calculateElapsed';

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
                const timer = tickCtx.getMemory('time') as TimerState | undefined;
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

        // Pause — close current span
        this.subscriptions.push(
            ctx.subscribe('timer:pause' as any, (_event, pCtx) => {
                if (this.isPaused) return [];
                const timer = pCtx.getMemory('time') as TimerState | undefined;
                if (!timer) return [];
                pCtx.setMemory('time', {
                    ...timer,
                    spans: closeCurrentSpan(timer.spans, pCtx.clock.now.getTime())
                });
                this.isPaused = true;
                return [];
            })
        );

        // Resume — open a new span
        this.subscriptions.push(
            ctx.subscribe('timer:resume' as any, (_event, rCtx) => {
                if (!this.isPaused) return [];
                const timer = rCtx.getMemory('time') as TimerState | undefined;
                if (!timer) return [];
                rCtx.setMemory('time', {
                    ...timer,
                    spans: [...timer.spans, new TimeSpan(rCtx.clock.now.getTime())]
                });
                this.isPaused = false;
                return [];
            })
        );

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('time') as TimerState | undefined;
        if (!timer || timer.spans.length === 0) return [];
        ctx.setMemory('time', {
            ...timer,
            spans: closeCurrentSpan(timer.spans, ctx.clock.now.getTime())
        });
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
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
            const timer = ctx.getMemory('time') as TimerState;
            ctx.setMemory('time', {
                ...timer,
                spans: [new TimeSpan(ctx.clock.now.getTime())]
            });

            const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
            ctx.setMemory('children:status', {
                childIndex: 0,
                totalChildren: childStatus?.totalChildren ?? 0,
                allExecuted: false,
                allCompleted: false
            });
        }
    }

    private createFragment(ctx: IBehaviorContext, state: TimerState): ICodeFragment {
        return {
            fragmentType: FragmentType.Time,
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
