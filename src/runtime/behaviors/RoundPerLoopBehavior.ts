import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { ChildIndexBehavior } from './ChildIndexBehavior';

/**
 * Increments the round counter every time the child index loops (wraps).
 * Requires ChildIndexBehavior to be present on the block.
 * Ensure ChildIndexBehavior is ordered BEFORE this behavior in the block's behavior list.
 */
export class RoundPerLoopBehavior implements IRuntimeBehavior {
    readonly priority = 550; // Core: round tracking
    private round: number = 0;

    /**
     * Gets the current round number (1-based).
     */
    getRound(): number {
        return this.round;
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        this.round = 1;
        return [];
    }

    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (childIndex && childIndex.hasJustWrapped) {
            this.round++;
        }
        return [];
    }
}
