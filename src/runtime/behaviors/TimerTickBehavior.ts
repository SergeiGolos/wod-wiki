import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';

/**
 * TimerTickBehavior subscribes to tick events and updates elapsed time.
 * 
 * ## Aspect: Time
 * 
 * Listens for 'tick' events and updates the timer state in memory.
 * Works with TimerInitBehavior which sets up the initial state.
 */
export class TimerTickBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to tick events
        ctx.subscribe('tick', (_event, tickCtx) => {
            const timer = tickCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Timer state is updated by the UI observing the spans
            // The spans contain start times, and elapsed is calculated as now - started
            // No need to update memory on every tick - that's expensive
            // Instead, UI should compute elapsed from spans

            return [];
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Close the current span
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer && timer.spans.length > 0) {
            const now = ctx.clock.now.getTime();
            const updatedSpans = timer.spans.map((span, i) => {
                if (i === timer.spans.length - 1 && span.ended === undefined) {
                    return new TimeSpan(span.started, now);
                }
                return span;
            });

            ctx.setMemory('timer', {
                ...timer,
                spans: updatedSpans
            });
        }

        return [];
    }
}
