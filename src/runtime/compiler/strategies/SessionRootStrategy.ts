import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { BlockBuilder } from '../BlockBuilder';
import { SessionRootBlock, SessionRootConfig } from '../../blocks/SessionRootBlock';

/**
 * SessionRootStrategy composes a SessionRootBlock for workout sessions.
 *
 * This is a direct-build strategy (match() returns false) — it is not
 * discovered by the JIT pipeline. Instead, it is invoked explicitly by
 * StartWorkoutAction or equivalent entry points.
 *
 * ## Responsibilities
 *
 * 1. Accept parsed CodeStatements representing a workout
 * 2. Extract section label from the first statement
 * 3. Build child groups from top-level statement IDs
 * 4. Create a SessionRootBlock that sequences:
 *    - WaitingToStart (idle gate)
 *    - Compiled child blocks (workout exercises)
 *
 * ## Relationship to WorkoutRootStrategy
 *
 * SessionRootStrategy creates a SessionRootBlock (the new Phase 1 block
 * with ReportOutputBehavior, HistoryRecordBehavior, etc.). It is intended
 * to eventually replace WorkoutRootStrategy as the primary root builder.
 *
 * @see SessionRootBlock
 * @see WorkoutRootStrategy
 */
export class SessionRootStrategy implements IRuntimeBlockStrategy {
    priority = 100;

    /**
     * Root blocks are not matched from statements — they are created directly.
     */
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return false;
    }

    /**
     * Composable apply — not used for root blocks.
     */
    apply(_builder: BlockBuilder, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // No-op for direct build
    }

    /**
     * Builds a SessionRootBlock from a configuration.
     *
     * @param runtime - The script runtime context
     * @param config - Session root configuration with child groups and optional label/rounds
     * @returns A fully composed SessionRootBlock
     *
     * @example
     * ```typescript
     * const strategy = new SessionRootStrategy();
     * const root = strategy.build(runtime, {
     *     childGroups: [[1], [2], [3]],
     *     label: 'Morning WOD',
     *     totalRounds: 1
     * });
     * ```
     */
    build(runtime: IScriptRuntime, config: SessionRootConfig): IRuntimeBlock {
        return new SessionRootBlock(runtime, config);
    }

    /**
     * Builds a SessionRootBlock from parsed workout statements.
     *
     * Convenience method that extracts child groups from top-level statements
     * and delegates to build().
     *
     * @param runtime - The script runtime context
     * @param statements - Parsed top-level workout statements
     * @param options - Optional overrides for label and total rounds
     * @returns A fully composed SessionRootBlock
     *
     * @example
     * ```typescript
     * const strategy = new SessionRootStrategy();
     * const root = strategy.buildFromStatements(runtime, statements, {
     *     label: 'Grace',
     *     totalRounds: 1
     * });
     * ```
     */
    buildFromStatements(
        runtime: IScriptRuntime,
        statements: ICodeStatement[],
        options?: { label?: string; totalRounds?: number }
    ): IRuntimeBlock {
        // Each top-level statement becomes its own child group for sequential execution
        const childGroups = statements.map(s => [s.id]);

        const config: SessionRootConfig = {
            childGroups,
            label: options?.label,
            totalRounds: options?.totalRounds
        };

        return this.build(runtime, config);
    }
}

/**
 * Default instance for convenience.
 */
export const sessionRootStrategy = new SessionRootStrategy();
