import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';
import { RoundState, TimerState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { calculateElapsed } from '../time/calculateElapsed';
import { ElapsedFragment } from '../compiler/fragments/ElapsedFragment';
import { SpansFragment } from '../compiler/fragments/SpansFragment';

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
 * 
 * ## Deduplication
 * 
 * For container blocks with children, milestones only emit when
 * `ChildRunnerBehavior.allChildrenCompleted` is true — i.e., at round
 * boundaries, not on intermediate child completions. This mirrors the
 * same guard used by `RoundAdvanceBehavior`.
 */
export class RoundOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Restore: Emit initial round milestone on mount.
        // This ensures Round 1 milestone appears as a "header" for the first round.
        const round = ctx.getMemory('round') as RoundState | undefined;

        if (round) {
            const label = this.formatRoundLabel(round);
            const fragments = this.buildMilestoneFragments(ctx, round);
            ctx.emitOutput('milestone', fragments, { label });
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

        const block = ctx.block as IRuntimeBlock;
        if (typeof block.getBehavior === 'function') {
            const childRunner = block.getBehavior(ChildRunnerBehavior);

            if (childRunner) {
                // For container blocks, only emit milestones as "headers" for the next round
                // after all current children have finished.
                if (!childRunner.allChildrenCompleted) {
                    return [];
                }
            }

            // Check for "ghost" milestones: if RoundAdvance has pushed round.current
            // beyond totalRounds, don't emit a milestone for a round that won't happen.
            if (round.total !== undefined && round.current > round.total) {
                return [];
            }
        }

        const label = this.formatRoundLabel(round);
        const fragments = this.buildMilestoneFragments(ctx, round);
        ctx.emitOutput('milestone', fragments, { label });

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

        // Timer fragments (S8 — when timer memory exists)
        const timerFragments = this.getTimerFragments(ctx);
        fragments.push(...timerFragments);

        return fragments;
    }

    /**
     * Reads timer memory and creates time fragments for the milestone.
     * 
     * For EMOM/interval patterns, the timer spans are reset each round
     * by TimerCompletionBehavior. The elapsed value in these fragments
     * reflects the fresh interval start (near zero on reset).
     * 
     * For AMRAP patterns, the timer is cumulative and the elapsed value
     * shows total time consumed so far.
     */
    private getTimerFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer) return [];

        const now = ctx.clock.now.getTime();
        const blockKey = ctx.block.key.toString();
        const clockNow = ctx.clock.now;
        const elapsed = calculateElapsed(timer, now);

        const fragments: ICodeFragment[] = [];

        // Elapsed time fragment
        fragments.push(new ElapsedFragment(elapsed, blockKey, clockNow));

        // Spans fragment (snapshot of current timer spans)
        if (timer.spans.length > 0) {
            fragments.push(new SpansFragment([...timer.spans], blockKey, clockNow));
        }

        return fragments;
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
