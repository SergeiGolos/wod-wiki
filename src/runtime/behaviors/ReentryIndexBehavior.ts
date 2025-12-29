import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

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

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.reentryCount = 0;
        return [];
    }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.reentryCount++;
        return [];
    }
}
