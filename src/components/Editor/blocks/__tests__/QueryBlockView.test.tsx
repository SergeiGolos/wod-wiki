/**
 * QueryBlockView tests (#801) — verifies the atomic ```query renderer dispatches
 * find vs analytics through the (mocked) QueryService and renders the right
 * surface: a chart for analytics, a list for find, an error for bad WQL.
 *
 * parseQuery / isFindQuery stay real (the dispatch contract under test); only
 * queryService.runQuery / runFind are stubbed — same seam as the Explorer tests.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { parseQuery, isFindQuery, type QueryResult, type FindQueryResult, type ParsedQuery } from '@/services/analytics/query';
import { DashboardBlockView, parseDashboardQueries } from '../DashboardBlockView';

const runQuery = mock(async (_raw: string): Promise<QueryResult> => scalarResult('sum:totalVolume{}'));
const runFind = mock(async (parsed: ParsedQuery): Promise<FindQueryResult> => ({
  parsed: parsed as unknown as FindQueryResult['parsed'],
  notes: [{ id: 'n1', title: 'Fran', createdAt: 0, type: 'note' } as never],
  blocks: [],
  stages: { selected: 1, matched: 1 },
}));

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  queryService: { runQuery, runFind },
}));

import { QueryBlockView } from '../QueryBlockView';

function scalarResult(raw: string): QueryResult {
  return {
    parsed: parseQuery(raw) as ParsedQuery,
    series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 0, value: 4200 }], unit: 'lb' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 0 },
    matched: [],
  };
}

afterEach(() => { cleanup(); runQuery.mockClear(); runFind.mockClear(); });

describe('QueryBlockView', () => {
  it('renders an analytics query as a chart (scalar)', async () => {
    render(<QueryBlockView query="sum:totalVolume{}" />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    expect(runFind).not.toHaveBeenCalled();
    // QueryValue renders the scalar value.
    await waitFor(() => expect(screen.getByText(/4,?200/)).toBeTruthy());
  });

  it('renders a find query as a note list', async () => {
    render(<QueryBlockView query="find:note{tags:pr}" />);
    await waitFor(() => expect(runFind).toHaveBeenCalledTimes(1));
    expect(runQuery).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Fran')).toBeTruthy());
    expect(screen.getByText(/1 of 1 notes matched/)).toBeTruthy();
  });

  it('renders a parse error inline', () => {
    render(<QueryBlockView query="not a query" />);
    // No run should happen for an unparseable query.
    expect(runQuery).not.toHaveBeenCalled();
    expect(runFind).not.toHaveBeenCalled();
    expect(screen.getByText(/Cannot parse/i)).toBeTruthy();
  });
});

describe('DashboardBlockView', () => {
  it('splits the body into one query per non-empty, non-comment line', () => {
    expect(parseDashboardQueries('sum:a{}\n# header\n\nfind:note{x}\n')).toEqual([
      'sum:a{}', 'find:note{x}',
    ]);
  });

  it('stacks each line as a separate query execution', async () => {
    render(<DashboardBlockView body={'sum:a{}\nsum:b{}'} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(2));
  });

  it('renders an empty-state hint when the body has no queries', () => {
    render(<DashboardBlockView body={'# just a comment\n'} />);
    expect(screen.getByText(/Empty dashboard/i)).toBeTruthy();
  });
});
