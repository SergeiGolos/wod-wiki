/**
 * useWodLineResults
 *
 * Extracts per-line execution history from workout results.
 * Matches output logs by `sourceStatementId` (which equals the 1-based
 * content-relative line number set during parsing).
 *
 * Returns a minimal summary: execution count, per-result elapsed times,
 * and aggregate totals — just enough to show a compact history card.
 */

import { useMemo } from 'react';
import type { WorkoutResult } from '@/types/storage';
import type { IOutputStatement } from '@/core/models/OutputStatement';
import { MetricType } from '@/core/models/Metric';

/** Summary of one result set's contribution for a specific line. */
export interface LineResultEntry {
  /** When the workout was completed (unix ms). */
  completedAt: number;
  /** How many output logs matched this line in this result. */
  hitCount: number;
  /** Total elapsed ms across all matching logs in this result. */
  elapsedMs: number;
}

/** Aggregate summary for a single line across all results. */
export interface LineExecutionSummary {
  /** The statement/line ID within the block content. */
  statementId: number;
  /** Total number of result sets that include this line. */
  resultCount: number;
  /** Total execution hits across all results (accounts for rounds). */
  totalHits: number;
  /** Per-result breakdown (most recent first). */
  entries: LineResultEntry[];
}

/**
 * Extract elapsed ms from an output statement.
 * Prefers the Elapsed metric; falls back to the deprecated `.elapsed` property.
 */
function extractElapsed(output: IOutputStatement): number {
  const elapsedMetric = output.metrics?.find(m => m.type === MetricType.Elapsed);
  if (elapsedMetric?.value !== undefined && typeof elapsedMetric.value === 'number') {
    return elapsedMetric.value;
  }
  if (typeof output.elapsed === 'number' && output.elapsed > 0) {
    return output.elapsed;
  }
  return 0;
}

/**
 * Build a line execution summary from workout results.
 *
 * @param results    - Block-level workout results (already sorted most-recent-first).
 * @param statementId - The statement ID (= content line number) to filter by.
 */
export function buildLineExecutionSummary(
  results: WorkoutResult[],
  statementId: number,
): LineExecutionSummary {
  const entries: LineResultEntry[] = [];
  let totalHits = 0;

  for (const result of results) {
    const logs = (result.data?.logs ?? []) as IOutputStatement[];
    const matching = logs.filter(
      l => l.sourceStatementId === statementId && l.outputType === 'segment',
    );
    if (matching.length === 0) continue;

    const elapsedMs = matching.reduce((sum, m) => sum + extractElapsed(m), 0);
    totalHits += matching.length;
    entries.push({
      completedAt: result.completedAt,
      hitCount: matching.length,
      elapsedMs,
    });
  }

  return {
    statementId,
    resultCount: entries.length,
    totalHits,
    entries,
  };
}

/**
 * React hook: given the block's results and the active statement ID,
 * returns a memoised `LineExecutionSummary`.
 *
 * Returns `null` when there is no execution data for the line.
 */
export function useWodLineResults(
  results: WorkoutResult[],
  statementId: number | undefined,
): LineExecutionSummary | null {
  return useMemo(() => {
    if (statementId === undefined || results.length === 0) return null;
    const summary = buildLineExecutionSummary(results, statementId);
    return summary.resultCount > 0 ? summary : null;
  }, [results, statementId]);
}
