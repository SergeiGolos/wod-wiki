import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';

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
        const roundLocations = ctx.block.getMemoryByTag('round');
        if (roundLocations.length === 0) return [];

        const roundFragments = roundLocations[0].fragments;
        if (roundFragments.length === 0) return [];

        const roundValue = roundFragments[0].value as { current: number; total?: number } | undefined;
        if (!roundValue) return [];

        // If the block has children, only advance the round when all children
        // have truly completed (not just dispatched). allChildrenCompleted
        // returns true only when the last dispatched child has popped and
        // the subsequent next() call finds nothing more to push.
        const block = ctx.block as IRuntimeBlock;
        if (typeof block.getBehavior === 'function') {
            const childRunner = block.getBehavior(ChildRunnerBehavior);
            if (childRunner && !childRunner.allChildrenCompleted) {
                return [];
            }
        }

        // Advance to next round
        const newCurrent = roundValue.current + 1;

        // Update round fragment with new current round
        const roundFragment = new CurrentRoundFragment(
            newCurrent,
            roundValue.total,
            ctx.block.key.toString(),
            ctx.clock.now,
        );

        ctx.updateMemory('round', [roundFragment]);

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
