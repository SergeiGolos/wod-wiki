import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { TrackRoundAction } from '../actions/tracking/TrackRoundAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { ChildIndexBehavior } from './ChildIndexBehavior';

/**
 * Bound Loop Behavior.
 * Runs for a specified number of rounds.
 * Pops the block when the round count exceeds the limit.
 * Reports progress to the tracker.
 */
export class BoundLoopBehavior implements IRuntimeBehavior {
    private _isComplete = false;

    constructor(private readonly totalRounds: number) { }

    isComplete(): boolean {
        return this._isComplete;
    }

    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        if (this._isComplete) {
            return [];
        }

        // Get the current round from RoundPerLoopBehavior or RoundPerNextBehavior.
        // Note: Due to behavior execution order, RoundPerLoopBehavior hasn't incremented
        // the round yet when this behavior runs. We need to predict if the round will
        // increment by checking if ChildIndexBehavior will wrap on its next increment.
        let round = this.getRound(block);
        
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (childIndex) {
            // Get current index - it will be incremented by ChildIndexBehavior.onNext()
            // If incrementing would cause a wrap, the round will increase
            const currentIdx = childIndex.getIndex();
            const childCount = childIndex.getChildCount(block);
            const willWrap = childCount > 0 && (currentIdx + 1) >= childCount;
            
            if (willWrap) {
                // Round will be incremented after this - anticipate it
                round += 1;
            }
        }
        
        const actions: IRuntimeAction[] = [];

        // Report round status to tracker (History)
        actions.push(new TrackRoundAction(block.key.toString(), round, this.totalRounds));

        if (round > this.totalRounds) {
            this._isComplete = true;
            actions.push(new PopBlockAction());
        }

        return actions;
    }

    private getRound(block: IRuntimeBlock): number {
        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior.getRound();

        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior.getRound();

        return 1;
    }
}
