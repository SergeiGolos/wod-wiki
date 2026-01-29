import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * BoundLoopBehavior - Legacy bound loop behavior (fixed rounds).
 * 
 * @deprecated Use the new aspect-based round behaviors instead:
 * - RoundInitBehavior with total rounds set
 * - RoundAdvanceBehavior for advancing rounds
 * - RoundCompletionBehavior for completion handling
 * 
 * This is a legacy stub maintained for backward compatibility.
 * 
 * @see RoundInitBehavior
 * @see RoundAdvanceBehavior
 * @see RoundCompletionBehavior
 */
export class BoundLoopBehavior implements IRuntimeBehavior {
    constructor(private readonly _totalRounds?: number) {}

    get totalRounds(): number | undefined {
        return this._totalRounds;
    }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
