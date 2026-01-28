import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * PopOnNextBehavior marks the block complete immediately when next() is called.
 * 
 * Use for simple blocks that advance on user click or single completion:
 * - Effort blocks (e.g., "10 Push-ups")
 * - Pause blocks
 * - Instruction blocks
 * 
 * ## Aspect: Completion
 * 
 * This behavior implements the "pop on user advance" completion strategy.
 */
export class PopOnNextBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // No-op on mount
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Mark block complete on any next() call
        ctx.markComplete('user-advance');
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
