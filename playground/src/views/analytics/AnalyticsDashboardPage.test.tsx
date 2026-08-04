import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../../tests/helpers/repair-react-router-dom';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { isFindQuery, parseQuery, type QueryResult, type ParsedFindQuery } from '@/services/analytics/query';
import { AnalyticsDashboardPage } from './AnalyticsDashboardPage';

afterEach(cleanup);

let sampleDataPresent = false;
let queryResultKind: 'empty' | 'scalar' = 'scalar';
let runQueryCalls: string[] = [];

mock.module('@/services/analytics/sample', () => ({
  loadSampleData: mock(async () => ({ facts: 120 })),
  purgeSampleData: mock(async () => undefined),
  hasSampleData: mock(async () => sampleDataPresent),
}));

function resultOf(kind: 'empty' | 'error' | 'scalar', raw?: string): QueryResult {
  const base = {
    parsed: { raw: raw ?? '', agg: 'sum' as const, metric: '', filters: [], groupBy: [] },
    series: [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
  };
  if (kind === 'error') {
    return { ...base, parsed: { ...base.parsed, raw: raw ?? 'bad', error: 'Cannot parse "bad".' } };
  }
  if (kind === 'scalar') {
    return {
      ...base,
      parsed: { ...base.parsed, raw: raw ?? 'sum:totalVolume{}', metric: 'totalVolume' },
      series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1_700_000_000_000, value: 6000 }] }],
      stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
      scalar: 6000,
      matched: [{ id: 'scalar', noteId: 'n', resultId: 'r', segmentId: 's', segmentVersion: 1, type: 'totalVolume', metricKey: 'totalVolume', value: 6000, label: 'Total volume', timestamp: 1_700_000_000_000, createdAt: 1_700_000_000_000 }],
    };
  }
  return base;
}

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  QueryService: class {},
  queryService: {
    runQuery: mock(async (raw: string) => {
      runQueryCalls.push(raw);
      return resultOf(queryResultKind, raw);
    }),
    runFind: mock(async (ast: ParsedFindQuery) => ({
      parsed: ast,
      notes: [],
      blocks: [],
      stages: { selected: 0, matched: 0 },
    })),
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

async function openComposerFor(widgetKey: string) {
  renderPage();
  await waitFor(() => expect(screen.queryByText('Loading widgets…')).toBeNull());
  fireEvent.click(screen.getByTestId(`edit-widget-${widgetKey}`));
  await waitFor(() => expect(screen.getByTestId('widget-query-modal')).toBeDefined());
}

beforeEach(() => {
  sampleDataPresent = false;
  queryResultKind = 'scalar';
  runQueryCalls = [];
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

  it('renders shared WqlComposer in modal when editing a widget query', async () => {
    await openComposerFor('avgTis');

    expect(screen.getByTestId('wql-composer')).toBeDefined();
    expect(screen.queryByText('Composition Mode:')).toBeNull();
  });

  it('composes and applies updated query to widget pipeline', async () => {
    await openComposerFor('avgTis');

    runQueryCalls = [];
    fireEvent.click(screen.getByTestId('apply-widget-query'));
    await waitFor(() => expect(screen.queryByTestId('widget-query-modal')).toBeNull());

    // The widget query was passed to the dashboard widget query pipeline (avg:tis)
    await waitFor(() => expect(runQueryCalls).toContain('avg:tis'));
  });

  it('disables Apply button and flags inline diagnostic error when composed WQL is invalid', async () => {
    await openComposerFor('avgTis');

    // Remove the metric clause to create an incomplete/invalid WQL query
    fireEvent.click(screen.getByTestId('token-slot-remove-metric'));
    // Inline diagnostics badge highlights the error
    await waitFor(() => expect(screen.getByTestId('wql-validity-badge').getAttribute('data-valid')).toBe('false'));
    expect(screen.getByTestId('apply-widget-query').getAttribute('disabled')).not.toBeNull();

    // Clicking disabled Apply button does not close modal
    fireEvent.click(screen.getByTestId('apply-widget-query'));
    expect(screen.getByTestId('widget-query-modal')).toBeDefined();
  });
});
