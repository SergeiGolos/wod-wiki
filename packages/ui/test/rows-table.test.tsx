import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import type { RowsQueryResult } from '@bitcobblers/wod-wiki-wql';
import { RowsTable } from '../src';

afterEach(cleanup);

const segmentEvent = {
  id: 'test-run-1:1',
  grain: 'event',
  outputType: 'segment',
  timeSpan: { started: 0, ended: 60_000 },
  metrics: [{ type: 'effort', value: 'Burpees' }, { type: 'rep', value: 20 }],
};

const soundEvent = {
  id: 'test-run-1:2',
  grain: 'event',
  outputType: 'event',
  timeSpan: { started: 60_000, ended: 66_000 },
  metrics: [{ type: 'sound', value: 'beep' }],
};

function rowsResultWith(...eventSets: Array<typeof segmentEvent>[]): RowsQueryResult {
  return {
    parsed: {
      family: 'rows',
      raw: 'rows:{result:test-run-1}',
      filters: [{ key: 'result', negate: false, values: [{ value: 'test-run-1', wildcard: false }] }],
    },
    runs: eventSets.map((events, i) => ({
      resultId: `test-run-${i + 1}`,
      noteId: 'note-1',
      timestamp: 1_700_000_000_000,
      events,
    })),
  } as unknown as RowsQueryResult;
}

describe('RowsTable — the Session Results Table', () => {
  it('renders the shared statement table, defaulting to segment rows', () => {
    render(<RowsTable result={rowsResultWith([segmentEvent, soundEvent])} />);
    expect(screen.getByTestId('rows-table')).toBeDefined();
    const table = screen.getByTestId('output-statements-table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('widens to all output types via the All preset pill', () => {
    render(<RowsTable result={rowsResultWith([segmentEvent, soundEvent])} />);
    fireEvent.click(screen.getByTestId('output-filter-preset-all'));
    const table = screen.getByTestId('output-statements-table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders per-run headers and run chrome for multi-run results', () => {
    render(
      <RowsTable
        result={rowsResultWith([segmentEvent], [soundEvent])}
        renderRunHeaderExtra={(run) => <span>extra-{run.resultId}</span>}
      />,
    );
    expect(screen.getByText('extra-test-run-1')).toBeDefined();
    expect(screen.getByText('extra-test-run-2')).toBeDefined();
    expect(screen.getAllByTestId('output-statements-table')).toHaveLength(2);
  });

  it('shows the no-logs empty state when the query matches no runs', () => {
    render(
      <RowsTable
        result={{ parsed: { family: 'rows', raw: 'rows:{}', filters: [] }, runs: [] } as unknown as RowsQueryResult}
      />,
    );
    expect(screen.getByText('No workout logs matched this rows query.')).toBeDefined();
  });

  it('shows the no-statements empty state for a run without events', () => {
    render(<RowsTable result={rowsResultWith([])} />);
    // The Card List (below sm) and the table (sm+) both mount; each carries
    // its breakpoint's empty-state copy.
    expect(screen.getAllByText('No output statements recorded for this run.').length).toBe(2);
  });
});
