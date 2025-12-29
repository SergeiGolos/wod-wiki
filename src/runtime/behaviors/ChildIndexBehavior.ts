import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';

/**
 * Tracks the current child index for a block.
 * Wraps around when the index exceeds the number of children.
 */
export class ChildIndexBehavior implements IRuntimeBehavior {
    private currentIndex: number = -1; // Starts at -1 so first next() call increments to 0
    public hasJustWrapped: boolean = false;

    /**
     * Gets the current child index.
     */
    getIndex(): number {
        return this.currentIndex;
    }

    /**
     * Called when the block is pushed. Initialize state.
     */
    onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        // We expect the first call to onNext to increment this to 0 and execute the first child.
        this.currentIndex = -1;
        return [];
    }

    /**
     * Called when determining the next block.
     * Updates the index handling wrap-around.
     */
    onNext(block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Determine the number of children/items to iterate over.
        // Assuming block.sourceIds contains the child IDs or instructions.
        // If the block generates children dynamically (like JIT), this might need adjustment.
        // For now, we assume tracking based on loop iteration logic usually has a concept of "group size" or similar, 
        // but the prompt implies simple child index tracking. 
        // If we use sourceIds.length:

        // Note: LoopCoordinator uses 'childGroups'. Generic blocks might just use sourceIds.
        // We'll rely on a known count. For generic blocks, maybe sourceIds.length is the count.

        const childCount = block.sourceIds.length; // Default to sourceIds count?

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
