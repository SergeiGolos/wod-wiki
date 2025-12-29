import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';

/**
 * Bound Loop Behavior.
 * Runs for a specified number of rounds.
 * Pops the block when the round count exceeds the limit.
 * Reports progress to the tracker.
 */
export class BoundLoopBehavior implements IRuntimeBehavior {
    constructor(private readonly totalRounds: number) { }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const round = this.getRound(block);

        // TODO: Report round status to tracker (History)
        // runtime.tracker.trackRound(round, this.totalRounds);

        if (round > this.totalRounds) {
            return [new PopBlockAction(block)];
        }

        return [];
    }

    private getRound(block: IRuntimeBlock): number {
        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior.getRound();

        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior.getRound();

        return 1;
    }
}
