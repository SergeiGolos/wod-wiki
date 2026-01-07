import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';

/**
 * Single Pass Behavior.
 * Runs through the block once. Marks as complete when the round count reaches 2.
 * Expects a Round Increment behavior to be present.
 */
export class SinglePassBehavior implements IRuntimeBehavior {
    private _isComplete = false;

    isComplete(): boolean {
        return this._isComplete;
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        if (this._isComplete) {
            return [];
        }

        const round = this.getRound(_block);

        // Exit if we have started the second round (meaning the first pass is complete)
        if (round >= 2) {
            this._isComplete = true;
            // Mark block as complete - stack will pop it during sweep
            _block.markComplete('single-pass-complete');
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
