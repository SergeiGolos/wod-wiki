import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { ContainerBlock } from './ContainerBlock';
import { TimerCapability } from './TimerCapability';
import { ClearChildrenAction } from '../actions/stack/ClearChildrenAction';

export interface AmrapBlockConfig {
    /** Countdown duration in milliseconds */
    durationMs: number;
    label?: string;
    sourceIds?: number[];
    childGroups: number[][];
    planFragments?: ICodeFragment[];
}

/**
 * AmrapBlock — timer-terminated unbounded-round container.
 *
 * Children loop as many times as possible until the countdown timer
 * expires. The timer controls completion, not the round count.
 * Round count is tracked but unbounded.
 *
 * Replaces: AmrapLogicStrategy + TimerBehavior(down) + TimerEndingBehavior(complete-block)
 *           + ReEntryBehavior(unbounded) + ChildSelectionBehavior(timer-active)
 * Archetype: AMRAP
 */
export class AmrapBlock extends ContainerBlock {
    readonly timer: TimerCapability;

    constructor(runtime: IScriptRuntime, config: AmrapBlockConfig) {
        super(runtime, {
            blockType: 'AMRAP',
            label: config.label ?? `${formatDuration(config.durationMs)} AMRAP`,
            sourceIds: config.sourceIds,
            childGroups: config.childGroups,
            loopCondition: 'timer-active',
            totalRounds: undefined, // unbounded
            planFragments: config.planFragments,
        });

        // Add duration plan fragment
        this.fragments.add({
            fragmentType: FragmentType.Duration,
            type: 'duration',
            image: formatDuration(config.durationMs),
            origin: 'compiler',
            behavior: MetricBehavior.Defined,
            value: config.durationMs,
        });

        this.timer = new TimerCapability({
            direction: 'down',
            durationMs: config.durationMs,
            label: config.label ?? 'AMRAP',
            role: 'primary',
        });
    }

    /** Override: timer-active means "timer not expired" */
    protected shouldLoop(): boolean {
        const now = this._clock?.now ?? new Date();
        return !this.timer.isExpired(now);
    }

    protected onContainerMount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? runtime.clock.now;

        // Start the countdown
        this.timer.openSpan(now);
        this.timer.syncToFragments(this.fragments, now);

        // Subscribe to tick events for timer expiry check
        this.registerHandler(runtime, 'tick', (_event, rt) => {
            return this.onTick(rt);
        }, 'bubble');

        // Pause/resume support
        this.registerHandler(runtime, 'timer:pause', () => {
            this.timer.pause(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        this.registerHandler(runtime, 'timer:resume', () => {
            this.timer.resume(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        return [];
    }

    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? new Date();
        this.timer.closeSpan(now);
        this.timer.syncToFragments(this.fragments, now);
        return [];
    }

    private onTick(runtime: IScriptRuntime): IRuntimeAction[] {
        const now = runtime.clock.now;

        // Sync timer state
        this.timer.syncToFragments(this.fragments, now);

        // Check expiry
        if (!this.isComplete && this.timer.isExpired(now)) {
            this.markComplete('timer-expired');
            // Clear any active children from the stack
            return [new ClearChildrenAction(this.key.toString())];
        }

        return [];
    }
}

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
