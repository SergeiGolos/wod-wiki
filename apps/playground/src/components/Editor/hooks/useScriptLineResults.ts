/**
 * useScriptLineResults
 *
 * Extracts per-line execution history from workout results.
 * Matches output logs by `line` (the content-relative source line persisted
 * on each output). Legacy records stored before outputs carried `line` encode
 * the source line in `sourceStatementId`; that field is consulted only when
 * `line` is absent.
 *
 * Returns a minimal summary: execution count, per-result elapsed times,
 * and aggregate totals — just enough to show a compact history card.
 */

import { useMemo } from 'react';
import type { Session } from '@/types/storage';
import type { IOutputStatement } from '@bitcobblers/wod-wiki-engine';
import type { StoredOutputStatement } from '@/components/Editor/types';
import { MetricType } from '@bitcobblers/wod-wiki-engine';

/** Summary of one result set's contribution for a specific line. */
export interface LineResultEntry {
  /** When the workout was completed (unix ms). */
  createdAt: number;
  /** How many output logs matched this line in this result. */
  hitCount: number;
  /** Total elapsed ms across all matching logs in this result. */
  elapsedMs: number;
}

/** Aggregate summary for a single line across all results. */
export interface LineExecutionSummary {
  /** 1-based content-relative source line of the exercise statement. */
  lineNumber: number;
  /** Total number of result sets that include this line. */
  resultCount: number;
  /** Total execution hits across all results (accounts for rounds). */
  totalHits: number;
  /** Per-result breakdown (most recent first). */
  entries: LineResultEntry[];
}

/**
 * Extract elapsed ms from an output statement.
 * Reads the Elapsed metric from the statement's metrics array.
 */
function extractElapsed(output: IOutputStatement | StoredOutputStatement): number {
  const elapsedMetric = output.metrics?.find(m => m.type === MetricType.Elapsed);
  if (elapsedMetric?.value !== undefined && typeof elapsedMetric.value === 'number') {
    return elapsedMetric.value;
  }
  return 0;
}

/**
 * Build a line execution summary from workout results.
 *
 * Only the deepest segments on a source line count. Inline round containers
 * and the session root share their children's source line, but their elapsed
 * spans must not be counted again. Standalone timer/rest/rep lines still count.
 *
 * @param results    - Block-level workout results (already sorted most-recent-first).
 * @param lineNumber - 1-based content-relative source line to filter by.
 */
export function buildLineExecutionSummary(
  results: Session[],
  lineNumber: number,
): LineExecutionSummary {
  const entries: LineResultEntry[] = [];
  let totalHits = 0;

  for (const result of results) {
    const logs = (result.data?.logs ?? []) as StoredOutputStatement[];
    const lineSegments = logs.filter(
      l => l.outputType === 'segment' && (l.line ?? l.sourceStatementId) === lineNumber,
    );
    const depth = lineSegments.reduce((max, segment) => Math.max(max, segment.stackLevel), 0);
    const matching = lineSegments.filter(segment => segment.stackLevel === depth);
    if (matching.length === 0) continue;

    const elapsedMs = matching.reduce((sum, m) => sum + extractElapsed(m), 0);
    totalHits += matching.length;
    entries.push({
      createdAt: result.createdAt,
      hitCount: matching.length,
      elapsedMs,
    });
  }

  return {
    lineNumber,
    resultCount: entries.length,
    totalHits,
    entries,
  };
}

/**
 * React hook: given the block's results and the active source line,
 * returns a memoised `LineExecutionSummary`.
 *
 * Returns `null` when there is no execution data for the line.
 */
export function useScriptLineResults(
  results: Session[],
  lineNumber: number | undefined,
): LineExecutionSummary | null {
  return useMemo(() => {
    if (lineNumber === undefined || results.length === 0) return null;
    const summary = buildLineExecutionSummary(results, lineNumber);
    return summary.resultCount > 0 ? summary : null;
  }, [results, lineNumber]);
}
