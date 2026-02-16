import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';

export interface RoundInitConfig {
    /** Total number of rounds (undefined for unbounded) */
    totalRounds?: number;
    /** Starting round (default: 1) */
    startRound?: number;
}

/**
 * RoundInitBehavior initializes round state in block memory.
 *
 * ## Aspect: Iteration
 *
 * Sets up the initial round tracking state.
 */
export class RoundInitBehavior implements IRuntimeBehavior {
    constructor(private config: RoundInitConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const current = this.config.startRound ?? 1;
        const total = this.config.totalRounds;

        // Create round fragment
        const roundFragment = new CurrentRoundFragment(
            current,
            total,
            ctx.block.key.toString(),
            ctx.clock.now,
        );

        // Push round fragment to list-based memory
        ctx.pushMemory('round', [roundFragment]);

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
