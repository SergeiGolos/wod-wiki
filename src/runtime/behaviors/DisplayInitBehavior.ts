import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

export interface DisplayInitConfig {
    /** Display mode */
    mode?: 'clock' | 'timer' | 'countdown' | 'hidden';
    /** Primary label */
    label?: string;
    /** Secondary label */
    subtitle?: string;
    /** Action being performed */
    actionDisplay?: string;
}

/**
 * DisplayInitBehavior initializes display state in block memory.
 * 
 * ## Aspect: Display
 * 
 * Sets up UI-facing state for labels and display modes.
 */
export class DisplayInitBehavior implements IRuntimeBehavior {
    constructor(private config: DisplayInitConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Initialize display state in memory
        ctx.setMemory('display', {
            mode: this.config.mode ?? 'clock',
            label: this.config.label ?? ctx.block.label,
            subtitle: this.config.subtitle,
            roundDisplay: undefined,
            actionDisplay: this.config.actionDisplay
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
