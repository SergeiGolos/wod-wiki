import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RuntimeButton } from '../models/MemoryModels';

/**
 * RuntimeControlsBehavior provides imperative control over display mode and buttons.
 * 
 * This is a compatibility behavior that maintains the imperative API used by
 * ControlActions while internally using the event-based pattern.
 * 
 * @deprecated Prefer using ControlsInitBehavior with event-based updates
 */
export class RuntimeControlsBehavior implements IRuntimeBehavior {
    private _displayMode: 'timer' | 'clock' = 'timer';
    private _buttons: Map<string, RuntimeButton> = new Map();
    private ctx?: IBehaviorContext;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        this.ctx = ctx;
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        this.ctx = undefined;
        return [];
    }

    /**
     * Set the display mode (timer or clock view)
     */
    setDisplayMode(mode: 'timer' | 'clock'): void {
        this._displayMode = mode;
        this.ctx?.emitEvent({
            name: 'controls:display-mode',
            timestamp: this.ctx.clock.now,
            data: { mode }
        });
    }

    /**
     * Get the current display mode
     */
    getDisplayMode(): 'timer' | 'clock' {
        return this._displayMode;
    }

    /**
     * Register a button for display
     */
    registerButton(button: RuntimeButton): void {
        this._buttons.set(button.id, button);
        this.ctx?.emitEvent({
            name: 'controls:button-registered',
            timestamp: this.ctx.clock.now,
            data: { button }
        });
    }

    /**
     * Unregister a button by ID
     */
    unregisterButton(buttonId: string): void {
        this._buttons.delete(buttonId);
        this.ctx?.emitEvent({
            name: 'controls:button-unregistered',
            timestamp: this.ctx.clock.now,
            data: { buttonId }
        });
    }

    /**
     * Clear all registered buttons
     */
    clearButtons(): void {
        this._buttons.clear();
        this.ctx?.emitEvent({
            name: 'controls:buttons-cleared',
            timestamp: this.ctx.clock.now,
            data: {}
        });
    }

    /**
     * Get all registered buttons
     */
    getButtons(): RuntimeButton[] {
        return Array.from(this._buttons.values());
    }
}
