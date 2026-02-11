import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

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
 *
 * ## Migration: Fragment-Based Memory
 *
 * This behavior now pushes round fragments to the new list-based memory API
 * while maintaining backward compatibility with the old Map-based API.
 */
export class RoundInitBehavior implements IRuntimeBehavior {
    constructor(private config: RoundInitConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const current = this.config.startRound ?? 1;
        const total = this.config.totalRounds;

        // Initialize round state in memory (OLD API - kept for backward compatibility)
        ctx.setMemory('round', {
            current,
            total
        });

        // Create round fragment (NEW API - fragment-based memory)
        const roundFragment: ICodeFragment = {
            fragmentType: FragmentType.Rounds,
            type: 'rounds',
            image: this.formatRounds(current, total),
            origin: 'runtime',
            value: {
                current,
                total
            },
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        // Push round fragment to new list-based memory
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
