import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

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
 *
 * ## Migration: Fragment-Based Memory
 *
 * This behavior now pushes text fragments to the new list-based memory API
 * while maintaining backward compatibility with the old Map-based API.
 */
export class DisplayInitBehavior implements IRuntimeBehavior {
    constructor(private config: DisplayInitConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const mode = this.config.mode ?? 'clock';
        const label = this.config.label ?? ctx.block.label;
        const subtitle = this.config.subtitle;
        const actionDisplay = this.config.actionDisplay;

        // Initialize display state in memory (OLD API - kept for backward compatibility)
        ctx.setMemory('display', {
            mode,
            label,
            subtitle,
            roundDisplay: undefined,
            actionDisplay
        });

        // Create text fragments for display (NEW API - fragment-based memory)
        const fragments: ICodeFragment[] = [];

        // Primary label as text fragment
        if (label) {
            fragments.push({
                fragmentType: FragmentType.Text,
                type: 'text',
                image: label,
                origin: 'runtime',
                value: { text: label, role: 'label' },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            });
        }

        // Subtitle as text fragment
        if (subtitle) {
            fragments.push({
                fragmentType: FragmentType.Text,
                type: 'text',
                image: subtitle,
                origin: 'runtime',
                value: { text: subtitle, role: 'subtitle' },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            });
        }

        // Action display as text fragment
        if (actionDisplay) {
            fragments.push({
                fragmentType: FragmentType.Text,
                type: 'text',
                image: actionDisplay,
                origin: 'runtime',
                value: { text: actionDisplay, role: 'action' },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            });
        }

        // Push display fragments to new list-based memory
        if (fragments.length > 0) {
            ctx.pushMemory('display', fragments);
        }

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
