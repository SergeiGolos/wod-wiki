import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

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
        // Initialize round state in memory
        ctx.setMemory('round', {
            current: this.config.startRound ?? 1,
            total: this.config.totalRounds
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
