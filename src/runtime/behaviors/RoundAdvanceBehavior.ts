import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { RoundState } from '../memory/MemoryTypes';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

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
 *
 * ## Migration: Fragment-Based Memory
 *
 * This behavior now updates round fragments in the new list-based memory API
 * while maintaining backward compatibility with the old Map-based API.
 */
export class RoundAdvanceBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

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
        const newCurrent = round.current + 1;

        // Update OLD API
        ctx.setMemory('round', {
            current: newCurrent,
            total: round.total
        });

        // Update NEW API - update round fragment with new current round
        const roundFragment: ICodeFragment = {
            fragmentType: FragmentType.Rounds,
            type: 'rounds',
            image: this.formatRounds(newCurrent, round.total),
            origin: 'runtime',
            value: {
                current: newCurrent,
                total: round.total
            },
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        ctx.updateMemory('round', [roundFragment]);

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Format rounds as "Round X / Y" or "Round X" for unbounded
     */
    private formatRounds(current: number, total: number | undefined): string {
        if (total === undefined) {
            return `Round ${current}`;
        }
        return `Round ${current} / ${total}`;
    }
}
