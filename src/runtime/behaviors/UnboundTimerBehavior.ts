import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * UnboundTimerBehavior - Legacy unbound timer behavior (countup without limit).
 * 
 * @deprecated Use the new aspect-based timer behaviors instead:
 * - TimerInitBehavior with direction 'up' and no durationMs
 * 
 * This is a legacy stub maintained for backward compatibility.
 * 
 * @see TimerInitBehavior
 */
export class UnboundTimerBehavior implements IRuntimeBehavior {
    constructor() {}

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Legacy stub - does nothing
        // Use TimerInitBehavior for timer initialization
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
