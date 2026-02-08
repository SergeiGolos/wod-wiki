import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState } from '../memory/MemoryTypes';

/**
 * RoundCompletionBehavior marks the block complete when rounds are exhausted.
 * 
 * ## Aspect: Completion (Round-based)
 * 
 * Checks on each next() if the current round exceeds total rounds.
 * Should run AFTER RoundAdvanceBehavior in the behavior chain.
 */
export class RoundCompletionBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

        // If we have a total and current exceeds it, mark complete
        // Completion is signaled via markComplete; no event emission needed
        if (round.total !== undefined && round.current > round.total) {
            ctx.markComplete('rounds-complete');
        }

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
