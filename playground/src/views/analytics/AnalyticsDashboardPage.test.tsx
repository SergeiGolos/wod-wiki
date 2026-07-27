import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import type { QueryResult } from '@/services/analytics/query';
import { AnalyticsDashboardPage } from './AnalyticsDashboardPage';

afterEach(cleanup);

function resultOf(kind: 'empty' | 'error' | 'scalar'): QueryResult {
  const base = {
    parsed: { raw: '', agg: 'sum' as const, metric: '', filters: [], groupBy: [] },
    series: [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
  };
  if (kind === 'error') {
    return { ...base, parsed: { ...base.parsed, raw: 'bad', error: 'Cannot parse "bad".' } };
  }
  if (kind === 'scalar') {
    return {
      ...base,
      parsed: { ...base.parsed, raw: 'sum:totalVolume{}', metric: 'totalVolume' },
      series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1_700_000_000_000, value: 6000 }] }],
      stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
      scalar: 6000,
    };
  }
  return base;
}

mock.module('@/services/analytics/query', () => ({
  parseQuery: (raw: string) => ({ raw, agg: 'sum', metric: '', filters: [], groupBy: [] }),
  QueryService: class {},
  queryService: {
    runQuery: mock(async () => resultOf('empty')),
    run: mock(async () => resultOf('empty')),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/analytics/dashboard']} initialIndex={0}>
      <NuqsAdapter>
        <AnalyticsDashboardPage />
      </NuqsAdapter>
    </MemoryRouter>,
  );
}

describe('AnalyticsDashboardPage', () => {
  it('renders the header and range selector', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    expect(screen.getByText('Coaching Dashboard — Training Block Review')).toBeDefined();
    expect(screen.getByText('4w')).toBeDefined();
    expect(screen.getByText('8w')).toBeDefined();
    expect(screen.getByText('16w')).toBeDefined();
  });

  it('renders all demo widgets without crashing on an empty store', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    expect(screen.getByText('Avg TIS')).toBeDefined();
    expect(screen.getByText('Total volume')).toBeDefined();
    expect(screen.getByText('Volume by effort')).toBeDefined();
    expect(screen.getByText('Weekly tonnage')).toBeDefined();
  });

  it('toggles the dashboard source view', async () => {
    renderPage();
    const button = await waitFor(() => screen.getByText('View as note'));
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('Hide note source')).toBeDefined());
    expect(screen.getByText(/range: past_16_weeks/)).toBeDefined();
  });
});
