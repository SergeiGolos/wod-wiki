import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { IMetric, MetricType } from '../../core/models/Metric';
import { startSpan, closeCurrentSpan, readTimer, mutateTimerSpans } from '../time/TimerSpans';

/**
 * SpanTrackingBehavior records the wall-clock time a block was active.
 *
 * ## Aspect: Time (Span-only)
 *
 * No tick subscription, no pause/resume, no completion signal.
 * Simply opens a TimeSpan on mount and closes it on unmount so the
 * block's execution window is captured in memory for history/reporting.
 *
 * Use this for blocks that need timing data but do NOT display a running
 * timer, e.g. effort leaves where elapsed is only needed for reports.
 */
export class SpanTrackingBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.currentDate.getTime();
        const label = ctx.block.label;

        const metric: IMetric = {
            type: MetricType.Time,
            image: '0:00',
            origin: 'runtime',
            value: {
                spans: startSpan(now),
                direction: 'up',
                durationMs: undefined,
                label,
                role: 'hidden'
            } satisfies TimerState,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.currentDate,
        };

        ctx.pushMemory('time', [metric]);
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timerState = readTimer(ctx);
        if (!timerState || timerState.spans.length === 0) return [];
        mutateTimerSpans(ctx, closeCurrentSpan);
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No subscriptions — nothing to clean up
    }
}
