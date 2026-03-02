import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

export interface CountupTimerConfig {
    /** Human-readable label shown in the display layer */
    label?: string;
    /** Timer role for display priority */
    role?: 'primary' | 'secondary' | 'hidden' | 'auto';
}

/**
 * CountupTimerBehavior manages the full lifecycle of a count-up timer.
 *
 * ## Aspect: Time (Count-up)
 *
 * Covers the complete lifecycle for blocks without a fixed duration:
 * - **mount**: opens an initial TimeSpan to start tracking
 * - **pause/resume events**: closes/opens spans to exclude paused time
 * - **unmount**: closes the current span to finalise elapsed time
 *
 * There is no tick subscription and no completion signal — the block
 * advances only when the user (or a parent) calls `next()`.
 *
 * Strategies: assign this directly instead of composing TimerInitBehavior
 * + TimerTickBehavior + TimerPauseBehavior.
 */
export class CountupTimerBehavior implements IRuntimeBehavior {
    constructor(public readonly config: CountupTimerConfig = {}) { }

    private subscriptions: Unsubscribe[] = [];
    private isPaused = false;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();
        const label = this.config.label ?? ctx.block.label;
        const role = this.config.role === 'hidden' ? 'auto' : (this.config.role ?? 'primary');

        ctx.pushMemory('time', [this.createFragment(ctx, {
            spans: [new TimeSpan(now)],
            direction: 'up',
            durationMs: undefined,
            label,
            role
        })]);

        // Pause — close current span
        this.subscriptions.push(
            ctx.subscribe('timer:pause' as any, (_event, pCtx) => {
                if (this.isPaused) return [];
                const timeLoc = pCtx.getMemoryByTag('time')[0];
                const timer = timeLoc?.fragments[0]?.value as TimerState | undefined;
                if (!timer || !timeLoc?.fragments[0]) return [];
                pCtx.updateMemory('time', [{...timeLoc.fragments[0], value: {...timer, spans: closeCurrentSpan(timer.spans, pCtx.clock.now.getTime())}}]);
                this.isPaused = true;
                return [];
            })
        );

        // Resume — open a new span
        this.subscriptions.push(
            ctx.subscribe('timer:resume' as any, (_event, rCtx) => {
                if (!this.isPaused) return [];
                const timeLoc = rCtx.getMemoryByTag('time')[0];
                const timer = timeLoc?.fragments[0]?.value as TimerState | undefined;
                if (!timer || !timeLoc?.fragments[0]) return [];
                rCtx.updateMemory('time', [{...timeLoc.fragments[0], value: {...timer, spans: [...timer.spans, new TimeSpan(rCtx.clock.now.getTime())]}}]);
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
        const timeLoc = ctx.getMemoryByTag('time')[0];
        const timer = timeLoc?.fragments[0]?.value as TimerState | undefined;
        if (!timer || timer.spans.length === 0 || !timeLoc?.fragments[0]) return [];
        ctx.updateMemory('time', [{...timeLoc.fragments[0], value: {...timer, spans: closeCurrentSpan(timer.spans, ctx.clock.now.getTime())}}]);
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        for (const unsub of this.subscriptions) {
            try { unsub(); } catch { /* no-op */ }
        }
        this.subscriptions.length = 0;
    }

    private createFragment(ctx: IBehaviorContext, state: TimerState): ICodeFragment {
        return {
            fragmentType: FragmentType.Time,
            type: 'time',
            image: '0:00',
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
