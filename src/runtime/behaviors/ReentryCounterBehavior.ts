import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * ReentryCounterBehavior tracks how many times a block has been re-entered.
 *
 * ## Universal Invariant
 *
 * This behavior is automatically added to ALL blocks by BlockBuilder.
 * It tracks the number of times a block is pushed onto the stack and mounted.
 * Useful for debugging, analytics, and detecting infinite loops.
 */
export class ReentryCounterBehavior implements IRuntimeBehavior {
    private mountCount = 0;

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        this.mountCount++;
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Get the number of times this block has been mounted.
     * @returns Mount count
     */
    getMountCount(): number {
        return this.mountCount;
    }

    /**
     * Reset the mount count to zero.
     */
    reset(): void {
        this.mountCount = 0;
    }
}
