import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { SessionRootStrategy } from '../../compiler/strategies/SessionRootStrategy';
import { SessionRootConfig } from '../../blocks/SessionRootBlock';
import { PushBlockAction } from './PushBlockAction';

/**
 * Configuration for starting a workout.
 */
export interface StartWorkoutOptions {
    /** Display label for the session */
    label?: string;
    /** Total rounds for the workout (default: 1) */
    totalRounds?: number;
    /** Optional lifecycle options for the root block */
    lifecycle?: BlockLifecycleOptions;
}

/**
 * Action that initializes a workout by wrapping the script's statements
 * in a root block and pushing it onto the stack.
 *
 * This action:
 * 1. Reads all top-level statements from runtime.script
 * 2. Creates child groups (each top-level statement in its own group)
 * 3. Builds a SessionRootBlock using SessionRootStrategy
 * 4. Pushes the root block to start the workout
 *
 * @example
 * ```typescript
 * runtime.do(new StartWorkoutAction());
 * runtime.do(new StartWorkoutAction({ label: 'Grace', totalRounds: 3 }));
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

        // Build child groups: filter to top-level statements only
        const childStatementIds = new Set<number>();
        for (const s of statements) {
            if (s.children) {
                for (const childGroup of s.children) {
                    for (const childId of childGroup) childStatementIds.add(childId);
                }
            }
        }
        const topLevelStatements = statements.filter(s => !childStatementIds.has(s.id));
        const childGroups = topLevelStatements.map(s => [s.id]);

        const rootConfig: SessionRootConfig = {
            childGroups,
            label: this.options.label,
            totalRounds: this.options.totalRounds ?? 1,
        };

        // Create root block using SessionRootStrategy
        const rootStrategy = new SessionRootStrategy();
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
