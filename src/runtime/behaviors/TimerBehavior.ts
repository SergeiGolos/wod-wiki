import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

// Re-export TimeSpan for backward compatibility
export { TimeSpan } from '../models/TimeSpan';

/**
 * Legacy timer direction type.
 * @deprecated Use 'up' | 'down' from TimerInitBehavior config instead.
 */
export type TimerDirection = 'up' | 'down';

/**
 * TimerBehavior - Legacy timer behavior.
 * 
 * @deprecated Use the new aspect-based timer behaviors instead:
 * - TimerInitBehavior - Initializes timer state
 * - TimerTickBehavior - Handles tick events
 * - TimerCompletionBehavior - Handles timer completion
 * - TimerPauseBehavior - Handles pause/resume
 * - TimerOutputBehavior - Records timer output
 * 
 * This is a legacy stub maintained for backward compatibility.
 * 
 * @see TimerInitBehavior
 * @see TimerTickBehavior
 * @see TimerCompletionBehavior
 */
export class TimerBehavior implements IRuntimeBehavior {
    constructor(
        private readonly _direction: TimerDirection = 'up',
        private readonly _durationMs?: number
    ) {}

    get direction(): TimerDirection {
        return this._direction;
    }

    get durationMs(): number | undefined {
        return this._durationMs;
    }

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
