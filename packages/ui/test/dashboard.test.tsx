import { describe, expect, it, vi, afterEach   } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildDashboardDocument, type DashboardDocument, type FindQueryResult, type QueryResult, type RowsQueryResult } from '@bitcobblers/wod-wiki-wql';
import {
  DashboardView,
  type QueryExecutor,
} from '../src';

afterEach(cleanup);

function mockQueryResult(raw: string, value = 100): QueryResult {
  return {
    parsed: { family: 'aggregate', raw, agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
    series: [{ key: 'scalar', label: 'reps', points: [{ ts: 1000, value }], unit: 'reps' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
    matched: [],
    scalar: value,
    unit: 'reps',
  };
}

describe('DashboardView and useAnalyticsQueries with injected QueryExecutor', () => {
  it('DashboardView renders widgets using injected QueryExecutor without singleton queryService', async () => {
    const runQueryMock = vi.fn(async (query: string) => mockQueryResult(query, 250));
    const mockExecutor: QueryExecutor = {
      runQuery: runQueryMock,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
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
    const runQueryMock = vi.fn(async (query: string) => mockQueryResult(query, 300));
    const mockExecutor: QueryExecutor = {
      runQuery: runQueryMock,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
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

  it('view-first cards: edit button opens the composer modal seeded with the raw token query; Apply writes back', async () => {
    const onSaveWidgetQuery = vi.fn();
    const runQueryMock = vi.fn(async (query: string) => mockQueryResult(query));
    const mockExecutor: QueryExecutor = {
      runQuery: runQueryMock,
      runFind: vi.fn(async () => ({}) as unknown as FindQueryResult),
      runRows: vi.fn(async () => ({}) as unknown as RowsQueryResult),
    };

    const doc: DashboardDocument = buildDashboardDocument(
      [
        {
          type: 'query',
          content: 'sum:reps{effort:$exercise}',
          widgetType: 'value',
        },
      ],
      { exercise: ['fran'] },
    );

    render(
      <DashboardView
        document={doc}
        executor={mockExecutor}
        tokenValues={{ exercise: 'fran' }}
        onSaveWidgetQuery={onSaveWidgetQuery}
      />,
    );

    // Card renders the result view; the raw WQL text is not on the card.
    await waitFor(() => expect(screen.getByText('100')).toBeDefined());
    expect(screen.queryByText('sum:reps{effort:fran}')).toBeNull();

    // Hover edit button → modal, seeded with the token-bearing raw query.
    fireEvent.click(screen.getByRole('button', { name: /Edit query for/ }));
    const input = await waitFor(() => {
      const el = screen.getByTestId('wql-composer-input') as HTMLInputElement;
      expect(el.value).toBe('sum:reps{effort:$exercise}');
      return el;
    });
    fireEvent.change(input, { target: { value: 'sum:reps{effort:annie}' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const apply = await waitFor(() => {
      const btn = screen.getByText('Apply to Widget').closest('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      return btn;
    });
    fireEvent.click(apply);
    expect(onSaveWidgetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'w0' }),
      'sum:reps{effort:annie}',
    );
  });
});
