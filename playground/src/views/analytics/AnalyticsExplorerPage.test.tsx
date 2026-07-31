import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../../tests/helpers/repair-react-router-dom';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { isFindQuery, parseQuery, type FindQueryResult, type ParsedFindQuery, type QueryResult, type ParsedQuery } from '@/services/analytics/query';

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

function findResultOf(raw: string): FindQueryResult {
  return {
    parsed: parseQuery(raw) as ParsedFindQuery,
    notes: [],
    blocks: [],
    stages: { selected: 0, matched: 0 },
  };
}

// Page runs carry { rangeStart, rangeEnd, preferredUnit } options; the
// diagnostics-strip executor calls runQuery(ast.raw) bare. Tests use the
// argument shape to tell the two apart (run-on-submit vs live counts).
let runQueryCalls: Array<{ raw: string; hasOptions: boolean }> = [];
let runQueryImpl = async (raw: string) => resultOf(raw);
let runFindCalls: string[] = [];

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  QueryService: class {},
  queryService: {
    runQuery: mock(async (raw: string, options?: unknown) => {
      runQueryCalls.push({ raw, hasOptions: options !== undefined });
      return runQueryImpl(raw);
    }),
    runFind: mock(async (ast: ParsedFindQuery) => {
      runFindCalls.push(ast.raw);
      return findResultOf(ast.raw);
    }),
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

let capturedNavigate: ReturnType<typeof useNavigate>;
function NavProbe() {
  capturedNavigate = useNavigate();
  return null;
}

function renderPage(initialQuery: string) {
  const suffix = initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : '';
  return render(
    <MemoryRouter initialEntries={[`/analytics/explorer${suffix}`]} initialIndex={0}>
      <NavProbe />
      <AnalyticsExplorerPage />
    </MemoryRouter>,
  );
}

const pageRuns = () => runQueryCalls.filter((c) => c.hasOptions).map((c) => c.raw);

describe('AnalyticsExplorerPage', () => {
  beforeEach(() => {
    runQueryCalls = [];
    runFindCalls = [];
    runQueryImpl = async (raw: string) => resultOf(raw);
  });

  it('renders the shared WqlComposer in place of the legacy WqlQueryComposer', () => {
    renderPage('');
    expect(screen.getByTestId('wql-composer')).toBeDefined();
    // Legacy composer markers are gone.
    expect(screen.queryByText('Composition Mode:')).toBeNull();
    expect(screen.queryByTestId('wql-query-field')).toBeNull();
  });

  it('hydrates the composer from ?q= and runs the query', async () => {
    renderPage('sum:totalVolume{discipline:strength} by {week}.rollup(1w)');

    expect(screen.getByTestId('token-slot-source').textContent).toContain('metrics');
    expect(screen.getByTestId('token-slot-metric').textContent).toContain('totalVolume');
    expect(screen.getByTestId('token-slot-discipline').textContent).toContain('strength');

    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{discipline:strength} by {week}.rollup(1w)'));
  });

  it('updates parsed chips while editing before running the query', async () => {
    renderPage('');

    // Choose an example query that has a tag filter.
    const exampleButton = await waitFor(() => screen.getByText('Weekly strength volume'));
    fireEvent.click(exampleButton);

    // Wait for the initial run to complete and the filter chip to appear.
    await waitFor(() => expect(screen.queryByText('discipline:strength')).not.toBeNull());

    // Remove the filter using the composer pill; this should not submit a new query.
    fireEvent.click(screen.getByTestId('token-slot-remove-discipline'));

    // The chip should disappear immediately because the anatomy is driven by the live draft.
    await waitFor(() => expect(screen.queryByText('discipline:strength')).toBeNull());
  });

  it('runs on submit only: edits do not re-run, Run Query runs the current draft', async () => {
    renderPage('sum:totalVolume{discipline:strength} by {week}.rollup(1w)');
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{discipline:strength} by {week}.rollup(1w)'));

    // Edit the draft (remove the discipline filter) — no page run may follow.
    fireEvent.click(screen.getByTestId('token-slot-remove-discipline'));
    await waitFor(() => expect(screen.getByTestId('token-slot-metric')).toBeDefined());
    expect(pageRuns()).not.toContain('sum:totalVolume by {week}.rollup(1w)');

    // Submit via the Run button — the page runs the edited draft.
    fireEvent.click(screen.getByTestId('run-query'));
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume by {week}.rollup(1w)'));
  });

  it('restores composer state on browser back and re-runs the restored query', async () => {
    renderPage('');

    fireEvent.click(await waitFor(() => screen.getByText('Weekly strength volume')));
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('totalVolume'));

    fireEvent.click(screen.getByText('Thruster time-in-motion'));
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('tis'));

    const runsBeforeBack = pageRuns().length;

    // Back restores the previous composer state…
    capturedNavigate(-1);
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('totalVolume'));
    expect(screen.getByTestId('token-slot-discipline').textContent).toContain('strength');

    // …and re-runs what it restored.
    await waitFor(() => expect(pageRuns().length).toBeGreaterThan(runsBeforeBack));
    expect(pageRuns()[pageRuns().length - 1]).toBe('sum:totalVolume{discipline:strength} by {week}.rollup(1w)');
  });

  it('sidebar metric selection populates the composer and submits', async () => {
    renderPage('');

    fireEvent.click(await waitFor(() => screen.getByText('tis')));
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('tis'));
    await waitFor(() => expect(pageRuns()).toContain('sum:tis'));
  });

  it('dispatches find queries through runFind', async () => {
    renderPage('');

    fireEvent.click(await waitFor(() => screen.getByText('Find PR notes')));
    await waitFor(() => expect(runFindCalls).toContain('find:note{tags:pr} in journal'));
    await waitFor(() => expect(screen.queryByText('No notes found.')).not.toBeNull());
  });

  it('runs a non-composer-restorable deep link (negated filter) and still shows pipeline telemetry', async () => {
    // The clause model cannot restore `!tags:fran` (wqlToClauses returns null),
    // but the query must still run and PipelineAnatomy must still appear —
    // the legacy page showed telemetry for any deep-linked q.
    renderPage('sum:totalVolume{!tags:fran}');

    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{!tags:fran}'));
    await waitFor(() => expect(screen.queryByText(/1\. SELECT/)).not.toBeNull());
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
    runQueryImpl = async (raw: string) => scalarResult(raw);

    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('42')).not.toBeNull());
    await waitFor(() => expect(screen.queryAllByText('Sample data loaded').length).toBe(1));
    expect(screen.getByText('Purge sample data')).toBeDefined();
  });

  it('purges sample data from the Explorer banner and re-runs the active query', async () => {
    sampleDataPresent = true;
    runQueryImpl = async (raw: string) => scalarResult(raw);

    renderPage('sum:totalVolume{}');

    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
    await waitFor(() => expect(screen.queryByText('42')).not.toBeNull());

    const callsBeforePurge = runQueryCalls.length;

    const purgeButton = screen.getByText('Purge sample data');
    fireEvent.click(purgeButton);

    await waitFor(() => expect(screen.queryByText('Sample data loaded')).toBeNull());
    expect(runQueryCalls.length).toBeGreaterThan(callsBeforePurge);
  });
});
