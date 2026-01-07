import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';

/**
 * PopOnNextBehavior - Marks the block as complete when next() is called.
 * 
 * This is a simple, single-responsibility behavior for blocks that
 * should immediately dismiss when the user triggers "next".
 * Commonly used for idle/transition blocks.
 * 
 * @example
 * ```typescript
 * // Block will complete when next() is called
 * new PopOnNextBehavior()
 * ```
 */
export class PopOnNextBehavior implements IRuntimeBehavior {
    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Mark block as complete - stack will pop it during sweep
        block.markComplete('next-triggered');
        return [];
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
