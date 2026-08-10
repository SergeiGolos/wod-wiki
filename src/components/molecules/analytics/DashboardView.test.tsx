/**
 * DashboardView tests (#900 / #899) — the unified route-mode renderer consumes
 * a parsed dashboard note: markdown association becomes card chrome, tokens
 * render as controls and substitute at execution time, spans lay out on the
 * grid, and bad widget/token references badge loudly instead of executing.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  parseQuery,
  isFindQuery,
  type QueryResult,
  type ParsedQuery,
} from '@/services/analytics/query';
import { buildDashboardDocument, type DashboardSectionInput } from '@/lib/dashboard/model';

const runQuery = mock(async (raw: string): Promise<QueryResult> => ({
  parsed: parseQuery(raw) as ParsedQuery,
  series: [{ key: 'm', label: 'm', points: [{ ts: 0, value: 42 }], unit: 'kg' }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 0 },
  matched: [],
}));

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  queryService: { runQuery, runFind: mock(async () => ({})) },
}));
mock.module('@/services/analytics/rollup', () => ({
  ensureStoreRollupFacts: mock(async () => undefined),
}));

import { DashboardView } from './DashboardView';

afterEach(() => {
  cleanup();
  runQuery.mockClear();
});

const md = (subtype: string, content: string): DashboardSectionInput => ({
  type: 'markdown',
  subtype,
  content,
});
const query = (content: string, extra: Partial<DashboardSectionInput> = {}): DashboardSectionInput => ({
  type: 'query',
  content,
  ...extra,
});

function makeDocument(
  sections: DashboardSectionInput[],
  meta: Record<string, string | number | string[]> = {},
) {
  return buildDashboardDocument(sections, { dashboard: 'true', title: 'Test Board', ...meta });
}

describe('DashboardView', () => {
  it('renders one card per query block with markdown-associated chrome', async () => {
    const doc = makeDocument([
      md('heading', '## Weekly tonnage'),
      md('paragraph', 'Is volume rising?'),
      query('sum:totalVolume{} by {week}.rollup(1w)', { widgetType: 'timeseries', spanCols: 2 }),
      md('heading', '## Total volume'),
      query('sum:totalVolume{}', { widgetType: 'value' }),
    ]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Weekly tonnage')).toBeTruthy();
    expect(screen.getByText('Is volume rising?')).toBeTruthy();
    expect(screen.getByText('Total volume')).toBeTruthy();
  });

  it('falls back to the query text for untitled widgets', async () => {
    const doc = makeDocument([query('sum:totalVolume{}')]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText('sum:totalVolume{}').length).toBeGreaterThan(0);
  });

  it('substitutes $token refs at execution time (#899-6)', async () => {
    const doc = makeDocument(
      [query('sum:sessionLoad{intensity:$intensity}')],
      { 'dashboard.intensity': ['low', 'high'] },
    );
    render(<DashboardView document={doc} />);
    // Default = first list entry.
    await waitFor(() => expect(runQuery.mock.calls[0]?.[0]).toBe('sum:sessionLoad{intensity:low}'));
  });

  it('reflects control selections in the executed query', async () => {
    const doc = makeDocument(
      [query('sum:sessionLoad{intensity:$intensity}')],
      { 'dashboard.intensity': ['low', 'high'] },
    );
    render(<DashboardView document={doc} tokenValues={{ intensity: 'high' }} />);
    await waitFor(() => expect(runQuery.mock.calls[0]?.[0]).toBe('sum:sessionLoad{intensity:high}'));
  });

  it('fires onTokenChange from the segmented control', async () => {
    const onTokenChange = mock(() => {});
    const doc = makeDocument(
      [query('sum:sessionLoad{intensity:$intensity}')],
      { 'dashboard.intensity': ['low', 'moderate', 'high'] },
    );
    render(<DashboardView document={doc} onTokenChange={onTokenChange} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('moderate'));
    expect(onTokenChange).toHaveBeenCalledWith('intensity', 'moderate');
  });

  it('renders controls statically when read-only (no onTokenChange)', async () => {
    const doc = makeDocument(
      [query('sum:x{}')],
      { 'dashboard.weeks': 16 },
    );
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    const controls = screen.getByTestId('dashboard-token-controls');
    expect(controls.textContent).toContain('$weeks');
    expect(controls.textContent).toContain('16');
    expect(controls.querySelector('input')).toBeNull();
  });

  it('badges unknown tokens without executing that widget (#899-6)', async () => {
    const doc = makeDocument([query('sum:sessionLoad{intensity:$nope}')]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(screen.getByTestId('widget-problem').textContent).toContain('$nope');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('badges unknown widget types without executing (#899)', async () => {
    const doc = makeDocument([query('sum:x{}', { widgetType: 'bogus' })]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(screen.getByTestId('widget-problem').textContent).toContain('bogus');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('renders goal-rings and zone-distribution widget types (#901)', async () => {
    const doc = makeDocument(
      [
        query('max:calc.e1rm{} / $goal', { widgetType: 'goal-rings' }),
        query('sum:sessionLoad{} by {intensity} / 80 0 20', { widgetType: 'zone-distribution' }),
      ],
      { 'dashboard.goal': 240 },
    );
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(screen.getByTestId('goal-rings')).toBeTruthy());
    expect(screen.getByTestId('zone-distribution')).toBeTruthy();
  });

  it('renders proposed metrics with a ProposedMetricBadge (#901)', async () => {
    // calc.pmc is the only remaining proposed calc metric (the composite
    // PMC series — ctl/atl/tsb ship individually instead, #905).
    const doc = makeDocument([query('avg:calc.pmc{}', { widgetType: 'value' })]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(screen.getByTestId('widget-proposed-metric')).toBeTruthy());
    expect(screen.getByTestId('widget-proposed-metric').textContent).toContain('calc.pmc');
  });

  it('applies span classes from the fence suffix', async () => {
    const doc = makeDocument([
      query('sum:a{}', { widgetType: 'timeseries', spanCols: 2 }),
      query('sum:b{}', { widgetType: 'bar', spanFull: true }),
      query('sum:c{}'),
    ]);
    const { container } = render(<DashboardView document={doc} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(3));
    const frames = container.querySelectorAll('.grid > div');
    expect(frames[0].querySelector('.xl\\:col-span-2')).toBeTruthy();
    expect(frames[1].querySelector('.xl\\:col-span-4')).toBeTruthy();
    expect(frames[2].querySelector('.xl\\:col-span-4')).toBeNull();
  });

  it('surfaces the edit affordance only when the host offers editing', async () => {
    const doc = makeDocument([query('sum:x{}')]);
    const { unmount } = render(<DashboardView document={doc} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('edit-widget-w0')).toBeNull();
    unmount();

    const onEditQuery = mock((_widget: { query: string }) => {});
    render(<DashboardView document={doc} onEditQuery={onEditQuery} />);
    await waitFor(() => expect(screen.getByTestId('edit-widget-w0')).toBeTruthy());
    fireEvent.click(screen.getByTestId('edit-widget-w0'));
    expect(onEditQuery).toHaveBeenCalledTimes(1);
    expect(onEditQuery.mock.calls[0][0].query).toBe('sum:x{}');
  });

  it('badges find: queries as inline-only in dashboard composition', async () => {
    const doc = makeDocument([query('find:note{tags:pr}')]);
    render(<DashboardView document={doc} />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(screen.getByTestId('widget-problem').textContent).toContain('find:');
  });
});
