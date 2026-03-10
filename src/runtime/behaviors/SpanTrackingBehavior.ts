import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { IMetric, MetricType } from '../../core/models/Metric';

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
        const now = ctx.clock.now.getTime();
        const label = ctx.block.label;

        const metric: IMetric = {
            type: MetricType.Time,
            image: '0:00',
            origin: 'runtime',
            value: {
                spans: [new TimeSpan(now)],
                direction: 'up',
                durationMs: undefined,
                label,
                role: 'hidden'
            } satisfies TimerState,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        ctx.pushMemory('time', [metric]);
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timeLoc = ctx.getMemoryByTag('time')[0];
        const timerState = timeLoc?.metrics[0]?.value as TimerState | undefined;
        if (!timerState || timerState.spans.length === 0 || !timeLoc?.metrics[0]) return [];

        const now = ctx.clock.now.getTime();
        const closedSpans = closeCurrentSpan(timerState.spans, now);

        ctx.updateMemory('time', [{...timeLoc.metrics[0], value: { ...timerState, spans: closedSpans }}]);
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No subscriptions — nothing to clean up
    }
}

/** Closes the last open span at the given timestamp. */
function closeCurrentSpan(spans: readonly TimeSpan[], endMs: number): TimeSpan[] {
    return spans.map((span, i) =>
        i === spans.length - 1 && span.ended === undefined
            ? new TimeSpan(span.started, endMs)
            : span
    );
}
