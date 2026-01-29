import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * HistoryBehavior - Records block execution to history.
 * 
 * @deprecated Use HistoryRecordBehavior instead. This is a legacy stub
 * maintained for backward compatibility with existing strategies.
 * 
 * ## Migration
 * Replace `new HistoryBehavior(config)` with:
 * - `new HistoryRecordBehavior()` - Basic history recording
 * 
 * @see HistoryRecordBehavior
 */
export class HistoryBehavior implements IRuntimeBehavior {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config?: { label?: string; debugMetadata?: Record<string, unknown> }) {
        // Legacy stub - config is intentionally unused
    }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Legacy stub - does nothing
        // HistoryRecordBehavior handles history on unmount
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Legacy stub - real history recording moved to HistoryRecordBehavior
        return [];
    }
}
