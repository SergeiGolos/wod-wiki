import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { ContainerBlock } from './ContainerBlock';
import { TimerCapability } from './TimerCapability';

export interface SequentialContainerBlockConfig {
    label?: string;
    sourceIds?: number[];
    childGroups: number[][];
    planFragments?: ICodeFragment[];
}

/**
 * SequentialContainerBlock — iterates children once, then completes.
 *
 * Children are compiled and pushed one at a time. When the last child
 * pops, the container pops. Has a count-up timer for total elapsed time.
 *
 * Replaces: GenericGroupStrategy composition
 * Archetype: Sequential Container
 */
export class SequentialContainerBlock extends ContainerBlock {
    readonly timer: TimerCapability;

    constructor(runtime: IScriptRuntime, config: SequentialContainerBlockConfig) {
        super(runtime, {
            blockType: 'Group',
            label: config.label ?? 'Group',
            sourceIds: config.sourceIds,
            childGroups: config.childGroups,
            loopCondition: 'never',
            totalRounds: 1,
            planFragments: config.planFragments,
        });

        // Informational count-up timer
        this.timer = new TimerCapability({
            direction: 'up',
            label: config.label ?? 'Group',
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
