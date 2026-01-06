import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IEvent } from '../contracts/events/IEvent';
import { ICompletionStrategy } from '../contracts/ICompletionStrategy';
import { PopBlockAction } from '../actions/lifecycle/PopBlockAction';

/**
 * StrategyBasedCompletionBehavior - Unified completion behavior using strategy pattern.
 * 
 * Replaces multiple completion behaviors with a single, strategy-driven implementation:
 * - CompletionBehavior (generic condition)
 * - BoundLoopBehavior completion logic
 * - SinglePassBehavior completion logic
 * - PopOnNextBehavior
 * - PopOnEventBehavior
 * 
 * Benefits:
 * - Single responsibility for completion detection
 * - Consistent completion semantics across all block types
 * - Strategy can be tested independently
 * - Easier to add new completion types
 * 
 * @example
 * ```typescript
 * // Timer-based completion
 * new StrategyBasedCompletionBehavior(
 *     new TimerCompletionStrategy(timerBehavior)
 * )
 * 
 * // Custom condition
 * new StrategyBasedCompletionBehavior(
 *     new ConditionCompletionStrategy(
 *         (block, now) => block.state.isComplete,
 *         ['custom:event']
 *     )
 * )
 * ```
 */
export class StrategyBasedCompletionBehavior implements IRuntimeBehavior {
    constructor(private readonly strategy: ICompletionStrategy) {}
    
    /**
     * Check for completion on next() calls.
     * Common for loop-based and child-based completion.
     */
    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        if (this.strategy.shouldComplete(block, clock.now)) {
            return [
                ...this.strategy.getCompletionActions(block, clock.now),
                new PopBlockAction()
            ];
        }
        return [];
    }
    
    /**
     * Check for completion on watched events.
     * Common for timer-based and event-triggered completion.
     */
    onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
        // Only process events this strategy cares about
        if (!this.strategy.getWatchedEvents().includes(event.name)) {
            return [];
        }
        
        const now = event.timestamp ?? new Date();
        if (this.strategy.shouldComplete(block, now)) {
            return [
                ...this.strategy.getCompletionActions(block, now),
                new PopBlockAction()
            ];
        }
        return [];
    }
}
