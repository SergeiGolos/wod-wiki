import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { ContainerBlock } from './ContainerBlock';
import { TimerCapability } from './TimerCapability';
import { GateBlock } from './GateBlock';
import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { OutputStatement } from '../../core/models/OutputStatement';
import { TimeSpan } from '../models/TimeSpan';

export interface WorkoutRootBlockConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
    /** Display label (default: 'Workout') */
    label?: string;
    /** Total rounds (default: 1, >1 enables looping) */
    totalRounds?: number;
    /** Whether to push a WaitingToStart gate before dispatching children */
    showGate?: boolean;
    /** Custom gate label */
    gateLabel?: string;
    /** Custom gate button label */
    gateButtonLabel?: string;
}

/**
 * WorkoutRootBlock — top-level container for a workout or session.
 *
 * Unified typed block replacing:
 * - WorkoutRootStrategy + BlockBuilder composition
 * - SessionRootBlock + SessionRootStrategy
 *
 * Features:
 * - Countup timer tracking total elapsed time
 * - Sequential child dispatch via ContainerBlock
 * - Optional multi-round (looping)
 * - Optional WaitingToStart gate (for session mode)
 * - Button action fragments for UI controls
 */
export class WorkoutRootBlock extends ContainerBlock {
    readonly timer: TimerCapability;
    private readonly _showGate: boolean;
    private readonly _gateLabel: string;
    private readonly _gateButtonLabel: string;

    constructor(runtime: IScriptRuntime, config: WorkoutRootBlockConfig) {
        const totalRounds = config.totalRounds ?? 1;
        const label = config.label ?? 'Workout';

        super(runtime, {
            blockType: config.showGate ? 'SessionRoot' : 'Root',
            label,
            sourceIds: [],
            childGroups: config.childGroups,
            loopCondition: totalRounds > 1 ? 'rounds-remaining' : 'never',
            totalRounds: totalRounds > 1 ? totalRounds : undefined,
            startRound: 1,
            // Skip first child on mount if showing gate
            // (gate pops → next() → first child dispatch)
            skipFirstChild: config.showGate ?? false,
        });

        this._showGate = config.showGate ?? false;
        this._gateLabel = config.gateLabel ?? 'Ready';
        this._gateButtonLabel = config.gateButtonLabel ?? 'Start Workout';

        // Countup timer for total elapsed time
        this.timer = new TimerCapability({
            direction: 'up',
            label,
            role: 'primary',
        });

        // Button action fragments
        this.addButtonFragments();
    }

    private addButtonFragments(): void {
        const buttons = [
            { id: 'pause', label: 'Pause', eventName: 'timer:pause', variant: 'secondary' },
            { id: 'next', label: 'Next', eventName: 'next', variant: 'primary' },
            { id: 'stop', label: 'Stop', eventName: 'workout:stop', variant: 'danger' },
        ];

        for (const btn of buttons) {
            this.fragments.add({
                fragmentType: FragmentType.Action,
                type: 'action',
                image: btn.label,
                origin: 'compiler',
                behavior: MetricBehavior.Defined,
                value: {
                    id: btn.id,
                    label: btn.label,
                    eventName: btn.eventName,
                    variant: btn.variant,
                    visible: true,
                    enabled: true,
                },
            });
        }
    }

    // ========================================================================
    // Lifecycle
    // ========================================================================

    protected onContainerMount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? runtime.clock.now;
        const actions: IRuntimeAction[] = [];

        // Start elapsed timer
        this.timer.openSpan(now);
        this.timer.syncToFragments(this.fragments, now);

        // Subscribe to tick events
        this.registerHandler(runtime, 'tick', (_event, rt) => {
            const tickNow = rt.clock.now;
            this.timer.syncToFragments(this.fragments, tickNow);
            return [];
        }, 'bubble');

        // Pause/resume
        this.registerHandler(runtime, 'timer:pause', () => {
            this.timer.pause(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        this.registerHandler(runtime, 'timer:resume', () => {
            this.timer.resume(this._clock?.now ?? new Date());
            return [];
        }, 'bubble');

        // Emit segment output
        this.emitSegmentOutput(runtime, 'mount');

        // Push gate if configured
        if (this._showGate) {
            const gate = new GateBlock(runtime, {
                label: this._gateLabel,
                buttons: [
                    { id: 'start', label: this._gateButtonLabel, eventName: 'next' },
                ],
            });
            actions.push(new PushBlockAction(gate));
        }

        return actions;
    }

    protected onUnmount(runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = this._clock?.now ?? new Date();
        this.timer.closeSpan(now);
        this.timer.syncToFragments(this.fragments, now);

        // Emit completion output
        this.emitSegmentOutput(runtime, 'unmount');

        return [];
    }

    // ========================================================================
    // Output Helpers
    // ========================================================================

    private emitSegmentOutput(runtime: IScriptRuntime, event: string): void {
        const now = this._clock?.now ?? new Date();
        const fragment: ICodeFragment = {
            fragmentType: FragmentType.Segment,
            type: 'segment',
            image: `${this.label}: ${event}`,
            origin: 'runtime',
            behavior: MetricBehavior.Recorded,
            value: { event, label: this.label },
            timestamp: now,
        };

        runtime.addOutput(new OutputStatement({
            outputType: event === 'unmount' ? 'completion' : 'segment',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: this.key.toString(),
            stackLevel: runtime.stack.count,
            fragments: [fragment],
        }));
    }
}
