import { ICompletionStrategy } from '../contracts/ICompletionStrategy';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerBehavior } from '../behaviors/TimerBehavior';
import { EmitEventAction } from '../actions/events/EmitEventAction';

/**
 * TimerCompletionStrategy - Completes block when timer expires.
 * 
 * Used for time-bound workouts (AMRAP, For Time, Countdown, etc.)
 */
export class TimerCompletionStrategy implements ICompletionStrategy {
    constructor(private readonly timerBehavior: TimerBehavior) {}
    
    shouldComplete(block: IRuntimeBlock, now: Date): boolean {
        return this.timerBehavior.isComplete(now);
    }
    
    getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
        return [
            new EmitEventAction('block:complete', {
                blockId: block.key.toString(),
                reason: 'timer_expired',
                completedAt: now.toISOString()
            }, now)
        ];
    }
    
    getWatchedEvents(): string[] {
        return ['timer:tick', 'timer:complete'];
    }
    
    getCompletionReason(): string {
        return 'timer_expired';
    }
}
