import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { SetRoundsDisplayAction } from '../actions/display/WorkoutStateActions';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';

/**
 * Updates the round display when rounds change.
 * 
 * This behavior emits SetRoundsDisplayAction to update the UI with
 * current round information. It depends on an IRoundSource behavior
 * (like RoundPerLoopBehavior or RoundPerNextBehavior) being present
 * on the same block.
 * 
 * @example
 * ```typescript
 * const behaviors = [
 *   new RoundPerLoopBehavior(),
 *   new RoundDisplayBehavior(5), // 5 total rounds
 * ];
 * ```
 */
export class RoundDisplayBehavior implements IRuntimeBehavior {
    readonly priority = 1300; // Post-execution: display
    private lastEmittedRound: number = 0;

    /**
     * Creates a new RoundDisplayBehavior.
     * @param totalRounds Optional total number of rounds (for display like "2 of 5")
     */
    constructor(private readonly totalRounds?: number) { }

    /**
     * Finds a behavior implementing IRoundSource on the block.
     * Checks known implementations: RoundPerLoopBehavior and RoundPerNextBehavior.
     */
    private findRoundSource(block: IRuntimeBlock): { getRound(): number } | undefined {
        // Check for RoundPerLoopBehavior first (most common)
        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior;

        // Check for RoundPerNextBehavior (used in EMOM)
        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior;

        return undefined;
    }

    onPush(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();
        this.lastEmittedRound = currentRound;

        if (this.totalRounds !== undefined) {
            return [new SetRoundsDisplayAction(currentRound, this.totalRounds)];
        }

        return [new SetRoundsDisplayAction(currentRound)];
    }

    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();

        // Only emit if round actually changed
        if (currentRound === this.lastEmittedRound) {
            return [];
        }

        this.lastEmittedRound = currentRound;

        if (this.totalRounds !== undefined) {
            return [new SetRoundsDisplayAction(currentRound, this.totalRounds)];
        }

        return [new SetRoundsDisplayAction(currentRound)];
    }
}

