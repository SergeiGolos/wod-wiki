import { ICompletionStrategy } from '../contracts/ICompletionStrategy';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { EmitEventAction } from '../actions/events/EmitEventAction';

/**
 * ConditionCompletionStrategy - Completes block when custom condition is met.
 * 
 * Generic strategy for arbitrary completion conditions.
 * Replaces the old CompletionBehavior pattern.
 * 
 * @example
 * ```typescript
 * new ConditionCompletionStrategy(
 *     (block, now) => block.state.isComplete === true,
 *     ['custom:event'],
 *     'custom_condition_met'
 * )
 * ```
 */
export class ConditionCompletionStrategy implements ICompletionStrategy {
    constructor(
        private readonly condition: (block: IRuntimeBlock, now: Date) => boolean,
        private readonly watchedEvents: string[] = [],
        private readonly reason: string = 'condition_met'
    ) {}
    
    shouldComplete(block: IRuntimeBlock, now: Date): boolean {
        return this.condition(block, now);
    }
    
    getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
        return [
            new EmitEventAction('block:complete', {
                blockId: block.key.toString(),
                reason: this.reason,
                completedAt: now.toISOString()
            }, now)
        ];
    }
    
    getWatchedEvents(): string[] {
        return this.watchedEvents;
    }
    
    getCompletionReason(): string {
        return this.reason;
    }
}
