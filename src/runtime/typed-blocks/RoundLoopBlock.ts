import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { ContainerBlock } from './ContainerBlock';
import { TimerCapability } from './TimerCapability';

export interface RoundLoopBlockConfig {
    label?: string;
    sourceIds?: number[];
    childGroups: number[][];
    totalRounds: number;
    startRound?: number;
    planFragments?: ICodeFragment[];
}

/**
 * RoundLoopBlock — iterates children N times (rounds), then completes.
 *
 * After all children execute, the cursor resets, the round counter
 * advances, and children run again. Completes when all rounds are done.
 *
 * Replaces: GenericLoopStrategy composition
 * Archetype: Round-Looping Container
 */
export class RoundLoopBlock extends ContainerBlock {
    readonly timer: TimerCapability;

    constructor(runtime: IScriptRuntime, config: RoundLoopBlockConfig) {
        super(runtime, {
            blockType: 'Rounds',
            label: config.label ?? `${config.totalRounds} Rounds`,
            sourceIds: config.sourceIds,
            childGroups: config.childGroups,
            loopCondition: 'rounds-remaining',
            totalRounds: config.totalRounds,
            startRound: config.startRound,
            planFragments: config.planFragments,
        });

        // Informational count-up timer
        this.timer = new TimerCapability({
            direction: 'up',
            label: config.label ?? `${config.totalRounds} Rounds`,
            role: 'auto',
        });
    }

    protected onContainerMount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? runtime.clock.now;
        this.timer.openSpan(now);
        this.timer.syncToFragments(this.fragments, now);
        return [];
    }

    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? new Date();
        this.timer.closeSpan(now);
        this.timer.syncToFragments(this.fragments, now);
        return [];
    }
}
