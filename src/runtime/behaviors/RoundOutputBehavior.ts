import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * RoundOutputBehavior emits round-specific output statements.
 * 
 * ## Aspect: Output (Rounds)
 * 
 * Emits milestone outputs when rounds advance.
 */
export class RoundOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;

        if (round) {
            const label = round.total !== undefined
                ? `Round ${round.current} of ${round.total}`
                : `Round ${round.current}`;

            ctx.emitOutput('segment', [
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

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;

        if (round) {
            const completedRounds = round.current - 1; // Current is already advanced past
            const label = round.total !== undefined
                ? `Completed ${Math.min(completedRounds, round.total)} of ${round.total} rounds`
                : `Completed ${completedRounds} rounds`;

            ctx.emitOutput('completion', [
                {
                    type: 'count',
                    fragmentType: FragmentType.Rounds,
                    value: completedRounds,
                    image: label,
                    origin: 'runtime'
                } as ICodeFragment
            ], { label });
        }

        return [];
    }
}
