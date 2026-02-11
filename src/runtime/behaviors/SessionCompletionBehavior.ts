import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';

/**
 * SessionCompletionBehavior marks the session block complete and pops it
 * when all children have finished executing.
 *
 * ## Aspect: Completion (Session-level)
 *
 * This behavior holds a direct reference to the ChildRunnerBehavior and
 * checks `allChildrenCompleted` on each `onNext()`. When all children
 * are done, it marks the block complete and returns a PopBlockAction.
 *
 * ## Usage
 *
 * Used in single-round SessionRootBlock configurations. For multi-round
 * sessions, RoundCompletionBehavior handles completion instead.
 *
 * Must be placed AFTER ChildRunnerBehavior in the behavior chain so that
 * ChildRunnerBehavior processes the next() first and updates its internal state.
 */
export class SessionCompletionBehavior implements IRuntimeBehavior {
    constructor(private readonly childRunner: ChildRunnerBehavior) {}

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.childRunner.allChildrenCompleted) {
            ctx.markComplete('all-children-complete');
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
