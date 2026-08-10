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
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { parseQuery, isFindQuery, isRowsQuery, type QueryResult, type FindQueryResult, type ParsedQuery, type RowsQueryResult, type ParsedRowsQuery } from '@/services/analytics/query';

const runQuery = mock(async (_raw: string): Promise<QueryResult> => scalarResult('sum:totalVolume{}'));
const runFind = mock(async (parsed: ParsedQuery): Promise<FindQueryResult> => ({
  parsed: parsed as unknown as FindQueryResult['parsed'],
  notes: [{ id: 'n1', title: 'Fran', createdAt: 0, type: 'note' } as never],
  blocks: [],
  stages: { selected: 1, matched: 1 },
}));
const defaultRowsResult = async (parsed: ParsedRowsQuery): Promise<RowsQueryResult> => ({
  parsed,
  runs: [{ result: { id: 'rA', data: { logs: [] } } as never, logs: [] }],
});
const runRows = mock(defaultRowsResult);
const captureSessionRpeMock = mock(async (_resultId: string, _rpe: number) => 'captured' as const);

mock.module('@/services/analytics/query', () => ({
  parseQuery,
  isFindQuery,
  isRowsQuery,
  queryService: { runQuery, runFind, runRows },
}));

import { notifyResultSaved } from '@/services/resultRecorder';

mock.module('@/components/molecules/analytics/RowsTable', () => ({
  RowsTable: ({ result, renderRunHeaderExtra }: { result: RowsQueryResult; renderRunHeaderExtra?: (run: RowsQueryResult['runs'][number]) => React.ReactNode }) => (
    <div data-testid="rows-table">
      {result.runs.length} runs
      {renderRunHeaderExtra ? result.runs.map((run) => (
        <span key={run.result.id} data-testid={`run-header-${run.result.id}`}>{renderRunHeaderExtra(run)}</span>
      )) : null}
    </div>
  ),
}));

mock.module('@/services/analytics/captureSessionRpe', () => ({
  captureSessionRpe: captureSessionRpeMock,
  // Inline copy of the pure read (the write/read pair lives in the real module).
  readSessionRpe: (logs: Array<{ outputType?: string; metrics: Array<{ type: string; origin?: string; value: unknown }> }> | undefined) => {
    if (!logs) return undefined;
    for (const statement of logs) {
      if (statement.outputType !== 'segment') continue;
      const metric = statement.metrics.find((m) => m.type === 'session-rpe' && m.origin === 'user');
      if (metric && typeof metric.value === 'number') return metric.value;
    }
    return undefined;
  },
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

afterEach(() => { cleanup(); runQuery.mockClear(); runFind.mockClear(); runRows.mockClear(); captureSessionRpeMock.mockClear(); runRows.mockImplementation(defaultRowsResult); });

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

  // ── Results chrome (#948): widen toggle + inline RPE on rows:{result:…} ──

  const sessionRun = {
    result: { id: 'rA', blockContentId: 'bc1', data: { logs: [] } } as never,
    logs: [],
  };
  const pastRun = {
    result: {
      id: 'rB',
      blockContentId: 'bc1',
      data: {
        logs: [{
          id: 1,
          outputType: 'segment',
          timeSpan: { started: 1, ended: 1 },
          metrics: [{ type: 'session-rpe', value: 8, origin: 'user', image: 'rpe: 8' }],
          sourceBlockKey: 'block-1',
          stackLevel: 0,
        }],
      },
    } as never,
    logs: [],
  };
  const sessionThenWide: typeof defaultRowsResult = async (parsed) => ({
    parsed,
    runs: parsed.filters.some((f) => f.key === 'block') ? [sessionRun, pastRun] : [sessionRun],
  });

  it('offers the widen toggle + RPE chip on a session rows block, disabled without other versions', async () => {
    render(<QueryBlockView query="rows:{result:rA}" />);
    await waitFor(() => expect(screen.getByTestId('widen-toggle')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('rpe-chip-rA')).toBeTruthy());
    // Default fixture: no blockContentId → wide fetch skipped → disabled.
    const allVersions = screen.getByText('All versions') as HTMLButtonElement;
    expect(allVersions.disabled).toBe(true);
  });

  it('renders no chrome on a plain block-scoped rows block', async () => {
    render(<QueryBlockView query="rows:{block:bc1}" />);
    await waitFor(() => expect(screen.getByTestId('rows-table')).toBeTruthy());
    expect(screen.queryByTestId('widen-toggle')).toBeNull();
  });

  it('widens to cross-version history ephemerally — the note query is never touched', async () => {
    runRows.mockImplementation(sessionThenWide);
    const onSaveQuery = mock(() => {});
    render(<QueryBlockView query="rows:{result:rA}" onSaveQuery={onSaveQuery} />);
    await waitFor(() => expect(screen.getByTestId('rows-table').textContent).toContain('1 runs'));

    const allVersions = screen.getByText('All versions') as HTMLButtonElement;
    await waitFor(() => expect(allVersions.disabled).toBe(false));
    fireEvent.click(allVersions);
    await waitFor(() => expect(screen.getByTestId('rows-table').textContent).toContain('2 runs'));
    // Current run stays editable in its section header; the past run shows its RPE read-only.
    expect(screen.getByTestId('run-header-rA').querySelector('[data-testid="rpe-chip-rA"]')).toBeTruthy();
    const pastHeader = screen.getByTestId('run-header-rB');
    expect(pastHeader.querySelector('[data-testid="rpe-readonly-rB"]')?.textContent).toBe('RPE 8');
    expect(pastHeader.querySelector('button')).toBeNull();
    expect(onSaveQuery).not.toHaveBeenCalled();

    // Back to the session view without touching the note.
    fireEvent.click(screen.getByText('This session'));
    await waitFor(() => expect(screen.getByTestId('rows-table').textContent).toContain('1 runs'));
    expect(onSaveQuery).not.toHaveBeenCalled();
  });

  it('captures RPE inline via captureSessionRpe and re-runs the query', async () => {
    render(<QueryBlockView query="rows:{result:rA}" />);
    await waitFor(() => expect(screen.getByTestId('rpe-chip-rA')).toBeTruthy());
    fireEvent.click(screen.getByTestId('rpe-chip-rA').querySelector('button')!);
    await waitFor(() => expect(screen.getByTestId('rpe-scale-rA')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('RPE 7'));
    await waitFor(() => expect(captureSessionRpeMock).toHaveBeenCalledWith('rA', 7));
    // One initial run + one refresh after capture.
    await waitFor(() => expect(runRows.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
  it('re-runs the query when notifyResultSaved fires after workout persistence', async () => {
    render(<QueryBlockView query="rows:{result:rA}" />);
    await waitFor(() => expect(runRows).toHaveBeenCalledTimes(1));

    act(() => {
      notifyResultSaved({ id: 'rA', noteId: 'n1', segmentId: 's1', origin: 'journal', data: { logs: [] }, createdAt: Date.now() });
    });

    await waitFor(() => expect(runRows.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
