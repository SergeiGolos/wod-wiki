import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ChildIndexBehavior } from './ChildIndexBehavior';
import { CompileAndPushBlockAction } from '../actions/stack/CompileAndPushBlockAction';

/**
 * ChildRunnerBehavior.
 * Responsible for pushing children onto the stack based on ChildIndexBehavior index.
 * 
 * Logic: 
 * - onPush: Force index to 0 and push first child.
 * - onNext: Push child at current index.
 */
export class ChildRunnerBehavior implements IRuntimeBehavior {
    constructor(private readonly childGroups: number[][]) { }

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const indexBehavior = block.getBehavior(ChildIndexBehavior);
        if (indexBehavior) {
            // Force the first index increment during the push phase
            indexBehavior.onNext(block, options);
        }

        // Now execute the normal onNext logic to push the block at index 0
        return this.onNext(block, options);
    }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const indexBehavior = block.getBehavior(ChildIndexBehavior);
        if (!indexBehavior) return [];

        const currentIndex = indexBehavior.getIndex();

        // The childGroups might be different from block.sourceIds in some strategies,
        // but usually they correspond. We use childGroups provided to this behavior.
        if (currentIndex < 0 || currentIndex >= this.childGroups.length) {
            return [];
        }

        const childGroupIds = this.childGroups[currentIndex];
        if (!childGroupIds || childGroupIds.length === 0) {
            return [];
        }

        const now = options?.now || new Date();
        return [new CompileAndPushBlockAction(childGroupIds, { startTime: now })];
    }
}
