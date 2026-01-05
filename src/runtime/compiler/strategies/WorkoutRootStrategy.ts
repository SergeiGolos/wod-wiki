import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';

// Decomposed behaviors
import { RuntimeControlsBehavior } from '../../behaviors/RuntimeControlsBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { ChildIndexBehavior } from '../../behaviors/ChildIndexBehavior';
import { RoundPerLoopBehavior } from '../../behaviors/RoundPerLoopBehavior';
import { WorkoutStateBehavior } from '../../behaviors/WorkoutStateBehavior';
import { DisplayModeBehavior } from '../../behaviors/DisplayModeBehavior';
import { TimerPauseResumeBehavior } from '../../behaviors/TimerPauseResumeBehavior';
import { WorkoutControlButtonsBehavior } from '../../behaviors/WorkoutControlButtonsBehavior';
import { IdleInjectionBehavior, IdleConfig } from '../../behaviors/IdleInjectionBehavior';
import { WorkoutFlowStateMachine } from '../../behaviors/WorkoutFlowStateMachine';
import { RoundDisplayBehavior } from '../../behaviors/RoundDisplayBehavior';
import { RoundSpanBehavior } from '../../behaviors/RoundSpanBehavior';
import { LapTimerBehavior } from '../../behaviors/LapTimerBehavior';
import { WorkoutOrchestrator } from '../../behaviors/WorkoutOrchestrator';

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
 * This strategy builds the root block using single-responsibility behaviors:
 * - WorkoutFlowStateMachine: Manages workout phases
 * - RuntimeControlsBehavior: Button/control memory management
 * - TimerBehavior: Overall workout timer
 * - ChildIndexBehavior + RoundPerLoopBehavior + ChildRunnerBehavior: Child execution
 * - WorkoutStateBehavior: UI workout state
 * - DisplayModeBehavior: Timer vs clock display mode
 * - TimerPauseResumeBehavior: Pause/resume handling
 * - WorkoutControlButtonsBehavior: Execution control buttons
 * - IdleInjectionBehavior: Start/end idle blocks
 * 
 * Note: This strategy is meant to be DIRECTLY BUILT, not matched against statements.
 * Use the build() method instead of compile().
 * 
 * @example
 * ```typescript
 * const strategy = new WorkoutRootStrategy();
 * const rootBlock = strategy.build(runtime, {
 *     childGroups: [[1], [2], [3]],
 *     totalRounds: 1
 * });
 * ```
 */
export class WorkoutRootStrategy implements IRuntimeBlockStrategy {
    /**
     * Root blocks are not matched from statements - they are created directly.
     */
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return false;
    }

    /**
     * Not used for root blocks - use build() instead.
     * @throws Error - Root blocks should use build() not compile()
     */
    compile(_statements: ICodeStatement[], _runtime: IScriptRuntime): IRuntimeBlock {
        throw new Error('WorkoutRootStrategy.compile() should not be called. Use build() instead.');
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
     * 
     * Behavior order matters:
     * 1. Controls and state first (so other behaviors can find them)
     * 2. Timer next (for pause/resume to work)
     * 3. Flow/loop management
     * 4. UI behaviors
     * 5. Idle injection last (so it pushes on top)
     */
    buildBehaviors(config: WorkoutRootConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const totalRounds = config.totalRounds ?? 1;

        // ===== 1. Core Infrastructure =====

        // Controls must be first so other behaviors can access it
        behaviors.push(new RuntimeControlsBehavior());

        // Workout state tracking
        behaviors.push(new WorkoutStateBehavior('idle'));

        // Display mode (starts in clock mode for pre-start)
        behaviors.push(new DisplayModeBehavior('clock'));

        // ===== 2. Timer =====

        // Main workout timer (count up, primary display)
        behaviors.push(new TimerBehavior('up', undefined, 'Workout Timer', 'primary', true));

        // Pause/resume event handling
        behaviors.push(new TimerPauseResumeBehavior());

        // ===== 3. Flow Control =====

        // Phase state machine
        behaviors.push(new WorkoutFlowStateMachine());

        // ===== 4. Child Loop Management =====

        // Child index tracking
        behaviors.push(new ChildIndexBehavior(config.childGroups.length));

        // Round counting (increments when child index wraps)
        behaviors.push(new RoundPerLoopBehavior());

        // Orchestrator coordinates all behaviors and handles child pushing
        behaviors.push(new WorkoutOrchestrator({
            childGroups: config.childGroups,
            totalRounds
        }));

        // ===== 5. Round Tracking (for multi-round workouts) =====

        if (totalRounds > 1) {
            behaviors.push(new RoundDisplayBehavior(totalRounds));
            behaviors.push(new RoundSpanBehavior('rounds', undefined, totalRounds));
            behaviors.push(new LapTimerBehavior());
        }

        // ===== 6. Control Buttons =====

        if (config.executionButtons) {
            behaviors.push(new WorkoutControlButtonsBehavior('custom', config.executionButtons));
        } else {
            behaviors.push(new WorkoutControlButtonsBehavior('execution'));
        }

        // ===== 7. Idle Injection =====

        // Start idle (pushed on mount)
        const startIdleConfig = config.startIdle ?? DEFAULT_START_IDLE;
        behaviors.push(new IdleInjectionBehavior('start', startIdleConfig));

        // End idle (injected on completion)
        const endIdleConfig = config.endIdle ?? DEFAULT_END_IDLE;
        behaviors.push(new IdleInjectionBehavior('end', endIdleConfig));

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
