import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';
import { ChildrenStatusState } from '../memory/MemoryTypes';

export interface ReEntryConfig {
    /** Total number of rounds (undefined for unbounded) */
    totalRounds?: number;
    /** Starting round (default: 1) */
    startRound?: number;
}

/**
 * ReEntryBehavior initializes and advances round state in block memory.
 *
 * ## Aspect: Iteration
 *
 * Owns round initialization, advancement, and re-entry tracking by writing
 * CurrentRoundFragment to the `round` memory tag.
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

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const roundLocations = ctx.block.getMemoryByTag('round');
        if (roundLocations.length === 0) return [];

        const roundFragments = roundLocations[0].fragments;
        if (roundFragments.length === 0) return [];

        const roundValue = roundFragments[0].value as { current: number; total?: number } | undefined;
        if (!roundValue) return [];

        const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
        if (childStatus && !childStatus.allCompleted) {
            return [];
        }

        const roundFragment = new CurrentRoundFragment(
            roundValue.current + 1,
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
