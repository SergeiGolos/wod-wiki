import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';

// Aspect-based behaviors
import {
    TimerBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior,
    ChildRunnerBehavior,
    DisplayInitBehavior,
    ButtonBehavior,
    HistoryRecordBehavior,
    SegmentOutputBehavior,
    ChildLoopBehavior
} from '../behaviors';
import { WaitingToStartInjectorBehavior } from '../behaviors/WaitingToStartInjectorBehavior';
import { SessionCompletionBehavior } from '../behaviors/SessionCompletionBehavior';

/**
 * Configuration for the session root block.
 */
export interface SessionRootConfig {
    /** Session label (e.g., "Morning WOD") */
    label?: string;
    /** Child statement ID groups to execute */
    childGroups: number[][];
    /** Total rounds for the workout (default: 1) */
    totalRounds?: number;
}

/**
 * SessionRootBlock is the top-level container for a workout session.
 *
 * ## Lifecycle
 *
 * 1. Mount: Emits 'segment' output with session label, starts elapsed timer,
 *    pushes WaitingToStart block as first child (index 0)
 * 2. First next(): WaitingToStart pops → ChildRunner pushes first workout block
 * 3. Subsequent next(): ChildRunner pushes remaining workout blocks in sequence
 * 4. Final next(): All children done → marks complete and pops
 * 5. Unmount: Emits 'completion' output, records history
 *
 * ## Behavior Chain Order
 *
 * - SegmentOutputBehavior (output on mount/unmount)
 * - TimerBehavior (elapsed workout timer)
 * - RoundInitBehavior (if multi-round)
 * - RoundAdvanceBehavior (if multi-round)
 * - RoundCompletionBehavior (if multi-round)
 * - RoundDisplayBehavior (if multi-round)
 * - ChildLoopBehavior (if multi-round)
 * - WaitingToStartInjectorBehavior (pushes WaitingToStart gate on mount)
 * - ChildRunnerBehavior (pushes children in sequence, skipOnMount)
 * - SessionCompletionBehavior (if single-round, pops when children done)
 * - DisplayInitBehavior
 * - ButtonBehavior
 * - HistoryRecordBehavior (records session on unmount)
 */
export class SessionRootBlock extends RuntimeBlock {
    constructor(
        runtime: IScriptRuntime,
        config: SessionRootConfig
    ) {
        const sessionLabel = config.label ?? 'Session';
        const blockKey = new BlockKey('session-root');
        const context = new BlockContext(runtime, blockKey.toString(), 'Session');
        const sourceIds = config.childGroups.flat();
        const behaviors = SessionRootBlock.buildBehaviors(config, runtime);

        super(
            runtime,
            sourceIds,
            behaviors,
            context,
            blockKey,
            'SessionRoot',
            sessionLabel
        );
    }

    /**
     * Builds the behavior list for a session root block.
     * @param config Session configuration
     * @param runtime Script runtime (needed for WaitingToStartInjectorBehavior)
     */
    static buildBehaviors(config: SessionRootConfig, runtime: IScriptRuntime): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const totalRounds = config.totalRounds ?? 1;
        const sessionLabel = config.label ?? 'Session';

        // =====================================================================
        // Output Aspect - Segment tracking
        // =====================================================================
        behaviors.push(new SegmentOutputBehavior({ label: sessionLabel }));

        // =====================================================================
        // Time Aspect - Track total session elapsed time
        // =====================================================================
        behaviors.push(new TimerBehavior({
            direction: 'up',
            label: sessionLabel,
            role: 'auto'
        }));

        // =====================================================================
        // Iteration Aspect - If multi-round workout
        // =====================================================================
        if (totalRounds > 1) {
            behaviors.push(new RoundInitBehavior({
                totalRounds,
                startRound: 1
            }));
            behaviors.push(new RoundAdvanceBehavior());
            behaviors.push(new RoundCompletionBehavior());
            behaviors.push(new RoundDisplayBehavior());
            behaviors.push(new ChildLoopBehavior({
                childGroups: config.childGroups
            }));
        }

        // =====================================================================
        // Gate Aspect - WaitingToStart idle gate
        // Pushes a WaitingToStartBlock on mount. User must click "Start"
        // before ChildRunnerBehavior begins pushing workout children.
        // =====================================================================
        behaviors.push(new WaitingToStartInjectorBehavior(runtime));

        // =====================================================================
        // Children Aspect - Execute child blocks
        // skipOnMount: true because WaitingToStartInjectorBehavior handles
        // the first mount push. ChildRunner begins on the first onNext()
        // (triggered when WaitingToStart pops).
        // =====================================================================
        const childRunner = new ChildRunnerBehavior({
            childGroups: config.childGroups,
            skipOnMount: true
        });
        behaviors.push(childRunner);

        // =====================================================================
        // Completion Aspect - Auto-pop when all children done (single-round)
        // For multi-round, RoundCompletionBehavior handles this instead.
        // =====================================================================
        if (totalRounds <= 1) {
            behaviors.push(new SessionCompletionBehavior(childRunner));
        }

        // =====================================================================
        // Display Aspect
        // =====================================================================
        behaviors.push(new DisplayInitBehavior({
            mode: 'clock',
            label: sessionLabel
        }));

        // =====================================================================
        // Controls Aspect - Session control buttons
        // =====================================================================
        behaviors.push(new ButtonBehavior({
            buttons: [
                {
                    id: 'pause',
                    label: 'Pause',
                    variant: 'secondary' as const,
                    visible: true,
                    enabled: true,
                    eventName: 'timer:pause'
                },
                {
                    id: 'next',
                    label: 'Next',
                    variant: 'primary' as const,
                    visible: true,
                    enabled: true,
                    eventName: 'next'
                },
                {
                    id: 'stop',
                    label: 'Stop',
                    variant: 'danger' as const,
                    visible: true,
                    enabled: true,
                    eventName: 'workout:stop'
                }
            ]
        }));

        // =====================================================================
        // Output Aspect - Record session history
        // =====================================================================
        behaviors.push(new HistoryRecordBehavior());

        return behaviors;
    }

    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.mount(runtime, options);
    }

    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return super.unmount(runtime, options);
    }

    dispose(runtime: IScriptRuntime): void {
        super.dispose(runtime);
        if (this.context) {
            this.context.release();
        }
    }
}
