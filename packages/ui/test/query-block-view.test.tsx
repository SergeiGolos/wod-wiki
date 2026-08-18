import { describe, expect, it, mock, afterEach } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { QueryResult } from '@wod-wiki/engine';
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
    const runQuery = mock(async (q: string) => mockScalarResult(q, 84));
    const executor: QueryExecutor = {
      runQuery,
      runFind: mock(async () => ({} as any)),
      runRows: mock(async () => ({} as any)),
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
    const onResultSaved = mock((cb: () => void) => {
      savedCallback = cb;
      return () => {
        savedCallback = undefined;
      };
    });

    const runQuery = mock(async (q: string) => mockScalarResult(q, 10));
    const executor: QueryExecutor = {
      runQuery,
      runFind: mock(async () => ({} as any)),
      runRows: mock(async () => ({} as any)),
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
