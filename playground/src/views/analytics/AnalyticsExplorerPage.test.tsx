import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { parseQuery, type QueryResult, type ParsedQuery } from '@/services/analytics/query';

// CodeMirror cannot run under jsdom; replace the raw code editor with a plain input.
mock.module('@/components/organisms/editor/WqlQueryField', () => ({
  WqlQueryField: (props: { value: string; onChange: (value: string) => void }) =>
    React.createElement('input', {
      value: props.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(e.target.value),
      'data-testid': 'wql-query-field',
    }),
}));

function resultOf(raw: string): QueryResult {
  return {
    parsed: parseQuery(raw) as ParsedQuery,
    series: [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
  };
}

function scalarResult(raw: string): QueryResult {
  return {
    parsed: parseQuery(raw) as ParsedQuery,
    series: [{ key: 'total', label: 'total', points: [{ ts: Date.now(), value: 42 }], unit: 'kg' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 0 },
    matched: [{ timestamp: Date.now(), value: 42, metricKey: 'totalVolume' } as unknown as QueryResult['matched'][number]],
  };
}

let runQueryCallCount = 0;
let runQueryImpl = async (raw: string) => {
  runQueryCallCount++;
  return resultOf(raw);
};

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  QueryService: class {},
  queryService: {
    runQuery: mock(async (raw: string) => runQueryImpl(raw)),
    run: mock(async () => resultOf('sum:totalVolume{}')),
    getFactsByTimeRange: mock(async () => []),
  },
}));

let sampleDataPresent = false;

mock.module('@/services/analytics/sample', () => ({
  loadSampleData: mock(async () => { sampleDataPresent = true; return { facts: 120 }; }),
  purgeSampleData: mock(async () => { sampleDataPresent = false; }),
  hasSampleData: mock(async () => sampleDataPresent),
}));

import { AnalyticsExplorerPage } from './AnalyticsExplorerPage';

afterEach(cleanup);

function renderPage(initialQuery: string) {
  return render(
    <MemoryRouter initialEntries={[`/analytics/explorer?q=${encodeURIComponent(initialQuery)}`]} initialIndex={0}>
      <NuqsAdapter>
        <AnalyticsExplorerPage />
      </NuqsAdapter>
    </MemoryRouter>,
  );
}

describe('AnalyticsExplorerPage', () => {
  beforeEach(() => {
    runQueryCallCount = 0;
    runQueryImpl = async (raw: string) => {
      runQueryCallCount++;
      return resultOf(raw);
    };
  });

  it('updates parsed chips while editing before running the query', async () => {
    renderPage('');

    // Choose an example query that has a tag filter.
    const exampleButton = await waitFor(() => screen.getByText('Weekly strength volume'));
    fireEvent.click(exampleButton);

    // Wait for the initial run to complete and the filter chip to appear.
    await waitFor(() => expect(screen.queryByText('discipline:strength')).not.toBeNull());

    // Remove the filter using the visual composer; this should not submit a new query.
    const removeButton = screen.getByText('✕');
    fireEvent.click(removeButton);

    // The chip should disappear immediately because the anatomy is driven by the live draft.
    await waitFor(() => expect(screen.queryByText('discipline:strength')).toBeNull());
  });

  it('empty state offers Load sample data when store is empty', async () => {
    sampleDataPresent = false;
    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Facts appear when you log or run workouts.')).not.toBeNull());
    expect(screen.getByText('Load sample data')).toBeDefined();
  });

  it('shows a purge banner when sample data is present', async () => {
    sampleDataPresent = true;

    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryAllByText('Sample data loaded').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Purge sample data').length).toBeGreaterThan(0);
  });

  it('shows the purge banner even when the active query returns results', async () => {
    sampleDataPresent = true;
    runQueryImpl = async (raw: string) => {
      runQueryCallCount++;
      return scalarResult(raw);
    };

    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('42')).not.toBeNull());
    await waitFor(() => expect(screen.queryAllByText('Sample data loaded').length).toBe(1));
    expect(screen.getByText('Purge sample data')).toBeDefined();
  });

  it('purges sample data from the Explorer banner and re-runs the active query', async () => {
    sampleDataPresent = true;
    runQueryImpl = async (raw: string) => {
      runQueryCallCount++;
      return scalarResult(raw);
    };

    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('42')).not.toBeNull());

    const callsBeforePurge = runQueryCallCount;

    const purgeButton = screen.getByText('Purge sample data');
    fireEvent.click(purgeButton);

    await waitFor(() => expect(screen.queryByText('Sample data loaded')).toBeNull());
    expect(runQueryCallCount).toBeGreaterThan(callsBeforePurge);
  });
});
