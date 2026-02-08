import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState, DisplayState } from '../memory/MemoryTypes';

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
        const round = ctx.getMemory('round') as RoundState | undefined;
        const display = ctx.getMemory('display') as DisplayState | undefined;

        if (!round) return;

        const roundDisplay = round.total !== undefined
            ? `Round ${round.current} of ${round.total}`
            : `Round ${round.current}`;

        if (display) {
            ctx.setMemory('display', {
                ...display,
                roundDisplay
            });
        }
    }
}
