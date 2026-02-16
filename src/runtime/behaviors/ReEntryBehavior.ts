import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';

export interface ReEntryConfig {
    /** Total number of rounds (undefined for unbounded) */
    totalRounds?: number;
    /** Starting round (default: 1) */
    startRound?: number;
}

/**
 * ReEntryBehavior initializes round state in block memory on mount.
 *
 * ## Aspect: Iteration
 *
 * Owns round initialization by writing CurrentRoundFragment to the
 * `round` memory tag. Round advancement is handled by
 * ChildSelectionBehavior when it completes a cycle of children,
 * keeping each behavior self-contained without ordering dependencies.
 */
export class ReEntryBehavior implements IRuntimeBehavior {
    constructor(private config: ReEntryConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const current = this.config.startRound ?? 1;
        const total = this.config.totalRounds;

        const roundFragment = new CurrentRoundFragment(
            current,
            total,
            ctx.block.key.toString(),
            ctx.clock.now,
        );

        ctx.pushMemory('round', [roundFragment]);

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Round advancement is handled by ChildSelectionBehavior.advanceRound()
        // when a complete cycle of children finishes. This eliminates the
        // ordering dependency where ReEntry had to read children:status
        // written by ChildSelectionBehavior in the same onNext chain.
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
