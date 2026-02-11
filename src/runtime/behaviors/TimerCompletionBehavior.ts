import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { ClearChildrenAction } from '../actions/stack/ClearChildrenAction';
import { TimeSpan } from '../models/TimeSpan';

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

export interface TimerCompletionConfig {
    /**
     * Whether timer expiry marks the block as complete.
     *
     * - `true` (default): AMRAP pattern — timer expiry terminates the block.
     *   Marks complete, clears children, block pops via CompletedBlockPopBehavior.
     *
     * - `false`: EMOM/interval pattern — timer expiry resets for next interval.
     *   Clears children, resets timer spans, but does NOT mark complete.
     *   Round advancement and block completion handled by RoundAdvance/RoundCompletion.
     */
    completesBlock?: boolean;
}

/**
 * TimerCompletionBehavior handles countdown timer expiry.
 *
 * ## Aspect: Completion (Time-based)
 *
 * Subscribes to tick events and checks if the timer has reached its duration.
 * Only active for countdown timers (direction: 'down').
 *
 * Supports two modes via `completesBlock` config:
 * - AMRAP: timer expiry = block completion → clear children → pop
 * - EMOM: timer expiry = interval end → clear children → reset timer → next round
 */
export class TimerCompletionBehavior implements IRuntimeBehavior {
    private readonly completesBlock: boolean;

    constructor(config?: TimerCompletionConfig) {
        this.completesBlock = config?.completesBlock ?? true;
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Check for immediate completion (zero duration timer)
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer && timer.direction === 'down' && timer.durationMs !== undefined && timer.durationMs <= 0) {
            // Zero or negative duration - complete immediately
            ctx.markComplete('timer-expired');
            return [];
        }

        const completesBlock = this.completesBlock;

        // Subscribe to tick events to check for completion
        // Use 'bubble' scope so parent timer blocks can still check completion
        // even when child blocks are active on the stack
        ctx.subscribe('tick', (_event, tickCtx) => {
            const timer = tickCtx.getMemory('timer') as TimerState | undefined;
            if (!timer) return [];

            // Only countdown timers have a completion condition
            if (timer.direction !== 'down' || !timer.durationMs) return [];

            // Already completed — don't re-fire
            if (tickCtx.block.isComplete) return [];

            const now = tickCtx.clock.now.getTime();
            const elapsed = calculateElapsed(timer, now);

            if (elapsed >= timer.durationMs) {
                if (completesBlock) {
                    // AMRAP pattern: timer expiry terminates the block.
                    // Mark complete → ClearChildrenAction force-pops children
                    // → NextAction → CompletedBlockPopBehavior pops this block.
                    tickCtx.markComplete('timer-expired');
                } else {
                    // EMOM/interval pattern: timer expiry resets for next interval.
                    // Reset timer spans so ChildLoopBehavior.shouldLoop() sees
                    // a fresh timer and continues looping.
                    tickCtx.setMemory('timer', {
                        ...timer,
                        spans: [new TimeSpan(now)]
                    });
                }

                // Clear any active children above this block.
                // ClearChildrenAction handles forced-pop lifecycle (marking
                // incomplete blocks complete, running unmount for fragment
                // reporting) and queues a NextAction for this block.
                return [new ClearChildrenAction(tickCtx.block.key.toString())];
            }

            return [];
        }, { scope: 'bubble' });

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
}
