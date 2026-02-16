import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RoundState } from '../memory/MemoryTypes';

export class RoundsEndBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Skip if already marked complete by another behavior (e.g.,
        // ChildSelectionBehavior handles completion for loop-enabled blocks).
        // RuntimeBlock.next() auto-pop ensures the block is popped.
        if (ctx.block.isComplete) {
            return [];
        }

        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) {
            return [];
        }

        // Safety net: if round counter exceeds total (e.g., from external
        // advancement), mark complete. ChildSelectionBehavior normally
        // handles this, but this guard catches edge cases.
        if (round.total !== undefined && round.current > round.total) {
            ctx.markComplete('rounds-exhausted');
            return [new PopBlockAction()];
        }

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
