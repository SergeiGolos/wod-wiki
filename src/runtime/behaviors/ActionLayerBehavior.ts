import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { FragmentGroup } from '../../fragments/FragmentGroup';

/**
 * ActionLayerBehavior - Manages action layer display.
 * 
 * @deprecated Use ControlsInitBehavior instead. This is a legacy stub
 * maintained for backward compatibility with existing strategies.
 * 
 * ## Migration
 * Replace `new ActionLayerBehavior(blockKey, fragments, sourceIds)` with:
 * - `new ControlsInitBehavior(config)` - For controls/buttons
 * - `new DisplayInitBehavior(config)` - For display state
 * 
 * @see ControlsInitBehavior
 * @see DisplayInitBehavior
 */
export class ActionLayerBehavior implements IRuntimeBehavior {
    constructor(
        private readonly _blockKey: string,
        private readonly _fragmentGroups: FragmentGroup[],
        private readonly _sourceIds: string[]
    ) {}

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Legacy stub - does nothing
        // Display and controls are handled by DisplayInitBehavior and ControlsInitBehavior
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
