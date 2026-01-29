import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import type { ButtonConfig } from '../../behaviors/ControlsInitBehavior';

/**
 * UpdateDisplayModeAction - Updates display mode via event.
 * 
 * Uses event-based pattern for display mode changes.
 */
export class UpdateDisplayModeAction implements IRuntimeAction {
    readonly type = 'update-display-mode';
    constructor(private readonly mode: 'timer' | 'clock') { }
    do(runtime: IScriptRuntime): void {
        // Emit event for display mode change - UI should subscribe to this
        runtime.eventBus.dispatch({
            name: 'controls:display-mode',
            timestamp: runtime.clock.now,
            data: { mode: this.mode }
        }, runtime);
    }
}

/**
 * RegisterButtonAction - Registers a button via event.
 * 
 * Uses the ControlsInitBehavior event-based pattern.
 */
export class RegisterButtonAction implements IRuntimeAction {
    readonly type = 'register-button';
    constructor(private readonly button: ButtonConfig) { }
    do(runtime: IScriptRuntime): void {
        runtime.eventBus.dispatch({
            name: 'controls:button-registered',
            timestamp: runtime.clock.now,
            data: { button: this.button }
        }, runtime);
    }
}

/**
 * UnregisterButtonAction - Unregisters a button via event.
 */
export class UnregisterButtonAction implements IRuntimeAction {
    readonly type = 'unregister-button';
    constructor(private readonly buttonId: string) { }
    do(runtime: IScriptRuntime): void {
        runtime.eventBus.dispatch({
            name: 'controls:button-unregistered',
            timestamp: runtime.clock.now,
            data: { buttonId: this.buttonId }
        }, runtime);
    }
}

/**
 * ClearButtonsAction - Clears all buttons via event.
 */
export class ClearButtonsAction implements IRuntimeAction {
    readonly type = 'clear-buttons';
    do(runtime: IScriptRuntime): void {
        runtime.eventBus.dispatch({
            name: 'controls:buttons-cleared',
            timestamp: runtime.clock.now,
            data: {}
        }, runtime);
    }
}
