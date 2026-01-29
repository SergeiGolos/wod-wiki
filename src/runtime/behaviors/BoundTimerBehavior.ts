import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * BoundTimerBehavior - Legacy bound timer behavior (countdown with limit).
 * 
 * @deprecated Use the new aspect-based timer behaviors instead:
 * - TimerInitBehavior with direction 'down' and durationMs set
 * - TimerCompletionBehavior for completion handling
 * 
 * This is a legacy stub maintained for backward compatibility.
 * 
 * @see TimerInitBehavior
 * @see TimerCompletionBehavior
 */
export class BoundTimerBehavior implements IRuntimeBehavior {
    constructor(private readonly _durationMs?: number) {}

    get durationMs(): number | undefined {
        return this._durationMs;
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
