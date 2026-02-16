import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';
import { BlockBuilder } from '../BlockBuilder';

// Specific behaviors not covered by aspect composers
import {
    LabelingBehavior,
    ButtonBehavior,
    HistoryRecordBehavior
} from '../../behaviors';

export interface IdleConfig {
    id: string;
    label: string;
    popOnNext: boolean;
    popOnEvents: string[];
    buttonLabel: string;
    buttonAction: string;
}

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
 * Uses aspect composer methods:
 * - .asTimer() - Track total workout elapsed time (countup)
 * - .asRepeater() - Multi-round iteration (if totalRounds > 1)
 * - .asContainer() - Execute child blocks
 * Plus specific behaviors for display, controls, and history.
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
        const blockKey = new BlockKey('root');
        const context = new BlockContext(runtime, blockKey.toString(), 'Workout');

        // Flatten childGroups for sourceIds


        // Use BlockBuilder with aspect composers
        const builder = new BlockBuilder(runtime);
        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType('Root')
            .setLabel('Workout')
            .setSourceIds([]); // sourceIds - Root blocks are containers, they don't inherit identity from children

        this.composeBehaviors(builder, config);

        return builder.build();
    }

    /**
     * Composes behaviors for a root workout block using aspect composers.
     */
    private composeBehaviors(builder: BlockBuilder, config: WorkoutRootConfig): void {
        const totalRounds = config.totalRounds ?? 1;

        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - Track total workout elapsed time
        builder.asTimer({
            direction: 'up',
            label: 'Workout',
            role: 'primary',
            addCompletion: false  // Workout doesn't complete on timer
        });

        // Repeater Aspect - If multi-round workout
        if (totalRounds > 1) {
            builder.asRepeater({
                totalRounds,
                startRound: 1,
                addCompletion: true  // Complete when all rounds done
            });
        }

        // Container Aspect - Execute child blocks
        builder.asContainer({
            childGroups: config.childGroups,
            addLoop: false  // Root doesn't loop children
        });

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Display Aspect
        builder.addBehavior(new LabelingBehavior({
            mode: 'clock',
            label: 'Workout'
        }));

        // Controls Aspect - Workout control buttons
        const buttons = config.executionButtons ?? [
            { id: 'pause', label: 'Pause', action: 'timer:pause' },
            { id: 'next', label: 'Next', action: 'next' },
            { id: 'stop', label: 'Stop', action: 'workout:stop' }
        ];

        builder.addBehavior(new ButtonBehavior({
            buttons: buttons.map(btn => ({
                id: btn.id,
                label: btn.label ?? btn.id,
                variant: btn.id === 'stop' ? 'danger' as const : (btn.id === 'next' ? 'primary' as const : 'secondary' as const),
                visible: true,
                enabled: true,
                eventName: btn.action
            }))
        }));

        // Output Aspect - Record workout history
        builder.addBehavior(new HistoryRecordBehavior());
    }

    /**
     * Builds the behavior list for a root workout block (deprecated - use composeBehaviors).
     * @deprecated Use composeBehaviors with BlockBuilder instead
     */
    buildBehaviors(config: WorkoutRootConfig): IRuntimeBehavior[] {


        // This method is kept for backwards compatibility but should be avoided
        // Use the build() method which uses BlockBuilder with aspect composers
        throw new Error('buildBehaviors is deprecated. Use build() method instead.');
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
