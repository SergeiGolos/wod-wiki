import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';
import { IdleConfig } from '../../behaviors/IdleInjectionBehavior';

// Aspect-based behaviors
import {
    TimerInitBehavior,
    TimerTickBehavior,
    TimerPauseBehavior,
    RoundInitBehavior,
    RoundAdvanceBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior,
    ChildRunnerBehavior,
    DisplayInitBehavior,
    ControlsInitBehavior,
    HistoryRecordBehavior
} from '../../behaviors';

/**
 * Configuration for the root workout block.
 */
export interface WorkoutRootConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
    /** Total rounds for the workout (default: 1) */
    totalRounds?: number;
    /** Start idle configuration */
    startIdle?: IdleConfig;
    /** End idle configuration */
    endIdle?: IdleConfig;
    /** Custom buttons for execution phase (uses defaults if not provided) */
    executionButtons?: RuntimeButton[];
}

/**
 * Default idle configurations
 */
const DEFAULT_START_IDLE: IdleConfig = {
    id: 'idle-start',
    label: 'Ready',
    popOnNext: true,
    popOnEvents: [],
    buttonLabel: 'Start Workout',
    buttonAction: 'timer:start'
};

const DEFAULT_END_IDLE: IdleConfig = {
    id: 'idle-end',
    label: 'Cooldown, checkout the Analytics',
    popOnNext: false,
    popOnEvents: ['stop', 'view-results'],
    buttonLabel: 'View Analytics',
    buttonAction: 'view:analytics'
};

/**
 * WorkoutRootStrategy - Composes behaviors for the root workout block.
 * 
 * Uses aspect-based behaviors:
 * - Time: TimerInit (elapsed workout time), TimerTick, TimerPause
 * - Iteration: RoundInit, RoundAdvance, RoundCompletion (if multi-round)
 * - Children: ChildRunner to execute child blocks
 * - Display: DisplayInit, RoundDisplay
 * - Controls: ControlsInit for workout controls
 * - Output: HistoryRecord for workout logging
 */
export class WorkoutRootStrategy implements IRuntimeBlockStrategy {
    priority = 100;

    /**
     * Root blocks are not matched from statements - they are created directly.
     */
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return false;
    }

    /**
     * Composable apply - not used for root blocks.
     */
    apply(_builder: unknown, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // No-op for direct build
    }

    /**
     * Builds a root workout block with the specified configuration.
     */
    build(runtime: IScriptRuntime, config: WorkoutRootConfig): IRuntimeBlock {
        const behaviors = this.buildBehaviors(config);
        const blockKey = new BlockKey('root');
        const context = new BlockContext(runtime, blockKey.toString(), 'Workout');

        // Flatten childGroups for sourceIds
        const sourceIds = config.childGroups.flat();

        return new RuntimeBlock(
            runtime,
            sourceIds,
            behaviors,
            context,
            blockKey,
            'Root',
            'Workout'
        );
    }

    /**
     * Builds the behavior list for a root workout block.
     */
    buildBehaviors(config: WorkoutRootConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const totalRounds = config.totalRounds ?? 1;

        // =====================================================================
        // Time Aspect - Track total workout elapsed time
        // =====================================================================
        behaviors.push(new TimerInitBehavior({
            direction: 'up',
            label: 'Workout',
            role: 'primary'
        }));
        behaviors.push(new TimerTickBehavior());
        behaviors.push(new TimerPauseBehavior());

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
        }

        // =====================================================================
        // Children Aspect - Execute child blocks
        // =====================================================================
        behaviors.push(new ChildRunnerBehavior({
            childGroups: config.childGroups
        }));

        // =====================================================================
        // Display Aspect
        // =====================================================================
        behaviors.push(new DisplayInitBehavior({
            mode: 'clock',
            label: 'Workout'
        }));

        // =====================================================================
        // Controls Aspect - Workout control buttons
        // =====================================================================
        const buttons = config.executionButtons ?? [
            { id: 'pause', label: 'Pause', action: 'timer:pause' },
            { id: 'next', label: 'Next', action: 'block:next' },
            { id: 'stop', label: 'Stop', action: 'workout:stop' }
        ];

        behaviors.push(new ControlsInitBehavior({
            buttons: buttons.map(btn => ({
                id: btn.id,
                label: btn.label ?? btn.id,
                variant: btn.id === 'stop' ? 'danger' as const : (btn.id === 'next' ? 'primary' as const : 'secondary' as const),
                visible: true,
                enabled: true,
                eventName: btn.action
            }))
        }));

        // =====================================================================
        // Output Aspect - Record workout history
        // =====================================================================
        behaviors.push(new HistoryRecordBehavior());

        return behaviors;
    }

    /**
     * Gets the default start idle configuration.
     */
    static getDefaultStartIdle(): IdleConfig {
        return { ...DEFAULT_START_IDLE };
    }

    /**
     * Gets the default end idle configuration.
     */
    static getDefaultEndIdle(): IdleConfig {
        return { ...DEFAULT_END_IDLE };
    }
}

/**
 * Default instance for convenience.
 */
export const workoutRootStrategy = new WorkoutRootStrategy();
