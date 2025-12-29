import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * Increments the round counter on each next() call.
 * Suitable for blocks that execute a single action per step or treat each step as a round (extensions).
 */
export class RoundPerNextBehavior implements IRuntimeBehavior {
    private round: number = 0;

    /**
     * Gets the current round number (1-based).
     */
    getRound(): number {
        return this.round;
    }

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.round = 1;
        return [];
    }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.round++;
        return [];
    }
}
