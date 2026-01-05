import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { UpdateDisplayModeAction } from '../actions/display/ControlActions';

export type DisplayMode = 'timer' | 'clock';

/**
 * DisplayModeBehavior - Manages the UI display mode.
 * 
 * Tracks and emits display mode changes (timer countdown vs clock time).
 * This is a single-responsibility behavior that only handles display mode,
 * not button management or other UI concerns.
 * 
 * @example
 * ```typescript
 * // Start in clock mode
 * const displayBehavior = new DisplayModeBehavior('clock');
 * 
 * // Switch to timer mode
 * const actions = displayBehavior.setMode('timer');
 * // Returns [UpdateDisplayModeAction('timer')]
 * ```
 */
export class DisplayModeBehavior implements IRuntimeBehavior {
    private mode: DisplayMode;

    constructor(initialMode: DisplayMode = 'timer') {
        this.mode = initialMode;
    }

    /**
     * Gets the current display mode.
     */
    getMode(): DisplayMode {
        return this.mode;
    }

    /**
     * Sets the display mode and returns the action to emit.
     * @param newMode - The new display mode
     * @returns Array containing UpdateDisplayModeAction
     */
    setMode(newMode: DisplayMode): IRuntimeAction[] {
        if (this.mode === newMode) {
            return []; // No change
        }
        this.mode = newMode;
        return [new UpdateDisplayModeAction(newMode)];
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        // Emit initial mode on push
        return [new UpdateDisplayModeAction(this.mode)];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
