import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { RoundState, TimerState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { calculateElapsed, formatDuration } from '../time/calculateElapsed';

/**
 * RoundOutputBehavior emits round milestone outputs that include both
 * round and timer state.
 * 
 * ## Aspect: Output (Container State Changes)
 * 
 * Emits milestone outputs on mount (initial state) and on each round
 * advance via onNext(). Milestones include:
 * - **Round fragment**: current round / total (always present)
 * - **Timer fragment**: timer direction, duration, elapsed (when timer memory exists)
 * 
 * Including timer state in milestones ensures that timer resets (e.g., EMOM
 * interval restarts) are visible in the output stream (S8).
 * 
 * Mount/unmount completion outputs are NOT emitted here — those are handled
 * by SegmentOutputBehavior.
 */
export class RoundOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit initial round milestone on mount (S4).
        // This announces the starting round state (e.g., "Round 1 of 3")
        // so the output stream has a milestone for the first round,
        // matching subsequent round-advance milestones from onNext.
        const round = ctx.getMemory('round') as RoundState | undefined;

        if (round) {
            this._lastEmittedRound = round.current;
            const label = this.formatRoundLabel(round);
            const fragments = this.buildMilestoneFragments(ctx, round);

            ctx.emitOutput('milestone', fragments, { label });
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;

        // Only emit a milestone when the round actually changed.
        // Without this guard, a milestone fires on every onNext() call
        // (e.g., between child completions within the same round).
        if (round && round.current !== this._lastEmittedRound) {
            this._lastEmittedRound = round.current;
            const label = this.formatRoundLabel(round);
            const fragments = this.buildMilestoneFragments(ctx, round);

            ctx.emitOutput('milestone', fragments, { label });
        }

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Intentionally empty - completion output is handled by SegmentOutputBehavior.
        // Round data is included via HistoryRecordBehavior's history:record event.
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Builds the complete fragment list for a milestone output.
     * 
     * Includes the round fragment (always) and timer fragment (when
     * timer memory exists). Timer fragment captures the current timer
     * state at the moment of the milestone, making timer resets
     * (EMOM interval boundaries) visible in the output stream.
     */
    private buildMilestoneFragments(ctx: IBehaviorContext, round: RoundState): ICodeFragment[] {
        const fragments: ICodeFragment[] = [];

        // Round fragment (always present)
        const roundLabel = this.formatRoundLabel(round);
        fragments.push({
            type: 'count',
            fragmentType: FragmentType.Rounds,
            value: round.current,
            image: roundLabel,
            origin: 'runtime'
        } as ICodeFragment);

        // Timer fragment (S8 — when timer memory exists)
        const timerFragment = this.getTimerFragment(ctx);
        if (timerFragment) {
            fragments.push(timerFragment);
        }

        return fragments;
    }

    /**
     * Reads timer memory and creates a timer fragment for the milestone.
     * 
     * For EMOM/interval patterns, the timer spans are reset each round
     * by TimerCompletionBehavior. The elapsed value in this fragment
     * reflects the fresh interval start (near zero on reset).
     * 
     * For AMRAP patterns, the timer is cumulative and the elapsed value
     * shows total time consumed so far.
     */
    private getTimerFragment(ctx: IBehaviorContext): ICodeFragment | null {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer) return null;

        const now = ctx.clock.now.getTime();
        const elapsed = calculateElapsed(timer, now);

        return {
            type: 'timer',
            fragmentType: FragmentType.Timer,
            value: elapsed,
            image: formatDuration(timer.durationMs ?? elapsed),
            origin: 'runtime',
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        } as ICodeFragment;
    }

    /**
     * Format the round label for display.
     */
    private formatRoundLabel(round: RoundState): string {
        return round.total !== undefined
            ? `Round ${round.current} of ${round.total}`
            : `Round ${round.current}`;
    }
}
