import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * IntervalWaitingBehavior handles rest periods between intervals.
 * 
 * @deprecated This is a stub for backward compatibility during migration.
 */
export class IntervalWaitingBehavior implements IRuntimeBehavior {
    constructor(
        private readonly restDurationMs: number = 0
    ) { }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    getRestDuration(): number {
        return this.restDurationMs;
    }
}
