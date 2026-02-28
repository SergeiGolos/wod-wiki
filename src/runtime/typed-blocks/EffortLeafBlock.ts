import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { LeafBlock } from './LeafBlock';
import { TimerCapability } from './TimerCapability';

export interface EffortLeafBlockConfig {
    /** Exercise name (e.g., "Burpees") */
    exerciseName: string;
    /** Target rep count */
    targetReps: number;
    sourceIds?: number[];
    planFragments?: ICodeFragment[];
}

/**
 * EffortLeafBlock — tracks reps toward a target with user-advance completion.
 *
 * Completes when target reps are met OR user force-advances via next().
 * Has a secondary count-up timer for segment timing.
 *
 * Replaces: EffortBlock + EffortCompletionBehavior + TimerBehavior(up, secondary)
 * Archetype: Effort Leaf
 */
export class EffortLeafBlock extends LeafBlock {
    readonly timer: TimerCapability;
    private _currentReps = 0;
    private readonly _targetReps: number;
    private readonly _exerciseName: string;

    constructor(runtime: IScriptRuntime, config: EffortLeafBlockConfig) {
        super(runtime, {
            blockType: 'Effort',
            label: `${config.targetReps} ${config.exerciseName}`,
            sourceIds: config.sourceIds,
            planFragments: config.planFragments,
        });

        this._targetReps = config.targetReps;
        this._exerciseName = config.exerciseName;

        // Add plan fragments
        this.fragments.add({
            fragmentType: FragmentType.Rep,
            type: 'rep',
            image: String(config.targetReps),
            origin: 'compiler',
            behavior: MetricBehavior.Defined,
            value: config.targetReps,
        });

        this.fragments.add({
            fragmentType: FragmentType.Effort,
            type: 'effort',
            image: config.exerciseName,
            origin: 'compiler',
            behavior: MetricBehavior.Defined,
            value: config.exerciseName,
        });

        // Secondary count-up timer (informational — does not drive completion)
        this.timer = new TimerCapability({
            direction: 'up',
            label: 'Segment Timer',
            role: 'secondary',
        });
    }

    get currentReps(): number {
        return this._currentReps;
    }

    get targetReps(): number {
        return this._targetReps;
    }

    get exerciseName(): string {
        return this._exerciseName;
    }

    get isTargetComplete(): boolean {
        return this._currentReps >= this._targetReps;
    }

    /** Increment rep count by 1 */
    incrementRep(): void {
        if (this._currentReps < this._targetReps) {
            this._currentReps++;
            this.syncRepFragment();
        }
    }

    /** Set rep count directly */
    setReps(count: number): void {
        this._currentReps = Math.min(count, this._targetReps);
        this.syncRepFragment();
    }

    protected onMount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? runtime.clock.now;

        // Start segment timer
        this.timer.openSpan(now);
        this.timer.syncToFragments(this.fragments, now);

        return [];
    }

    protected onNext(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Complete if target met or force-advance
        if (this.isTargetComplete) {
            this.markComplete('target-achieved');
        } else {
            this.markComplete('user-advance');
        }
        return [];
    }

    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? new Date();
        this.timer.closeSpan(now);
        this.timer.syncToFragments(this.fragments, now);
        return [];
    }

    private syncRepFragment(): void {
        const repFragment: ICodeFragment = {
            fragmentType: FragmentType.Rep,
            type: 'rep',
            image: `${this._currentReps}/${this._targetReps}`,
            origin: 'runtime',
            behavior: MetricBehavior.Recorded,
            value: { current: this._currentReps, target: this._targetReps },
        };

        // Add as recorded fragment (don't replace the plan fragment)
        // Remove any previous recorded rep fragment first
        this.fragments.remove(f =>
            f.fragmentType === FragmentType.Rep &&
            f.behavior === MetricBehavior.Recorded
        );
        this.fragments.add(repFragment);
    }
}
