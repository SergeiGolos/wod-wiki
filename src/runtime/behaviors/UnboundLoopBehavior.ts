import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { TrackRoundAction } from '../actions/tracking/TrackRoundAction';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';

/**
 * Unbound Loop Behavior.
 * Runs indefinitely (no pop condition).
 * Keeps track of rounds and reports to tracker.
 */
export class UnboundLoopBehavior implements IRuntimeBehavior {

    onNext(block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const round = this.getRound(block);

        // Report round status to tracker (History)
        return [new TrackRoundAction(block.key.toString(), round, undefined)];
    }

    private getRound(block: IRuntimeBlock): number {
        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior.getRound();

        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior.getRound();

        return 1;
    }
}
