import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import type { QueryResult } from '@/services/analytics/query';
import { AnalyticsDashboardPage } from './AnalyticsDashboardPage';

afterEach(cleanup);

let sampleDataPresent = false;
let queryResultKind: 'empty' | 'scalar' = 'scalar';

mock.module('@/services/analytics/sample', () => ({
  loadSampleData: mock(async () => ({ facts: 120 })),
  purgeSampleData: mock(async () => undefined),
  hasSampleData: mock(async () => sampleDataPresent),
}));

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
      matched: [{ id: 'scalar', noteId: 'n', resultId: 'r', segmentId: 's', segmentVersion: 1, type: 'totalVolume', metricKey: 'totalVolume', value: 6000, label: 'Total volume', timestamp: 1_700_000_000_000, createdAt: 1_700_000_000_000 }],
    };
  }
  return base;
}

mock.module('@/services/analytics/query', () => ({
  parseQuery: (raw: string) => ({ raw, agg: 'sum', metric: '', filters: [], groupBy: [] }),
  QueryService: class {},
  queryService: {
    runQuery: mock(async () => resultOf(queryResultKind)),
    run: mock(async () => resultOf(queryResultKind)),
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

beforeEach(() => {
  sampleDataPresent = false;
  queryResultKind = 'scalar';
});

describe('AnalyticsDashboardPage', () => {
  it('renders the header and range selector', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    expect(screen.getByText('Coaching Dashboard — Training Block Review')).toBeDefined();
    expect(screen.getByText('4w')).toBeDefined();
    expect(screen.getByText('8w')).toBeDefined();
    expect(screen.getByText('16w')).toBeDefined();
  });

  it('renders all demo widgets without crashing when widgets have data', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    expect(screen.getByText('Avg TIS')).toBeDefined();
    expect(screen.getByText('Total volume')).toBeDefined();
    expect(screen.getByText('Volume by effort')).toBeDefined();
    expect(screen.getByText('Weekly tonnage')).toBeDefined();
  });

  it('shows Load sample data prompt when all widgets are empty', async () => {
    sampleDataPresent = false;
    queryResultKind = 'empty';

    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Facts appear when you log or run workouts.')).not.toBeNull());
    expect(screen.getByText('Load sample data')).toBeDefined();
  });

  it('shows purge banner when sample data is present', async () => {
    sampleDataPresent = true;

    renderPage();
    await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Sample data loaded')).not.toBeNull(), { timeout: 3000 });
    expect(screen.getByText('Purge sample data')).toBeDefined();
  });

  it('toggles the dashboard source view', async () => {
    renderPage();
    const button = await waitFor(() => screen.getByText('View as note'));
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('Hide note source')).toBeDefined());
    expect(screen.getByText(/range: past_16_weeks/)).toBeDefined();
  });
});
