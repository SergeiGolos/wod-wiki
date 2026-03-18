import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { BlockBuilder } from '../BlockBuilder';
import { SessionRootBlock, SessionRootConfig } from '../../blocks/SessionRootBlock';
import { MetricType } from '../../../core/models/Metric';

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
 * History persistence is delegated to the workbench layer — all data needed
 * is available in the output stream (ReportOutputBehavior completions).
 *
 * @see SessionRootBlock
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
        // Build child groups, merging standalone metric-context statements (e.g. "95 lb",
        // "400 m") with the immediately following group/loop statement so that the metric
        // cascades into the group's children via MetricPromotionBehavior.
        const childGroups: number[][] = [];
        let i = 0;
        while (i < statements.length) {
            const current = statements[i];
            if (isMetricContextStatement(current) && i + 1 < statements.length) {
                const next = statements[i + 1];
                if (isGroupStatement(next)) {
                    // Merge: put the group stmt first so statements[0].children is valid
                    childGroups.push([next.id as number, current.id as number]);
                    i += 2;
                    continue;
                }
            }
            childGroups.push([current.id as number]);
            i++;
        }

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

// ---------------------------------------------------------------------------
// Helpers for metric-context detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the statement carries only metric context (resistance/distance)
 * with no effort, timer, rounds, or children — indicating it should cascade its
 * metrics into the immediately following group/loop statement.
 */
function isMetricContextStatement(stmt: ICodeStatement): boolean {
    const metrics = stmt.metrics;
    return (
        (!stmt.children || stmt.children.length === 0) &&
        !metrics.some(m => m.type === MetricType.Effort) &&
        !metrics.some(m => m.type === MetricType.Duration) &&
        !metrics.some(m => m.type === MetricType.Rounds) &&
        !metrics.some(m => m.type === MetricType.Rep) &&
        metrics.some(m => m.type === MetricType.Resistance || m.type === MetricType.Distance)
    );
}

/**
 * Returns true if the statement represents a group-like block (has children,
 * rounds, or duration) that can accept metric promotions from a context statement.
 */
function isGroupStatement(stmt: ICodeStatement): boolean {
    return (
        (!!stmt.children && stmt.children.length > 0) ||
        stmt.metrics.some(m => m.type === MetricType.Rounds) ||
        stmt.metrics.some(m => m.type === MetricType.Duration)
    );
}
