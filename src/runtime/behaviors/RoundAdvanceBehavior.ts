import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState } from '../memory/MemoryTypes';

/**
 * RoundAdvanceBehavior increments the round counter on next().
 * 
 * ## Aspect: Iteration
 * 
 * Advances the round on each next() call. Works with RoundCompletionBehavior
 * which checks if rounds are exhausted.
 */
export class RoundAdvanceBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

        // Advance to next round
        ctx.setMemory('round', {
            current: round.current + 1,
            total: round.total
        });

        // Emit round:advance event
        ctx.emitEvent({
            name: 'round:advance',
            timestamp: ctx.clock.now,
            data: {
                blockKey: ctx.block.key.toString(),
                newRound: round.current + 1,
                totalRounds: round.total
            }
        });

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
