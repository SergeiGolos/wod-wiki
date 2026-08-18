import { describe, expect, it, mock, afterEach } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  buildDashboardDocument,
  type DashboardDocument,
  type QueryResult,
} from '@wod-wiki/engine';
import {
  DashboardView,
  type QueryExecutor,
} from '../src';

afterEach(cleanup);

function mockQueryResult(raw: string, value = 100): QueryResult {
  return {
    parsed: { raw, agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
    series: [{ key: 'scalar', label: 'reps', points: [{ ts: 1000, value }], unit: 'reps' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
    matched: [],
    scalar: value,
    unit: 'reps',
  };
}

describe('DashboardView and useAnalyticsQueries with injected QueryExecutor', () => {
  it('DashboardView renders widgets using injected QueryExecutor without singleton queryService', async () => {
    const runQueryMock = mock(async (query: string) => mockQueryResult(query, 250));
    const mockExecutor: QueryExecutor = {
      runQuery: runQueryMock,
      runFind: mock(async () => ({} as any)),
      runRows: mock(async () => ({} as any)),
    };

    const doc: DashboardDocument = buildDashboardDocument(
      [
        {
          type: 'query',
          content: 'sum:reps{}',
          widgetType: 'value',
        },
      ],
      {},
    );

    render(<DashboardView document={doc} executor={mockExecutor} />);

    await waitFor(() => {
      expect(runQueryMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('250')).toBeDefined();
    });
  });

  it('substitutes token values into widget queries at execution time', async () => {
    const runQueryMock = mock(async (query: string) => mockQueryResult(query, 300));
    const mockExecutor: QueryExecutor = {
      runQuery: runQueryMock,
      runFind: mock(async () => ({} as any)),
      runRows: mock(async () => ({} as any)),
    };

    const doc: DashboardDocument = buildDashboardDocument(
      [
        {
          type: 'query',
          content: 'sum:totalVolume{effort:$exercise}',
          widgetType: 'value',
        },
      ],
      {
        exercise: ['back-squat', 'deadlift'],
      },
    );

    render(
      <DashboardView
        document={doc}
        executor={mockExecutor}
        tokenValues={{ exercise: 'deadlift' }}
      />,
    );

    await waitFor(() => {
      expect(runQueryMock).toHaveBeenCalledWith(
        'sum:totalVolume{effort:deadlift}',
        expect.anything(),
      );
    });
  });
});
