import { afterEach, describe, expect, it, mock } from 'bun:test';
/**
 * QueryBlockView tests (#801, #842) — verifies the atomic ```query renderer dispatches
 * find vs analytics through the (mocked) QueryService and renders the right
 * surface: a chart for analytics, a list for find, an error for bad WQL, and
 * opens WqlQueryInspectorModal on edit button click.
 *
 * parseQuery / isFindQuery stay real (the dispatch contract under test); only
 * queryService.runQuery / runFind are stubbed — same seam as the Explorer tests.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('extracts query from YAML block content', async () => {
    const yamlQuery = `title: Weekly Volume\nquery: sum:totalVolume{}\nspan: 2`;
    render(<QueryBlockView query={yamlQuery} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
  });

  it('renders edit button when onSaveQuery is supplied and opens modal inspector', async () => {
    const onSaveQuery = mock((_q: string, _idx?: number) => {});
    render(<QueryBlockView query="sum:totalVolume{}" onSaveQuery={onSaveQuery} />);

    const editBtn = screen.getByTestId('edit-query-block');
    expect(editBtn).toBeDefined();

    fireEvent.click(editBtn);
    expect(screen.getByTestId('query-inspector-modal')).toBeDefined();

    const applyBtn = screen.getByTestId('apply-query-inspector');
    fireEvent.click(applyBtn);

    expect(onSaveQuery).toHaveBeenCalledWith('sum:totalVolume', 0);
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

  it('passes onSaveQuery to each child query view with correct query index', async () => {
    const onSaveQuery = mock((_q: string, _idx: number) => {});
    render(<DashboardBlockView body={'sum:a{}\nsum:b{}'} onSaveQuery={onSaveQuery} />);

    const editBtns = screen.getAllByTestId('edit-query-block');
    expect(editBtns).toHaveLength(2);

    fireEvent.click(editBtns[1]);
    expect(screen.getByTestId('query-inspector-modal')).toBeDefined();

    fireEvent.click(screen.getByTestId('apply-query-inspector'));
    expect(onSaveQuery).toHaveBeenCalledWith('sum:b', 1);
  });
});
