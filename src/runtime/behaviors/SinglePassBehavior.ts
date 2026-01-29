import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * SinglePassBehavior marks a block as complete after a single execution.
 * 
 * @deprecated This behavior is superseded by PopOnNextBehavior.
 * Use PopOnNextBehavior instead for the same functionality.
 */
export class SinglePassBehavior implements IRuntimeBehavior {
    private _isComplete = false;

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        this._isComplete = false;
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // After first next() call, mark as complete
        if (!this._isComplete) {
            this._isComplete = true;
            ctx.block.state.isComplete = true;
        }
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    /**
     * Check if this single pass has been executed.
     */
    isComplete(): boolean {
        return this._isComplete;
    }
}
