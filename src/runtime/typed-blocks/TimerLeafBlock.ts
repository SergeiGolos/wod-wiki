import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { LeafBlock } from './LeafBlock';
import { TimerCapability } from './TimerCapability';

export interface TimerLeafBlockConfig {
    /** Duration in milliseconds */
    durationMs: number;
    /** Timer label (e.g., "Rest", "Run") */
    label?: string;
    sourceIds?: number[];
    planFragments?: ICodeFragment[];
    /** Whether user can skip with next() (default: false for rest, true for exercises) */
    allowSkip?: boolean;
}

/**
 * TimerLeafBlock — auto-completing countdown timer.
 *
 * Counts down from a configured duration. Auto-pops when timer expires.
 * User cannot skip by default (configurable via allowSkip).
 *
 * Replaces: RestBlock + TimerBehavior + TimerEndingBehavior + LeafExitBehavior
 * Archetype: Timer Leaf
 */
export class TimerLeafBlock extends LeafBlock {
    readonly timer: TimerCapability;
    private readonly _allowSkip: boolean;

    constructor(runtime: IScriptRuntime, config: TimerLeafBlockConfig) {
        super(runtime, {
            blockType: 'TimerLeaf',
            label: config.label ?? 'Timer',
            sourceIds: config.sourceIds,
            planFragments: config.planFragments,
        });

        this._allowSkip = config.allowSkip ?? false;

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
            label: config.label ?? 'Timer',
            role: 'primary',
        });
    }

    protected onMount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? runtime.clock.now;

        // Start the countdown
        this.timer.openSpan(now);
        this.timer.syncToFragments(this.fragments, now);

        // Subscribe to tick events to check timer expiry
        this.registerHandler(runtime, 'tick', (_event, rt) => {
            return this.onTick(rt);
        }, 'bubble');

        // Subscribe to pause/resume
        this.registerHandler(runtime, 'timer:pause', (_event, _rt) => {
            this.timer.pause(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        this.registerHandler(runtime, 'timer:resume', (_event, _rt) => {
            this.timer.resume(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        return [];
    }

    protected onNext(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (this._allowSkip) {
            this.markComplete('user-advance');
            return [];
        }
        // Ignore next() if skip is not allowed (timer controls completion)
        if (this.isComplete) return [];
        return [];
    }

    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Close any open span
        const now = this._clock?.now ?? new Date();
        this.timer.closeSpan(now);
        this.timer.syncToFragments(this.fragments, now);
        return [];
    }

    private onTick(runtime: IScriptRuntime): IRuntimeAction[] {
        const now = runtime.clock.now;

        // Sync timer state to fragments
        this.timer.syncToFragments(this.fragments, now);

        // Check expiry
        if (!this.isComplete && this.timer.isExpired(now)) {
            this.markComplete('timer-expired');
            return [];
        }

        return [];
    }
}

/** Format milliseconds as mm:ss */
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
