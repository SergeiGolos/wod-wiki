import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockLifecycleOptions } from '../../contracts/IRuntimeBlock';
import { SessionRootStrategy } from '../../compiler/strategies/SessionRootStrategy';
import { SessionRootConfig } from '../../blocks/SessionRootBlock';
import { PushBlockAction } from './PushBlockAction';

/**
 * Configuration for starting a session-based workout.
 */
export interface StartSessionOptions {
    /** Display label for the session (e.g., "Grace", "Cindy") */
    label?: string;
    /** Total rounds for the session (default: 1) */
    totalRounds?: number;
    /** Optional lifecycle options for the root block */
    lifecycle?: BlockLifecycleOptions;
}

/**
 * Action that initializes a workout using the SessionRootBlock.
 *
 * Unlike StartWorkoutAction (which uses WorkoutRootStrategy),
 * this action uses the Phase 1 SessionRootStrategy to create a
 * SessionRootBlock with proper behavior composition:
 *
 * - ReportOutputBehavior (emits segment/completion outputs)
 * - TimerInitBehavior (countup for total elapsed time)
 * - ChildRunnerBehavior (sequences WaitingToStart + children)
 * - HistoryRecordBehavior (records session on unmount)
 *
 * The SessionRootBlock automatically pushes WaitingToStart as its
 * first child when mounted, creating the documented lifecycle:
 *   SessionRoot > WaitingToStart (gate) > workout blocks
 *
 * @see SessionRootStrategy
 * @see SessionRootBlock
 */
export class StartSessionAction implements IRuntimeAction {
    readonly type = 'start-session';

    constructor(private readonly options: StartSessionOptions = {}) {}

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        // Guard: Check if workout already started
        if (runtime.stack.count > 0) {
            console.warn('[StartSessionAction] Session already started - stack is not empty');
            return [];
        }

        // Guard: Check for statements
        const statements = runtime.script?.statements;
        if (!statements || statements.length === 0) {
            console.warn('[StartSessionAction] No statements in script to start');
            return [];
        }

        // Build child groups: only include TOP-LEVEL statements.
        // The parser lists ALL statements flat (parents and children).
        // We filter to statements that are NOT children of any other statement.
        // Note: children is number[][] (groups of statement IDs).
        const childStatementIds = new Set<number>();
        for (const s of statements) {
            if (s.children) {
                for (const childGroup of s.children) {
                    for (const childId of childGroup) {
                        childStatementIds.add(childId);
                    }
                }
            }
        }
        const topLevelStatements = statements.filter(s => !childStatementIds.has(s.id));
        const childGroups = topLevelStatements.map(s => [s.id]);

        // Build session root configuration
        const config: SessionRootConfig = {
            childGroups,
            label: this.options.label,
            totalRounds: this.options.totalRounds,
        };

        // Create session root block
        const strategy = new SessionRootStrategy();
        const rootBlock = strategy.build(runtime, config);

        // Build lifecycle options with start time
        const lifecycle: BlockLifecycleOptions = {
            startTime: runtime.clock.now,
            ...this.options.lifecycle
        };

        // Push root block
        return [new PushBlockAction(rootBlock, lifecycle)];
    }
}
