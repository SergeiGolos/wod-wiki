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
import { parseQuery, isFindQuery, isRowsQuery, type QueryResult, type FindQueryResult, type ParsedQuery, type RowsQueryResult, type ParsedRowsQuery } from '@/services/analytics/query';

const runQuery = mock(async (_raw: string): Promise<QueryResult> => scalarResult('sum:totalVolume{}'));
const runFind = mock(async (parsed: ParsedQuery): Promise<FindQueryResult> => ({
  parsed: parsed as unknown as FindQueryResult['parsed'],
  notes: [{ id: 'n1', title: 'Fran', createdAt: 0, type: 'note' } as never],
  blocks: [],
  stages: { selected: 1, matched: 1 },
}));
const runRows = mock(async (parsed: ParsedRowsQuery): Promise<RowsQueryResult> => ({
  parsed,
  runs: [{ result: { id: 'rA' } as never, logs: [] }],
}));

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  isRowsQuery,
  queryService: { runQuery, runFind, runRows },
}));

mock.module('@/components/molecules/analytics/RowsTable', () => ({
  RowsTable: ({ result }: { result: RowsQueryResult }) => <div data-testid="rows-table">{result.runs.length} runs</div>,
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

afterEach(() => { cleanup(); runQuery.mockClear(); runFind.mockClear(); runRows.mockClear(); });

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

  it('dispatches the fence-suffix widget type over shape inference (#899)', async () => {
    render(<QueryBlockView query="sum:totalVolume{}" widgetType="timeseries" />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    // A scalar result under an explicit timeseries type renders the chart,
    // not the scalar QueryValue fallback.
    expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('badges unknown widget types without executing', async () => {
    render(<QueryBlockView query="sum:totalVolume{}" widgetType="bogus" />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(screen.getByTestId('widget-problem').textContent).toContain('bogus');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('badges malformed suffixes via widgetError without executing', async () => {
    render(<QueryBlockView query="sum:totalVolume{}" widgetType="bar" widgetError="span 9 outside 1..4" />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('substitutes $token refs from the note frontmatter before executing (#899-6)', async () => {
    render(<QueryBlockView query="sum:sessionLoad{intensity:$intensity}" tokenValues={{ intensity: 'low' }} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    expect(runQuery).toHaveBeenCalledWith('sum:sessionLoad{intensity:low}');
  });

  it('badges unknown $token refs without executing (#899-6)', async () => {
    render(<QueryBlockView query="sum:sessionLoad{intensity:$intensity}" tokenValues={{}} />);
    await waitFor(() => expect(screen.getByTestId('widget-problem')).toBeTruthy());
    expect(screen.getByTestId('widget-problem').textContent).toContain('$intensity');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('strips trailing / widget params before executing (#899-7)', async () => {
    render(<QueryBlockView query="max:calc.e1rm{} / $goal" tokenValues={{ goal: '240' }} />);
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(1));
    expect(runQuery).toHaveBeenCalledWith('max:calc.e1rm{}');
  });

  it('renders a rows query through runRows + RowsTable (#949)', async () => {
    render(<QueryBlockView query="rows:{result:rA}" />);
    await waitFor(() => expect(runRows).toHaveBeenCalledTimes(1));
    expect(runQuery).not.toHaveBeenCalled();
    expect(runFind).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('rows-table')).toBeTruthy());
  });
});
