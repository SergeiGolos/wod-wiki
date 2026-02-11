import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import type { ButtonConfig } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

// Re-export types for consumers
export type { ButtonConfig };

export interface ControlsConfig {
    /** Initial buttons to display */
    buttons: ButtonConfig[];
}

/**
 * ButtonBehavior initializes control button state in memory.
 *
 * ## Aspect: Controls
 *
 * Sets up the button configurations in memory that the UI observes.
 * When buttons are clicked, the UI emits the corresponding `eventName`
 * as an external event that behaviors can subscribe to.
 *
 * ## Memory Contract
 *
 * - **Writes**: `controls` memory on mount
 * - **Clears**: `controls` memory on unmount (sets empty buttons array)
 *
 * ## UI Integration
 *
 * The UI should:
 * 1. Subscribe to `controls` memory changes
 * 2. Render buttons based on action fragments
 * 3. Emit `button.eventName` when user clicks a button
 *
 * @example
 * ```typescript
 * new ButtonBehavior({
 *   buttons: [
 *     { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true, eventName: 'next' },
 *     { id: 'pause', label: 'Pause', variant: 'secondary', visible: true, enabled: true, eventName: 'timer:pause' }
 *   ]
 * })
 * ```
 */
export class ButtonBehavior implements IRuntimeBehavior {
    constructor(private config: ControlsConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Create action fragments for each button
        const fragments: ICodeFragment[] = this.config.buttons.map(button => ({
            fragmentType: FragmentType.Action,
            type: 'action',
            image: button.label,
            origin: 'runtime',
            value: {
                id: button.id,
                label: button.label,
                variant: button.variant,
                visible: button.visible,
                enabled: button.enabled,
                eventName: button.eventName
            },
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        }));

        // Push action fragments to list-based memory
        if (fragments.length > 0) {
            ctx.pushMemory('controls', fragments);
        }

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Clear controls memory (signals UI to remove buttons)
        ctx.updateMemory('controls', []);

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Update a specific button's state dynamically.
     * Call this from other behaviors to enable/disable buttons.
     */
    static updateButton(
        ctx: IBehaviorContext,
        buttonId: string,
        updates: Partial<Pick<ButtonConfig, 'visible' | 'enabled' | 'label'>>
    ): void {
        const controls = ctx.getMemory('controls');
        if (!controls) return;

        const updatedButtons = controls.buttons.map(btn =>
            btn.id === buttonId ? { ...btn, ...updates } : btn
        );

        ctx.setMemory('controls', { buttons: updatedButtons });
    }
}
