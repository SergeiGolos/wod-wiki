import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';

/**
 * Calculates total elapsed time from timer spans.
 */
function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}

/**
 * TimerCompletionBehavior marks the block complete when a countdown timer expires.
 * 
 * ## Aspect: Completion (Time-based)
 * 
 * Subscribes to tick events and checks if the timer has reached its duration.
 * Only active for countdown timers (direction: 'down').
 */
export class TimerCompletionBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to tick events to check for completion
        ctx.subscribe('tick', (_event, tickCtx) => {
            const timer = tickCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Only countdown timers have a completion condition
            if (timer.direction !== 'down' || !timer.durationMs) return [];

            const now = tickCtx.clock.now.getTime();
            const elapsed = calculateElapsed(timer, now);

            if (elapsed >= timer.durationMs) {
                // Timer expired - mark complete
                tickCtx.markComplete('timer-expired');

                // Emit timer:complete event
                tickCtx.emitEvent({
                    name: 'timer:complete',
                    timestamp: tickCtx.clock.now,
                    data: {
                        blockKey: tickCtx.block.key.toString(),
                        elapsedMs: elapsed,
                        durationMs: timer.durationMs
                    }
                });
            }

            return [];
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
