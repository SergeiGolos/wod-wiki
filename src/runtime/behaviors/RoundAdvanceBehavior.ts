import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { RoundState } from '../memory/MemoryTypes';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';

/**
 * RoundAdvanceBehavior increments the round counter on next().
 * 
 * ## Aspect: Iteration
 * 
 * Advances the round on each next() call. Works with RoundCompletionBehavior
 * which checks if rounds are exhausted.
 * 
 * When a block has children (ChildRunnerBehavior), the round only advances
 * after all children have been executed (a full cycle), not on every
 * intermediate child completion.
 */
export class RoundAdvanceBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

        // If the block has children, only advance the round when all children
        // have been executed (i.e., a full cycle). This prevents round
        // increment on every intermediate child completion.
        const block = ctx.block as IRuntimeBlock;
        if (typeof block.getBehavior === 'function') {
            const childRunner = block.getBehavior(ChildRunnerBehavior);
            if (childRunner && !childRunner.allChildrenExecuted) {
                return [];
            }
        }

        // Advance to next round
        // Round advancement is signaled by memory update; no event emission needed
        ctx.setMemory('round', {
            current: round.current + 1,
            total: round.total
        });

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
