import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';

/**
 * Increments the round counter on each next() call.
 */
export class RoundPerNextBehavior implements IRuntimeBehavior {
    private round: number = 0;

    /**
     * Gets the current round number (1-based).
     */
    getRound(): number {
        return this.round;
    }

    onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.round = 1;
        return [];
    }

    onNext(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.round++;
        return [];
    }
}
