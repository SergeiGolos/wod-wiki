import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';

// Decomposed behaviors - PENDING REIMPLEMENTATION
// import { RuntimeControlsBehavior } from '../../behaviors/RuntimeControlsBehavior';
// import { TimerBehavior } from '../../behaviors/TimerBehavior';
// import { ChildIndexBehavior } from '../../behaviors/ChildIndexBehavior';
// import { ChildRunnerBehavior } from '../../behaviors/ChildRunnerBehavior';
// import { RoundPerLoopBehavior } from '../../behaviors/RoundPerLoopBehavior';
// import { WorkoutStateBehavior } from '../../behaviors/WorkoutStateBehavior';
// import { DisplayModeBehavior } from '../../behaviors/DisplayModeBehavior';
// import { TimerPauseResumeBehavior } from '../../behaviors/TimerPauseResumeBehavior';
// import { WorkoutControlButtonsBehavior } from '../../behaviors/WorkoutControlButtonsBehavior';
import { IdleConfig } from '../../behaviors/IdleInjectionBehavior';
// import { WorkoutFlowStateMachine } from '../../behaviors/WorkoutFlowStateMachine';
// import { RoundDisplayBehavior } from '../../behaviors/RoundDisplayBehavior';
// import { RoundSpanBehavior } from '../../behaviors/RoundSpanBehavior';
// import { LapTimerBehavior } from '../../behaviors/LapTimerBehavior';

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
 * NOTE: Currently neutered pending behavior migration.
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
    apply(_builder: any, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
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
        // TODO: Reimplement behaviors with IBehaviorContext
        return [];
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
