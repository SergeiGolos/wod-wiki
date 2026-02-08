import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';

/**
 * PopOnNextBehavior pops the block from the stack when next() is called.
 * 
 * Use for simple blocks that advance on user click or single completion:
 * - Effort blocks (e.g., "10 Push-ups")
 * - Pause blocks
 * - Instruction blocks
 * 
 * ## Aspect: Completion
 * 
 * This behavior implements the "pop on user advance" completion strategy.
 * When next() is called, it marks the block complete and returns a PopBlockAction
 * to remove this block from the stack.
 */
export class PopOnNextBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // No-op on mount
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Mark block complete and return action to pop it from stack
        ctx.markComplete('user-advance');
        return [new PopBlockAction()];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
