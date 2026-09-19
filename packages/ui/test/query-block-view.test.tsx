import { describe, expect, it, vi, afterEach   } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { QueryResult } from '@bitcobblers/wod-wiki-wql';
import { QueryBlockView, type QueryExecutor } from '../src';

afterEach(cleanup);

function mockScalarResult(raw: string, value = 42): QueryResult {
  return {
    parsed: { family: 'aggregate', raw, agg: 'sum', metric: 'reps', filters: [], groupBy: [] },
    series: [{ key: 'scalar', label: 'reps', points: [{ ts: 1000, value }], unit: 'reps' }],
    stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
    matched: [],
    scalar: value,
    unit: 'reps',
  };
}

describe('QueryBlockView with injected QueryExecutor and onResultSaved', () => {
  it('executes scalar query via injected QueryExecutor and renders result', async () => {
    const runQuery = vi.fn(async (q: string) => mockScalarResult(q, 84));
    const executor: QueryExecutor = {
      runQuery,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
    };

    render(<QueryBlockView query="sum:reps{}" executor={executor} />);

    await waitFor(() => {
      expect(runQuery).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('84')).toBeDefined();
    });
  });

  it('subscribes to onResultSaved callback prop for refresh notifications', async () => {
    let savedCallback: (() => void) | undefined;
    const onResultSaved = vi.fn((cb: () => void) => {
      savedCallback = cb;
      return () => {
        savedCallback = undefined;
      };
    });

    const runQuery = vi.fn(async (q: string) => mockScalarResult(q, 10));
    const executor: QueryExecutor = {
      runQuery,
      runFind: vi.fn(async () => ({} as any)),
      runRows: vi.fn(async () => ({} as any)),
    };

    render(
      <QueryBlockView
        query="sum:reps{}"
        executor={executor}
        onResultSaved={onResultSaved}
      />,
    );

    expect(onResultSaved).toHaveBeenCalled();
    expect(savedCallback).toBeDefined();
  });

  it('renders find:note results as interactive links with noteHref and onOpenNote', async () => {
    const onOpenNote = vi.fn();
    const noteHref = vi.fn((note: { id: string }) => `/note/${note.id}`);
    const executor: QueryExecutor = {
      runQuery: vi.fn(async () => ({} as never)),
      runFind: vi.fn(async () => ({
        parsed: { family: 'find', raw: 'find:note', target: 'note', filters: [] },
        notes: [{ id: 'note-1', title: 'Fran Benchmark' }],
        blocks: [],
        stages: { selected: 1, matched: 1 },
      } as never)),
      runRows: vi.fn(async () => ({} as never)),
    };

    render(
      <QueryBlockView
        query="find:note"
        executor={executor}
        onOpenNote={onOpenNote}
        noteHref={noteHref}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Fran Benchmark')).toBeDefined();
    });

    const link = screen.getByText('Fran Benchmark').closest('a');
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe('/note/note-1');
  });
});
