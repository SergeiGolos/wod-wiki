import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';

/**
 * Single Pass Behavior.
 * Runs through the block once. Requests a pop when the round count reaches 2.
 * Expects a Round Increment behavior to be present.
 */
export class SinglePassBehavior implements IRuntimeBehavior {

    onNext(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const round = this.getRound(_block);

        // Exit if we have started the second round (meaning the first pass is complete)
        if (round >= 2) {
            return [new PopBlockAction()];
        }

        return [];
    }

    private getRound(block: IRuntimeBlock): number {
        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior.getRound();

        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior.getRound();

        return 1; // Default
    }
}
