import { describe, expect, it } from 'bun:test';
import { buildLineExecutionSummary } from './useScriptLineResults';
import type { StoredOutputStatement } from '@/components/Editor/types';
import type { Session } from '@/types/storage';

function seg(partial: Partial<StoredOutputStatement> & { id: number }): StoredOutputStatement {
  return {
    outputType: 'segment',
    timeSpan: { started: 0 },
    metrics: [],
    sourceBlockKey: 'b',
    stackLevel: 1,
    ...partial,
  } as StoredOutputStatement;
}

function session(logs: StoredOutputStatement[]): Session {
  return { id: 's', createdAt: 1, data: { logs } } as unknown as Session;
}

/** One Back Squat set: id-child segment on line 1. */
function squatSet(id: number): StoredOutputStatement {
  return seg({
    id,
    line: 1,
    stackLevel: 2,
    metrics: [
      { type: 'effort', value: 'Back Squat', origin: 'parser' },
      { type: 'rep', value: 5, origin: 'parser' },
      { type: 'elapsed', value: 8000, origin: 'runtime' },
    ],
  });
}

describe('buildLineExecutionSummary', () => {
  it('counts exercise sets without counting their rounds and session containers', () => {
    const logs = [
      seg({ id: 0, line: 1, stackLevel: 0, metrics: [{ type: 'elapsed', value: 60000 }] }),
      seg({
        id: 1,
        line: 1,
        metrics: [
          { type: 'rounds', value: 5, origin: 'parser' },
          { type: 'elapsed', value: 60000, origin: 'runtime' },
        ],
      }),
      ...[2, 3, 4, 5, 6].map(squatSet),
    ];

    const summary = buildLineExecutionSummary([session(logs)], 1);
    expect(summary!.lineNumber).toBe(1);
    expect(summary!.totalHits).toBe(5);
    expect(summary!.entries[0].hitCount).toBe(5);
    expect(summary!.entries[0].elapsedMs).toBe(40000); // 5 × set elapsed, no container span
  });

  it('aggregates a sibling after a blank line under its own source line', () => {
    const logs = [
      ...[2, 3, 4, 5, 6].map(squatSet),
      seg({
        id: 7,
        line: 3,
        metrics: [
          { type: 'effort', value: 'Pullups', origin: 'parser' },
          { type: 'rep', value: 10, origin: 'parser' },
          { type: 'elapsed', value: 30000, origin: 'runtime' },
        ],
      }),
    ];
    const summary = buildLineExecutionSummary([session(logs)], 3);
    expect(summary!.totalHits).toBe(1);
    expect(summary!.entries[0].elapsedMs).toBe(30000);
    expect(buildLineExecutionSummary([session(logs)], 2).totalHits).toBe(0);
  });

  it('falls back to legacy sourceStatementId-encoded lines when line is absent', () => {
    const logs = [
      seg({
        id: 42,
        sourceStatementId: 1, // pre-cutover records encoded the source line here
        metrics: [
          { type: 'effort', value: 'Back Squat', origin: 'parser' },
          { type: 'elapsed', value: 9000, origin: 'runtime' },
        ],
      }),
    ];
    const summary = buildLineExecutionSummary([session(logs)], 1);
    expect(summary!.totalHits).toBe(1);
  });

  it('keeps round-only and rep-only historical lines countable', () => {
    const logs = [
      seg({
        id: 10,
        line: 4,
        metrics: [
          { type: 'rounds', value: 3, origin: 'parser' },
          { type: 'elapsed', value: 60000, origin: 'runtime' },
        ],
      }),
      seg({
        id: 11,
        line: 5,
        metrics: [
          { type: 'rep', value: 3, origin: 'parser' },
          { type: 'elapsed', value: 5000, origin: 'runtime' },
        ],
      }),
    ];
    // Round-only line: no leaf segments, so the container itself counts.
    expect(buildLineExecutionSummary([session(logs)], 4)!.totalHits).toBe(1);
    // Rep-only leaf counts as a hit.
    expect(buildLineExecutionSummary([session(logs)], 5)!.totalHits).toBe(1);
  });
});
