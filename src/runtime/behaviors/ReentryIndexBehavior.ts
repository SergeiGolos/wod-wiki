import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';

/**
 * Tracks the number of times next() has been called on this block.
 */
export class ReentryIndexBehavior implements IRuntimeBehavior {
    private reentryCount: number = 0;

    /**
     * Gets the current reentry count.
     */
    getCount(): number {
        return this.reentryCount;
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        this.reentryCount = 0;
        return [];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        this.reentryCount++;
        return [];
    }
}
