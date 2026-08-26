import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../tests/helpers/repair-react-router-dom';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { parseQuery, type FindQueryResult, type ParsedAggregateQuery, type ParsedFindQuery, type QueryResult } from '@bitcobblers/wod-wiki-engine';

function resultOf(raw: string): QueryResult {
  return {
    parsed: parseQuery(raw) as ParsedAggregateQuery,
    series: [],
    stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    matched: [],
  };
}

function scalarResult(raw: string): QueryResult {
  return {
    parsed: parseQuery(raw) as ParsedAggregateQuery,
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

// A feed note with a parseable date — feeds the date-grouped find results.
const FEED_NOTE = {
  id: 'feeds/stronglifts/2026-07-01--5x5',
  title: 'StrongLifts 5×5',
  createdAt: Date.parse('2026-07-01T10:00:00Z'),
  type: 'note',
  sourceId: 'feed:stronglifts',
  catalog: 'stronglifts',
} as unknown as FindQueryResult['notes'][number];

// Page runs carry { rangeStart, rangeEnd, preferredUnit } options; the
// diagnostics-strip executor calls runQuery(ast.raw) bare. Tests use the
// argument shape to tell the two apart (run-on-submit vs live counts).
let runQueryCalls: Array<{ raw: string; hasOptions: boolean }> = [];
let runQueryImpl = async (raw: string) => resultOf(raw);
let runFindCalls: string[] = [];
let runFindImpl = async (raw: string) => findResultOf(raw);

mock.module('@/services/queryService', () => ({
  queryService: {
    runQuery: mock(async (raw: string, options?: unknown) => {
      runQueryCalls.push({ raw, hasOptions: options !== undefined });
      return runQueryImpl(raw);
    }),
    runFind: mock(async (parsed: { raw?: string }) => {
      runFindCalls.push(parsed.raw ?? '');
      return runFindImpl(parsed.raw ?? '');
    }),
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

/** Examples live in the command-bar combo box — open it first. */
async function clickExample(label: string) {
  fireEvent.click(screen.getByTestId('explorer-examples'));
  const menu = await waitFor(() => screen.getByTestId('explorer-examples-menu'));
  fireEvent.click(within(menu).getByText(label));
}

describe('AnalyticsExplorerPage', () => {
  beforeEach(() => {
    runQueryCalls = [];
    runFindCalls = [];
    runQueryImpl = async (raw: string) => resultOf(raw);
    runFindImpl = async (raw: string) => findResultOf(raw);
  });

  it('lands on a valid default draft — no parse error, grammar as placeholder', () => {
    renderPage('');

    // The first-visit state is calm: a seeded valid draft, not `sum:`.
    expect(screen.queryByText(/Cannot parse/)).toBeNull();
    expect(screen.getByTestId('draft-validity').textContent).toContain('valid');
    expect(screen.getByTestId('wql-composer-input').getAttribute('placeholder')).toContain('agg:metric{filters}');
  });

  it('resets the examples combo to its placeholder after a manual edit', async () => {
    renderPage('');
    expect(screen.getByTestId('explorer-examples').textContent).toContain('Examples…');

    await clickExample('Weekly strength volume');
    await waitFor(() => expect(screen.getByTestId('explorer-examples').textContent).toContain('Weekly strength volume'));

    // A manual edit means the running query is no longer that example.
    fireEvent.click(screen.getByTestId('token-slot-remove-discipline'));
    await waitFor(() => expect(screen.getByTestId('explorer-examples').textContent).toContain('Examples…'));
  });

  it('keeps the combo label for examples whose WQL normalizes on restore', async () => {
    renderPage('');

    // Empty braces drop in the clause round-trip ('avg:tis{} by {round}'
    // restores as 'avg:tis by {round}') — the label must still claim the
    // running example until the draft is edited.
    await clickExample('TIS by round');
    await waitFor(() => expect(pageRuns()).toContain('avg:tis{} by {round}'));
    expect(screen.getByTestId('explorer-examples').textContent).toContain('TIS by round');
  });

  it('hides pipeline anatomy behind the Inspect pipeline disclosure', async () => {
    renderPage('sum:totalVolume{}');
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{}'));

    // Collapsed by default; stage counts appear once opened.
    expect(screen.queryByTestId('pipeline-anatomy')).toBeNull();
    fireEvent.click(await waitFor(() => screen.getByTestId('inspect-pipeline')));
    await waitFor(() => expect(screen.getByTestId('pipeline-anatomy')).toBeDefined());
  });

  it('renders find results in the Library date-grouped format', async () => {
    runFindImpl = async (raw: string) => ({
      ...findResultOf(raw),
      notes: [FEED_NOTE],
      stages: { selected: 1, matched: 1 },
    });
    renderPage('');

    await clickExample('Find PR notes');

    // The shared entry pipeline renders the same grouped rows as the Library.
    await waitFor(() => expect(screen.getByTestId('library-group-count').textContent).toBe('1'));
    expect(screen.getByTestId('library-row-post').textContent).toContain('StrongLifts 5×5');
  });

  it('Save opens the two-stage dialog seeded with the subset', async () => {
    renderPage('find:note{tags:pr,source:journal}');
    await waitFor(() => expect(screen.getByTestId('save-query')).toBeDefined());

    fireEvent.click(screen.getByTestId('save-query'));

    // Stage 1: the find query is the subset (data source).
    expect(screen.getByTestId('dashboard-subset-query').textContent).toContain('find:note{tags:pr,source:journal}');
    // Stage 2: the calculation composer seeds the subset as its where join…
    await waitFor(() => expect(screen.getByTestId('token-slot-where').textContent).toContain('find:note{tags:pr,source:journal}'));
    // …and the combined WQL previews live.
    await waitFor(() => expect(screen.getByTestId('dashboard-combined-query').textContent).toContain('where find:note{tags:pr,source:journal}'));
    // Apply is deferred — dashboard wiring is a follow-up.
    expect(screen.getByTestId('dashboard-apply').getAttribute('disabled')).not.toBeNull();
  });

  it('shows the records behind a calculation as a Library-style list', async () => {
    runFindImpl = async (raw: string) => ({
      ...findResultOf(raw),
      notes: raw.includes('tags:pr') ? [FEED_NOTE] : [],
      stages: { selected: 1, matched: 1 },
    });
    renderPage('sum:totalVolume{tags:pr} by {week}');

    // Chart pipeline ran…
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{tags:pr} by {week}'));
    // …and the derived records query sits behind the Records disclosure.
    expect(screen.queryByTestId('records-wql')).toBeNull();
    fireEvent.click(await waitFor(() => screen.getByTestId('records-toggle')));
    await waitFor(() => expect(screen.getByTestId('records-wql').textContent).toBe('find:note{tags:pr} last 16w'));
    await waitFor(() => expect(screen.getByTestId('library-row-post').textContent).toContain('StrongLifts 5×5'));
  });

  it('keeps range and units in the options menu; examples live in the command-bar combo', async () => {
    renderPage('sum:totalVolume{}');
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{}'));

    // The options menu no longer hosts examples.
    fireEvent.click(screen.getByTestId('explorer-options'));
    await waitFor(() => expect(screen.getByText('Past 4 weeks')).toBeDefined());
    expect(screen.queryByText('Weekly strength volume')).toBeNull();

    // Changing the range re-runs the submitted analytics query.
    const runsBefore = pageRuns().length;
    fireEvent.click(screen.getByText('Past 4 weeks'));
    await waitFor(() => expect(pageRuns().length).toBeGreaterThan(runsBefore));

    // Examples moved to the command-bar combo box.
    fireEvent.click(screen.getByTestId('explorer-examples'));
    const menu = await waitFor(() => screen.getByTestId('explorer-examples-menu'));
    expect(within(menu).getByText('Weekly strength volume')).toBeDefined();
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
    await clickExample('Weekly strength volume');

    // The parsed chips render inside the Inspect pipeline disclosure.
    fireEvent.click(await waitFor(() => screen.getByTestId('inspect-pipeline')));

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
    expect(pageRuns()).not.toContain('sum:totalVolume{} by {week}.rollup(1w)');

    // Submit via the Run button — the page runs the edited draft.
    fireEvent.click(screen.getByTestId('run-query'));
    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{} by {week}.rollup(1w)'));
  });

  it('restores composer state on browser back and re-runs the restored query', async () => {
    renderPage('');

    await clickExample('Weekly strength volume');
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('totalVolume'));

    await clickExample('Thruster time-in-motion');
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

  it('meta-line metric chip selection populates the composer and submits', async () => {
    renderPage('');

    fireEvent.click(await waitFor(() => screen.getByText('tis')));
    await waitFor(() => expect(screen.getByTestId('token-slot-metric').textContent).toContain('tis'));
    await waitFor(() => expect(pageRuns()).toContain('sum:tis{}'));
  });

  it('dispatches find queries through runFind', async () => {
    renderPage('');

    await clickExample('Find PR notes');
    await waitFor(() => expect(runFindCalls).toContain('find:note{tags:pr,source:journal}'));
    await waitFor(() => expect(screen.queryByText('No notes found.')).not.toBeNull());
  });

  it('runs a non-composer-restorable deep link (negated filter) and still shows pipeline telemetry', async () => {
    // The clause model cannot restore `!tags:fran` (wqlToClauses returns null),
    // but the query must still run and PipelineAnatomy must still appear —
    // the legacy page showed telemetry for any deep-linked q.
    renderPage('sum:totalVolume{!tags:fran}');

    await waitFor(() => expect(pageRuns()).toContain('sum:totalVolume{!tags:fran}'));
    fireEvent.click(await waitFor(() => screen.getByTestId('inspect-pipeline')));
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
