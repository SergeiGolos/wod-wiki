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

  it('edit mode surfaces the arrangement affordances and reports widget actions to the host', async () => {
    const onEditWidget = vi.fn();
    const onRemoveWidget = vi.fn();
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
        editMode
        onEditWidget={onEditWidget}
        onRemoveWidget={onRemoveWidget}
      />,
    );

    // Card renders the result view; view mode keeps the raw WQL off the card.
    await waitFor(() => expect(screen.getByText('100')).toBeDefined());

    // Edit mode: the toolbar's edit affordance reports the widget identity.
    fireEvent.click(screen.getByRole('button', { name: /Edit widget/ }));
    expect(onEditWidget).toHaveBeenCalledWith(expect.objectContaining({ key: 'w0' }));

    // Remove reports the same identity.
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(onRemoveWidget).toHaveBeenCalledWith(expect.objectContaining({ key: 'w0' }));
  });

  it('view mode renders no arrangement chrome; prebuilt sources get an inspect affordance instead', async () => {
    const onInspectWidget = vi.fn();
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
          content: 'sum:reps{}',
          widgetType: 'value',
        },
      ],
      {},
    );

    render(
      <DashboardView
        document={doc}
        executor={mockExecutor}
        onInspectWidget={onInspectWidget}
      />,
    );

    await waitFor(() => expect(screen.getByText('100')).toBeDefined());

    // No edit toolbar in view mode…
    expect(screen.queryByRole('button', { name: /Edit widget/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    // …but a read-only source can still inspect the query.
    fireEvent.click(screen.getByRole('button', { name: /Inspect query for/ }));
    expect(onInspectWidget).toHaveBeenCalledWith(expect.objectContaining({ key: 'w0' }));
  });
});
