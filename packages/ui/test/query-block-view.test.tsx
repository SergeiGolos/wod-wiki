import { describe, expect, it, vi, afterEach   } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { QueryResult } from '@wod-wiki/wql';
import { QueryBlockView, type QueryExecutor } from '../src';

afterEach(cleanup);

function mockScalarResult(raw: string, value = 42): QueryResult {
  return {
    parsed: { raw, agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
    series: [{ key: 'scalar', label: 'reps', points: [{ ts: 1000, value }], unit: 'reps' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
    matched: [],
    scalar: value,
    unit: 'reps',
  };
}

describe('QueryBlockView with injected QueryExecutor and onResultSaved', () => {
  it('executes scalar query via injected QueryExecutor and renders result', async () => {
    const runQuery = vi.fn(async (q: string) => mockScalarResult(q, 84));
    const executor: QueryExecutor = {
      runQuery,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
    };

    render(<QueryBlockView query="sum:reps{}" executor={executor} />);

    await waitFor(() => {
      expect(runQuery).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('84')).toBeDefined();
    });
  });

  it('subscribes to onResultSaved callback prop for refresh notifications', async () => {
    let savedCallback: (() => void) | undefined;
    const onResultSaved = vi.fn((cb: () => void) => {
      savedCallback = cb;
      return () => {
        savedCallback = undefined;
      };
    });

    const runQuery = vi.fn(async (q: string) => mockScalarResult(q, 10));
    const executor: QueryExecutor = {
      runQuery,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
    };

    render(
      <QueryBlockView
        query="sum:reps{}"
        executor={executor}
        onResultSaved={onResultSaved}
      />,
    );

    expect(onResultSaved).toHaveBeenCalled();
    expect(savedCallback).toBeDefined();
  });
});
