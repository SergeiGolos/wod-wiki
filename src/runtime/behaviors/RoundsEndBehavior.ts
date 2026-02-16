import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { RoundState, ChildrenStatusState } from '../memory/MemoryTypes';

export class RoundsEndBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) {
            return [];
        }

        if (round.total === 1) {
            const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
            if (childStatus?.allCompleted) {
                ctx.markComplete('session-complete');
                return [new PopBlockAction()];
            }
        }

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
