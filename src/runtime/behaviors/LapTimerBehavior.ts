import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { TimeSpan } from '../models/TimeSpan';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { UpdateDisplayStateAction } from '../actions/display/UpdateDisplayStateAction';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';

/**
 * Creates lap timer memory entries for each round.
 * 
 * This behavior allocates TimeSpan[] memory for tracking per-round
 * elapsed time. Each round gets its own lap timer that can be used
 * for display or analytics.
 * 
 * @example
 * ```typescript
 * const behaviors = [
 *   new RoundPerLoopBehavior(),
 *   new LapTimerBehavior(), // Tracks lap time per round
 * ];
 * ```
 */
export class LapTimerBehavior implements IRuntimeBehavior {
    private lastRound: number = 0;
    private lapTimerRefs: TypedMemoryReference<TimeSpan[]>[] = [];

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

    onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();
        if (currentRound > 0) {
            return this.createLapTimer(block, currentRound, clock.now);
        }

        return [];
    }

    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();
        if (currentRound === this.lastRound) return [];

        this.lastRound = currentRound;

        if (currentRound > 0) {
            return this.createLapTimer(block, currentRound, clock.now);
        }

        return [];
    }

    onDispose(_block: IRuntimeBlock): void {
        // Clear refs for cleanup (memory is managed by BlockContext)
        this.lapTimerRefs = [];
    }

    /**
     * Creates a lap timer for the given round.
     */
    private createLapTimer(block: IRuntimeBlock, round: number, now: Date): IRuntimeAction[] {
        const lapTimerMemoryId = `timer:lap:${block.key}:${round}`;
        const startTime = now.getTime();

        const lapTimerRef = block.context.allocate<TimeSpan[]>(
            lapTimerMemoryId,
            [new TimeSpan(startTime)],
            'public'
        );

        this.lapTimerRefs.push(lapTimerRef);

        return [
            new UpdateDisplayStateAction({
                currentLapTimerMemoryId: lapTimerMemoryId
            })
        ];
    }
}
