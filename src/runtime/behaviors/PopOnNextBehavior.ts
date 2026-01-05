import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { PopBlockAction } from '../actions/stack/PopBlockAction';

/**
 * PopOnNextBehavior - Pops the block when next() is called.
 * 
 * This is a simple, single-responsibility behavior for blocks that
 * should immediately dismiss when the user triggers "next".
 * Commonly used for idle/transition blocks.
 * 
 * @example
 * ```typescript
 * // Block will pop when next() is called
 * new PopOnNextBehavior()
 * ```
 */
export class PopOnNextBehavior implements IRuntimeBehavior {
    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [new PopBlockAction()];
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
