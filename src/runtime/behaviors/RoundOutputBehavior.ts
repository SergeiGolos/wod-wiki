import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * RoundOutputBehavior emits round milestone outputs only.
 * 
 * ## Aspect: Output (Rounds)
 * 
 * Only emits milestone outputs when rounds advance via onNext().
 * Mount/unmount outputs are NOT emitted here to avoid duplicates.
 */
export class RoundOutputBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Intentionally empty - segment output is handled elsewhere
        // We only emit milestones when rounds actually advance.
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;

        if (round) {
            const label = round.total !== undefined
                ? `Round ${round.current} of ${round.total}`
                : `Round ${round.current}`;

            ctx.emitOutput('milestone', [
                {
                    type: 'count',
                    fragmentType: FragmentType.Rounds,
                    value: round.current,
                    image: label,
                    origin: 'runtime'
                } as ICodeFragment
            ], { label });
        }

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Intentionally empty - completion output is handled elsewhere
        // (e.g., TimerOutputBehavior or SegmentOutputBehavior)
        // Round data is included via HistoryRecordBehavior's history:record event.
        return [];
    }
}
