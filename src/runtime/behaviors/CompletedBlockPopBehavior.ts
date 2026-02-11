import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';

/**
 * CompletedBlockPopBehavior pops a block on next() when it has already
 * been marked complete (e.g., by TimerCompletionBehavior).
 *
 * ## Aspect: Completion (deferred pop for timer-controlled blocks)
 *
 * Used on blocks where an external signal (timer expiry, event) marks
 * the block complete, but the block should only pop when next() is
 * called — typically after all active children have finished.
 *
 * ## Behavior Chain Placement
 *
 * Must be placed AFTER ChildRunnerBehavior. When ChildRunner declines
 * to push more children (because block.isComplete), this behavior
 * returns a PopBlockAction to clean up the block.
 *
 * ## Use Cases
 *
 * - AMRAP: timer expires → markComplete → last child pops → next() → pop
 * - EMOM: timer expires → markComplete → last child pops → next() → pop
 */
export class CompletedBlockPopBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (ctx.block.isComplete) {
            return [new PopBlockAction()];
        }
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
