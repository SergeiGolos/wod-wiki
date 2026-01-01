import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { RoundPerNextBehavior } from './RoundPerNextBehavior';
import { MemoryTypeEnum } from '../models/MemoryTypeEnum';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEvent } from '../contracts/events/IEvent';

/**
 * Action that updates a memory reference found by search.
 */
class UpdateMetricRepsAction implements IRuntimeAction {
    readonly type = 'update-metric-reps';
    constructor(private readonly ownerId: string, private readonly value: number) { }

    do(runtime: IScriptRuntime): void {
        const refs = runtime.memory.search({
            type: MemoryTypeEnum.METRIC_REPS,
            ownerId: this.ownerId,
            id: null,
            visibility: 'inherited'
        });
        if (refs.length > 0) {
            const ref = refs[0] as TypedMemoryReference<number>;
            runtime.memory.set(ref, this.value);
        }
    }
}

/**
 * RepSchemeBehavior.
 * Updates the 'reps' metric in memory when the round changes.
 * Used for rep schemes like 21-15-9.
 */
export class RepSchemeBehavior implements IRuntimeBehavior {
    private lastRound: number = -1;

    constructor(private readonly repScheme: number[]) { }

    onPush(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        this.lastRound = this.getRound(block);
        return this.updateReps(block, this.lastRound);
    }

    onNext(block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const currentRound = this.getRound(block);
        if (currentRound !== this.lastRound) {
            this.lastRound = currentRound;
            return this.updateReps(block, currentRound);
        }
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onEvent(_event: IEvent, _block: IRuntimeBlock): IRuntimeAction[] {
        return [];
    }

    onDispose(_block: IRuntimeBlock): void {
        // No-op
    }

    private getRound(block: IRuntimeBlock): number {
        const loop = block.getBehavior(RoundPerLoopBehavior);
        if (loop) return loop.getRound();

        const next = block.getBehavior(RoundPerNextBehavior);
        if (next) return next.getRound();

        return 1;
    }

    private updateReps(block: IRuntimeBlock, round: number): IRuntimeAction[] {
        // Round is 1-based.
        const schemeIndex = (round - 1) % this.repScheme.length;
        const currentReps = this.repScheme[schemeIndex];

        return [new UpdateMetricRepsAction(block.key.toString(), currentReps)];
    }
}
