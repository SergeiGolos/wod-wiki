import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { TrackRoundAction } from '../actions/tracking/TrackRoundAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';

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

    onNext(block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (this._isComplete) {
            return [];
        }

        const round = this.getRound(block);
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
