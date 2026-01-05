import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';
import { TimeSpan } from '../models/TimeSpan';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';

/**
 * Creates RuntimeSpan records for each round (for history/analytics).
 * 
 * This behavior tracks round transitions and manages span lifecycle:
 * - Opens a new span when a new round starts
 * - Closes the previous span when transitioning to a new round
 * - Closes the final span when the block is popped
 * 
 * @example
 * ```typescript
 * const behaviors = [
 *   new RoundPerLoopBehavior(),
 *   new RoundSpanBehavior('rounds'), // or 'interval' for EMOM
 * ];
 * ```
 */
export class RoundSpanBehavior implements IRuntimeBehavior {
    private lastRound: number = 0;

    /**
     * Creates a new RoundSpanBehavior.
     * @param spanType Type of span to create ('rounds' for standard, 'interval' for EMOM)
     * @param repScheme Optional rep scheme for attaching reps to span metadata
     * @param totalRounds Optional total rounds for metadata
     */
    constructor(
        private readonly spanType: 'rounds' | 'interval' = 'rounds',
        private readonly repScheme?: number[],
        private readonly totalRounds?: number
    ) { }

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
            this.createRoundSpan(block, currentRound, clock.now);
            this.lastRound = currentRound;
        }

        return [];
    }

    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const roundSource = this.findRoundSource(block);
        if (!roundSource) return [];

        const currentRound = roundSource.getRound();
        if (currentRound === this.lastRound) return [];

        // Close previous round span
        if (this.lastRound > 0) {
            this.closeRoundSpan(block, this.lastRound, clock.now);
        }

        // Open new round span (only if not past totalRounds)
        if (currentRound > 0 && (!this.totalRounds || currentRound <= this.totalRounds)) {
            this.createRoundSpan(block, currentRound, clock.now);
        }

        this.lastRound = currentRound;
        return [];
    }

    onPop(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        // Close final round span
        if (this.lastRound > 0) {
            this.closeRoundSpan(block, this.lastRound, clock.now);
        }
        return [];
    }

    /**
     * Creates a new RuntimeSpan for the given round.
     */
    private createRoundSpan(block: IRuntimeBlock, round: number, now: Date): void {
        const blockId = block.key.toString();
        const ownerId = `${blockId}-round-${round}`;
        const startTime = now.getTime();

        const label = this.spanType === 'interval'
            ? `Interval ${round}`
            : `Round ${round}`;

        // Build fragments array
        const fragments: any[] = [{
            type: this.spanType,
            fragmentType: 'rounds',
            value: round,
            image: label
        }];

        // Add rep scheme info if available
        if (this.repScheme && this.repScheme.length > 0) {
            const schemeIndex = (round - 1) % this.repScheme.length;
            const targetReps = this.repScheme[schemeIndex];
            fragments.push({
                type: 'reps',
                fragmentType: 'reps',
                value: targetReps,
                image: `${targetReps}`
            });
        }

        const span = new RuntimeSpan(
            ownerId,
            [...block.sourceIds],
            [new TimeSpan(startTime)],
            [fragments],
            undefined,
            {
                tags: [this.spanType],
                context: { round, totalRounds: this.totalRounds },
                logs: []
            },
            blockId
        );

        // Allocate in block context
        block.context.allocate(RUNTIME_SPAN_TYPE, span, 'public');
    }

    /**
     * Closes the RuntimeSpan for the given round.
     */
    private closeRoundSpan(block: IRuntimeBlock, round: number, now: Date): void {
        const blockId = block.key.toString();
        const ownerId = `${blockId}-round-${round}`;

        const spans = block.context.getAll<RuntimeSpan>(RUNTIME_SPAN_TYPE);
        const spanRef = spans.find(r => r.ownerId === ownerId);

        if (spanRef) {
            const span = spanRef.get();
            if (span && span.isActive()) {
                const lastTimer = span.spans[span.spans.length - 1];
                if (lastTimer) {
                    lastTimer.ended = now.getTime();
                }
                block.context.set(spanRef, span);
            }
        }
    }
}
