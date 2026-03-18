import { describe, it, expect } from 'bun:test';
import { buildLineExecutionSummary } from '../useWodLineResults';
import type { WorkoutResult } from '@/types/storage';
import type { IOutputStatement } from '@/core/models/OutputStatement';

/** Minimal output log stub matching the fields we read. */
function makeLog(sourceStatementId: number, elapsedMs: number): Partial<IOutputStatement> {
  return {
    sourceStatementId,
    outputType: 'segment',
    elapsed: elapsedMs,
    metrics: [],
  };
}

function makeResult(
  completedAt: number,
  logs: Partial<IOutputStatement>[],
): WorkoutResult {
  return {
    id: `r-${completedAt}`,
    noteId: 'note-1',
    sectionId: 'sec-1',
    completedAt,
    data: {
      startTime: completedAt - 60_000,
      endTime: completedAt,
      duration: 60_000,
      metrics: [],
      logs: logs as IOutputStatement[],
      completed: true,
    },
  };
}

describe('buildLineExecutionSummary', () => {
  it('returns zero counts when no logs match the statement id', () => {
    const results = [makeResult(1000, [makeLog(5, 3000)])];
    const summary = buildLineExecutionSummary(results, 99);

    expect(summary.resultCount).toBe(0);
    expect(summary.totalHits).toBe(0);
    expect(summary.entries).toHaveLength(0);
  });

  it('counts a single execution across one result', () => {
    const results = [makeResult(2000, [makeLog(3, 5000)])];
    const summary = buildLineExecutionSummary(results, 3);

    expect(summary.statementId).toBe(3);
    expect(summary.resultCount).toBe(1);
    expect(summary.totalHits).toBe(1);
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].elapsedMs).toBe(5000);
    expect(summary.entries[0].hitCount).toBe(1);
  });

  it('aggregates multiple hits within a single result (rounds)', () => {
    const results = [
      makeResult(3000, [
        makeLog(2, 1000),
        makeLog(2, 1200),
        makeLog(2, 900),
      ]),
    ];
    const summary = buildLineExecutionSummary(results, 2);

    expect(summary.resultCount).toBe(1);
    expect(summary.totalHits).toBe(3);
    expect(summary.entries[0].hitCount).toBe(3);
    expect(summary.entries[0].elapsedMs).toBe(3100);
  });

  it('spans multiple results', () => {
    const results = [
      makeResult(5000, [makeLog(1, 4000)]),
      makeResult(4000, [makeLog(1, 3500)]),
    ];
    const summary = buildLineExecutionSummary(results, 1);

    expect(summary.resultCount).toBe(2);
    expect(summary.totalHits).toBe(2);
    expect(summary.entries).toHaveLength(2);
    expect(summary.entries[0].elapsedMs).toBe(4000);
    expect(summary.entries[1].elapsedMs).toBe(3500);
  });

  it('ignores non-segment output types', () => {
    const results = [
      makeResult(6000, [
        { sourceStatementId: 1, outputType: 'system', elapsed: 100, metrics: [] } as any,
        makeLog(1, 2000),
      ]),
    ];
    const summary = buildLineExecutionSummary(results, 1);

    expect(summary.totalHits).toBe(1);
    expect(summary.entries[0].elapsedMs).toBe(2000);
  });
});
