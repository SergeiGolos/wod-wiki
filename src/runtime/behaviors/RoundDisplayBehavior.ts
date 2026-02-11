import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { FragmentType } from '../../fragments/FragmentType';

/**
 * RoundDisplayBehavior updates the display roundDisplay when rounds change.
 * 
 * ## Aspect: Display
 * 
 * Listens to round state changes and updates the display memory.
 */
export class RoundDisplayBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Set initial round display
        this.updateRoundDisplay(ctx);
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Update round display after each advance
        this.updateRoundDisplay(ctx);
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    private updateRoundDisplay(ctx: IBehaviorContext): void {
        const roundLocations = ctx.block.getMemoryByTag('round');
        if (roundLocations.length === 0) return;

        const roundFragments = roundLocations[0].fragments;
        if (roundFragments.length === 0) return;

        const roundValue = roundFragments[0].value;
        if (!roundValue) return;

        const roundDisplay = roundValue.total !== undefined
            ? `Round ${roundValue.current} of ${roundValue.total}`
            : `Round ${roundValue.current}`;

        // Get current display fragments
        const displayLocations = ctx.block.getMemoryByTag('display');
        if (displayLocations.length > 0) {
            const currentFragments = displayLocations[0].fragments;
            
            // Add or update round display fragment
            const roundFragment: ICodeFragment = {
                fragmentType: FragmentType.Text,
                type: 'text',
                image: roundDisplay,
                origin: 'runtime',
                value: { text: roundDisplay, role: 'round' },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            };

            // Combine with existing display fragments
            ctx.updateMemory('display', [...currentFragments, roundFragment]);
        }
    }
}
