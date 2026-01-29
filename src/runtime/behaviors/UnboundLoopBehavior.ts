import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * UnboundLoopBehavior - Legacy unbound loop behavior (AMRAP style).
 * 
 * @deprecated Use the new aspect-based round behaviors instead:
 * - RoundInitBehavior without total (unbounded)
 * - RoundAdvanceBehavior for advancing rounds
 * 
 * This is a legacy stub maintained for backward compatibility.
 * 
 * @see RoundInitBehavior
 * @see RoundAdvanceBehavior
 */
export class UnboundLoopBehavior implements IRuntimeBehavior {
    constructor() {}

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
