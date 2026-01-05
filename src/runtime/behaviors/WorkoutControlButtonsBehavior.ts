import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RegisterButtonAction, ClearButtonsAction } from '../actions/display/ControlActions';
import { RuntimeButton } from '../models/MemoryModels';

export type ButtonPreset = 'execution' | 'idle-start' | 'idle-end' | 'custom';

/**
 * Standard button configurations for different workout phases.
 */
const BUTTON_PRESETS: Record<string, RuntimeButton[]> = {
    'execution': [
        {
            id: 'btn-pause',
            label: 'Pause',
            icon: 'pause',
            action: 'timer:pause',
            variant: 'default',
            size: 'lg'
        },
        {
            id: 'btn-next',
            label: 'Next',
            icon: 'next',
            action: 'timer:next',
            variant: 'secondary',
            size: 'lg'
        },
        {
            id: 'btn-complete',
            label: 'Complete',
            icon: 'x',
            action: 'workout:complete',
            variant: 'destructive',
            size: 'lg'
        }
    ],
    'idle-start': [
        {
            id: 'btn-start',
            label: 'Start Workout',
            icon: 'play',
            action: 'timer:start',
            variant: 'default',
            size: 'lg'
        }
    ],
    'idle-end': [
        {
            id: 'btn-analytics',
            label: 'View Analytics',
            icon: 'analytics',
            action: 'view:analytics',
            variant: 'default',
            size: 'lg'
        }
    ]
};

/**
 * WorkoutControlButtonsBehavior - Registers standard workout control buttons.
 * 
 * Provides preset button configurations for different workout phases:
 * - 'execution': Pause, Next, Complete buttons
 * - 'idle-start': Start Workout button
 * - 'idle-end': View Analytics button
 * - 'custom': User-provided buttons
 * 
 * @example
 * ```typescript
 * // Register execution buttons (pause, next, complete)
 * new WorkoutControlButtonsBehavior('execution')
 * 
 * // Register custom buttons
 * new WorkoutControlButtonsBehavior('custom', [
 *     { id: 'btn-custom', label: 'Custom', ... }
 * ])
 * ```
 */
export class WorkoutControlButtonsBehavior implements IRuntimeBehavior {
    private readonly buttons: RuntimeButton[];

    constructor(
        preset: ButtonPreset,
        customButtons?: RuntimeButton[]
    ) {
        if (preset === 'custom' && customButtons) {
            this.buttons = customButtons;
        } else {
            this.buttons = BUTTON_PRESETS[preset] || [];
        }
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return this.buttons.map(button => new RegisterButtonAction(button));
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Clear buttons when block is popped
        return [new ClearButtonsAction()];
    }

    /**
     * Gets the buttons that will be registered.
     */
    getButtons(): readonly RuntimeButton[] {
        return this.buttons;
    }
}
