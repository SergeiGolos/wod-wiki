import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

export interface ButtonConfig {
    /** Unique button identifier */
    id: string;
    /** Display label */
    label: string;
    /** Button style variant */
    variant: 'primary' | 'secondary' | 'danger' | 'ghost';
    /** Whether button is currently visible */
    visible: boolean;
    /** Whether button is enabled */
    enabled: boolean;
    /** Event to emit when clicked */
    eventName?: string;
}

export interface ControlsConfig {
    /** Initial buttons to display */
    buttons: ButtonConfig[];
}

/**
 * ControlsState stored in memory.
 * Represents the current state of control buttons.
 */
export interface ControlsState {
    /** Current button configurations */
    readonly buttons: readonly ButtonConfig[];
}

/**
 * ControlsInitBehavior initializes control button state.
 * 
 * ## Aspect: Controls
 * 
 * Sets up the initial button configurations that the UI observes.
 */
export class ControlsInitBehavior implements IRuntimeBehavior {
    constructor(private config: ControlsConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit an event with button config for UI consumption
        ctx.emitEvent({
            name: 'controls:init',
            timestamp: ctx.clock.now,
            data: {
                blockKey: ctx.block.key.toString(),
                buttons: this.config.buttons
            }
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit controls cleanup event
        ctx.emitEvent({
            name: 'controls:cleanup',
            timestamp: ctx.clock.now,
            data: {
                blockKey: ctx.block.key.toString()
            }
        });

        return [];
    }
}
