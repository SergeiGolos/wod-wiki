import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { parseQuery, type QueryResult } from '@/services/analytics/query';

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
    parsed: parseQuery(raw),
    series: [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
  };
}

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  QueryService: class {},
  queryService: {
    runQuery: mock(async (raw: string) => resultOf(raw)),
    run: mock(async () => resultOf('sum:totalVolume{}')),
    getFactsByTimeRange: mock(async () => []),
  },
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
});
