import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../../tests/helpers/repair-react-router-dom';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { isFindQuery, parseQuery, type QueryResult, type ParsedFindQuery } from '@/services/analytics/query';

import type { HistoryEntry } from '@/types/history';

afterEach(cleanup);

let sampleDataPresent = false;
let queryResultKind: 'empty' | 'scalar' = 'scalar';
let runQueryCalls: string[] = [];
let mockNotes: HistoryEntry[] = [];
let updateNoteCalls: { id: string, raw: string }[] = [];

mock.module('@/services/analytics/sample', () => ({
  loadSampleData: mock(async () => ({ facts: 120 })),
  purgeSampleData: mock(async () => undefined),
  hasSampleData: mock(async () => sampleDataPresent),
}));

mock.module('@/services/persistence', () => ({
  notePersistence: {
    listNotes: mock(async () => mockNotes),
  },
}));

// The page imports journalNotes relatively (playground/src/services is outside
// the `@` alias) — the mock specifier must match the same resolved module.
mock.module('../../services/journalNotes', () => ({
  journalNotes: {
    update: mock(async (id: string, raw: string) => {
      updateNoteCalls.push({ id, raw });
      return {};
    }),
  },
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

import { AnalyticsDashboardPage } from './AnalyticsDashboardPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/analytics/dashboard']} initialIndex={0}>
      <NuqsAdapter>
        <AnalyticsDashboardPage />
      </NuqsAdapter>
    </MemoryRouter>,
  );
}

const DEFAULT_DASHBOARD = `---
dashboard: true
title: My Active Dashboard
dashboard.weeks: 4
---

## Total Volume
What is my volume?
\`\`\`query:value
sum:totalVolume{tags:pr}
\`\`\`

## Average TIS
Is it hard?

\`\`\`query:value
avg:tis{}
\`\`\`
`;

beforeEach(() => {
  sampleDataPresent = false;
  queryResultKind = 'scalar';
  runQueryCalls = [];
  updateNoteCalls = [];
  mockNotes = [
    {
      id: 'note-1',
      title: 'My Active Dashboard',
      rawContent: DEFAULT_DASHBOARD,
      createdAt: 0,
      updatedAt: 0,
      targetDate: 0,
      type: 'note',
      tags: [],
      schemaVersion: 1,
    }
  ];
});

describe('AnalyticsDashboardPage', () => {
  it('renders the empty state when no dashboard note is found', async () => {
    mockNotes = [];
    renderPage();
    await waitFor(() => expect(screen.getByText('No active dashboard found')).toBeDefined());
    expect(screen.getByText(/Create a note and add/)).toBeDefined();
  });

  it('renders the header and range selector from active dashboard note', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('My Active Dashboard')).toBeDefined());
    expect(screen.getByTestId('dashboard-view')).toBeDefined();
  });
  it('renders widgets from the parsed note', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('dashboard-view')).toBeDefined());
    expect(screen.getByText('Total Volume')).toBeDefined();
    expect(screen.getByText('Average TIS')).toBeDefined();
    expect(screen.getByText('What is my volume?')).toBeDefined();
  });

  it('shows purge banner when sample data is present', async () => {
    sampleDataPresent = true;

    renderPage();
    await waitFor(() => expect(screen.queryByText('Sample data loaded')).not.toBeNull(), { timeout: 3000 });
    expect(screen.getByText('Purge sample data')).toBeDefined();
  });

  it('renders shared WqlComposer in modal when editing a widget query', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('dashboard-view')).toBeDefined());
    
    fireEvent.click(screen.getByTestId('edit-widget-w0'));
    await waitFor(() => expect(screen.getByTestId('widget-query-modal')).toBeDefined());
    expect(screen.getByTestId('wql-composer')).toBeDefined();
  });

  it('composes and applies updated query back to the active note', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('dashboard-view')).toBeDefined());
    
    fireEvent.click(screen.getByTestId('edit-widget-w0'));
    await waitFor(() => expect(screen.getByTestId('widget-query-modal')).toBeDefined());
    // Edit the query by removing the tag filter
    fireEvent.click(screen.getByTestId('token-slot-remove-tag'));
    
    // Wait for validity to resolve after edit
    await waitFor(() => expect(screen.getByTestId('apply-widget-query').getAttribute('disabled')).toBeNull());
    fireEvent.click(screen.getByTestId('apply-widget-query'));

    await waitFor(() => expect(screen.queryByTestId('widget-query-modal')).toBeNull());

    // Should have updated the note (fences preserved; empty {} braces drop
    // in the clause round-trip)
    expect(updateNoteCalls.length).toBe(1);
    expect(updateNoteCalls[0].id).toBe('note-1');
    expect(updateNoteCalls[0].raw).toContain('```query:value\nsum:totalVolume\n```');
  });

  it('disables Apply button and flags inline diagnostic error when composed WQL is invalid', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('dashboard-view')).toBeDefined());
    
    fireEvent.click(screen.getByTestId('edit-widget-w0'));
    await waitFor(() => expect(screen.getByTestId('widget-query-modal')).toBeDefined());

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
