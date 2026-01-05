import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RuntimeButton } from '../models/MemoryModels';
import { RegisterButtonAction } from '../actions/display/ControlActions';

/**
 * SingleButtonBehavior - Registers a single button when the block is pushed.
 * 
 * This is a simple, single-responsibility behavior for blocks that need
 * to display one button (like idle blocks with "Start" or "View Analytics").
 * 
 * @example
 * ```typescript
 * new SingleButtonBehavior({
 *     id: 'btn-start',
 *     label: 'Start Workout',
 *     icon: 'play',
 *     action: 'timer:start',
 *     variant: 'default',
 *     size: 'lg'
 * })
 * ```
 */
export class SingleButtonBehavior implements IRuntimeBehavior {
    constructor(private readonly button: RuntimeButton) { }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [new RegisterButtonAction(this.button)];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
