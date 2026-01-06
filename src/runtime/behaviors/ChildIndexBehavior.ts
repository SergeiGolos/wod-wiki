import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';

/**
 * Tracks the current child index for a block.
 * Wraps around when the index exceeds the number of children.
 */
export class ChildIndexBehavior implements IRuntimeBehavior {
    private currentIndex: number = -1; // Starts at -1 so first increment makes it 0
    public hasJustWrapped: boolean = false;

    constructor(private readonly countOverride?: number) { }

    /**
     * Gets the current child index.
     */
    getIndex(): number {
        return this.currentIndex;
    }

    /**
     * Gets the total number of children.
     * Used by BoundLoopBehavior to predict if the next increment will wrap.
     */
    getChildCount(block: IRuntimeBlock): number {
        return this.countOverride ?? block.sourceIds.length;
    }

    /**
     * Called when the block is pushed. Initialize state.
     */
    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        this.currentIndex = -1;
        this.hasJustWrapped = false;
        return [];
    }

    /**
     * Called when determining the next block.
     * Updates the index handling wrap-around.
     */
    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const childCount = this.countOverride ?? block.sourceIds.length;

        if (childCount === 0) {
            return [];
        }

        this.currentIndex++;
        this.hasJustWrapped = false;

        // Wrap around
        if (this.currentIndex >= childCount) {
            this.currentIndex = 0;
            this.hasJustWrapped = true;
        }

        return [];
    }
}
