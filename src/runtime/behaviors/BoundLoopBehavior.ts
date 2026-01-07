import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { TrackRoundAction } from '../actions/tracking/TrackRoundAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { ChildIndexBehavior } from './ChildIndexBehavior';

/**
 * Bound Loop Behavior.
 * Runs for a specified number of rounds.
 * Marks the block as complete when the round count exceeds the limit.
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

        let round = this.getRound(block);
        
        // If using RoundPerLoopBehavior (child-based round counting), we need to
        // anticipate the round increment because this behavior runs BEFORE
        // ChildIndexBehavior and RoundPerLoopBehavior in the behavior order.
        // Predict if the next index increment will cause a wrap (and thus round increment).
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (childIndex) {
            const currentIdx = childIndex.getIndex();
            const childCount = childIndex.getChildCount(block);
            // Will the next increment cause a wrap?
            const willWrap = childCount > 0 && (currentIdx + 1) >= childCount;
            if (willWrap) {
                round += 1;
            }
        }
        
        const actions: IRuntimeAction[] = [];

        // Report round status to tracker (History)
        actions.push(new TrackRoundAction(block.key.toString(), round, this.totalRounds));

        if (round > this.totalRounds) {
            this._isComplete = true;
            // Mark block as complete - stack will pop it during sweep
            block.markComplete('rounds-exceeded');
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
