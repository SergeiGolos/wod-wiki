import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';

/**
 * TimerPauseBehavior handles pause/resume functionality for timers.
 * 
 * ## Aspect: Time (Controls)
 * 
 * Subscribes to pause/resume events and manages timer spans accordingly.
 * When paused, closes the current span. When resumed, opens a new span.
 */
export class TimerPauseBehavior implements IRuntimeBehavior {
    private isPaused = false;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Subscribe to pause event
        ctx.subscribe('timer:pause' as any, (_event, pauseCtx) => {
            if (this.isPaused) return [];

            const timer = pauseCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Close current span
            const now = pauseCtx.clock.now.getTime();
            const updatedSpans = timer.spans.map((span, i) => {
                if (i === timer.spans.length - 1 && span.ended === undefined) {
                    return new TimeSpan(span.started, now);
                }
                return span;
            });

            pauseCtx.setMemory('timer', {
                ...timer,
                spans: updatedSpans
            });

            // Pause state is signaled by closed span in timer memory
            this.isPaused = true;

            return [];
        });

        // Subscribe to resume event
        ctx.subscribe('timer:resume' as any, (_event, resumeCtx) => {
            if (!this.isPaused) return [];

            const timer = resumeCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Open new span
            const now = resumeCtx.clock.now.getTime();
            const updatedSpans = [...timer.spans, new TimeSpan(now)];

            resumeCtx.setMemory('timer', {
                ...timer,
                spans: updatedSpans
            });

            // Resume state is signaled by new open span in timer memory
            this.isPaused = false;

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

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    get paused(): boolean {
        return this.isPaused;
    }
}
