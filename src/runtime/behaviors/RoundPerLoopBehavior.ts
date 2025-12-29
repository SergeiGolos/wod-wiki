import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { ChildIndexBehavior } from './ChildIndexBehavior';

/**
 * Increments the round counter every time the child index loops (wraps).
 * Requires ChildIndexBehavior to be present on the block.
 * Ensure ChildIndexBehavior is ordered BEFORE this behavior in the block's behavior list.
 */
export class RoundPerLoopBehavior implements IRuntimeBehavior {
    private round: number = 0;

    /**
     * Gets the current round number (1-based).
     */
    getRound(): number {
        return this.round;
    }

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.round = 1;
        return [];
    }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (childIndex && childIndex.hasJustWrapped) {
            this.round++;
        }
        return [];
    }
}
