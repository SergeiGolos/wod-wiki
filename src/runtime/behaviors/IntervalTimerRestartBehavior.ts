import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { TimerBehavior } from './TimerBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';

/**
 * Restarts the timer when a new round begins.
 * 
 * Used for EMOM (Every Minute On the Minute) workouts where each
 * interval starts with a fresh timer. This behavior detects round
 * transitions and restarts the block's TimerBehavior.
 * 
 * @example
 * ```typescript
 * const behaviors = [
 *   new BoundTimerBehavior(60000, 'down'), // 1 minute intervals
 *   new RoundPerNextBehavior(),
 *   new IntervalTimerRestartBehavior(), // Restart timer each round
 * ];
 * ```
 */
export class IntervalTimerRestartBehavior implements IRuntimeBehavior {
    private lastRound: number = 0;

    /**
     * Finds a behavior implementing IRoundSource on the block.
     * Checks known implementations: RoundPerLoopBehavior and RoundPerNextBehavior.
     */
    private findRoundSource(block: IRuntimeBlock): { getRound(): number } | undefined {
        const loopBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (loopBehavior) return loopBehavior;

        const nextBehavior = block.getBehavior(RoundPerNextBehavior);
        if (nextBehavior) return nextBehavior;

        return undefined;
    }

    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();
        if (currentRound === this.lastRound) return [];

        // Get the timer behavior and restart it
        const timerBehavior = block.getBehavior(TimerBehavior);
        if (timerBehavior) {
            timerBehavior.restart(clock.now);
        }

        this.lastRound = currentRound;
        return [];
    }
}
