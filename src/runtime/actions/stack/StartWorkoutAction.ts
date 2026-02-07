import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { WorkoutRootStrategy, WorkoutRootConfig } from '../../compiler/strategies/WorkoutRootStrategy';
import { PushBlockAction } from './PushBlockAction';

/**
 * Configuration for starting a workout.
 */
export interface StartWorkoutOptions {
    /** Total rounds for the workout (default: 1) */
    totalRounds?: number;
    /** Optional lifecycle options for the root block */
    lifecycle?: BlockLifecycleOptions;
    /** Custom root config overrides */
    rootConfig?: Partial<WorkoutRootConfig>;
}

/**
 * Action that initializes a workout by wrapping the script's statements
 * in a root block and pushing it onto the stack.
 * 
 * This action:
 * 1. Reads all top-level statements from runtime.script
 * 2. Creates child groups (each statement in its own group for sequential execution)
 * 3. Builds a root block using WorkoutRootStrategy
 * 4. Pushes the root block to start the workout
 * 
 * The runtime can exist in an "idle" state until this action is executed,
 * allowing for runtime creation separate from workout activation.
 * 
 * @example
 * ```typescript
 * // Create runtime (idle - nothing on stack)
 * const runtime = new ScriptRuntime(script, compiler, dependencies);
 * 
 * // Later, start the workout via event or direct action
 * runtime.do(new StartWorkoutAction());
 * 
 * // Or with custom rounds
 * runtime.do(new StartWorkoutAction({ totalRounds: 3 }));
 * ```
 */
export class StartWorkoutAction implements IRuntimeAction {
    readonly type = 'start-workout';

    constructor(private readonly options: StartWorkoutOptions = {}) {}

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        // Guard: Check if workout already started (root block on stack)
        if (runtime.stack.count > 0) {
            console.warn('[StartWorkoutAction] Workout already started - stack is not empty');
            return [];
        }

        // Guard: Check for statements
        const statements = runtime.script?.statements;
        if (!statements || statements.length === 0) {
            console.warn('[StartWorkoutAction] No statements in script to start');
            return [];
        }

        // Build child groups: each top-level statement becomes its own group
        // This ensures sequential execution of workout items
        const statementIds = statements.map(s => s.id);
        const childGroups = statementIds.map(id => [id]);

        // Build root block configuration
        const rootConfig: WorkoutRootConfig = {
            childGroups,
            totalRounds: this.options.totalRounds ?? 1,
            ...this.options.rootConfig
        };

        // Create root block using WorkoutRootStrategy
        const rootStrategy = new WorkoutRootStrategy();
        const rootBlock = rootStrategy.build(runtime, rootConfig);

        // Build lifecycle options with start time
        const lifecycle: BlockLifecycleOptions = {
            startTime: runtime.clock.now,
            ...this.options.lifecycle
        };

        // Push root block via PushBlockAction
        return [new PushBlockAction(rootBlock, lifecycle)];
    }
}
