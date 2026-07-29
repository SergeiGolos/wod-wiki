/**
 * ScopeBlockSearch tests (#802) — the WQL content search added to Collections
 * and Feeds. Verifies it composes `find:block{text:<q>} in <scope>` through the
 * (mocked) QueryService and renders the matching blocks.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { BlockIndexRow } from '@/types/storage';
// Re-export the real module surface so this mock doesn't starve other
// consumers when test files share a process.
import * as QueryModule from '@/services/analytics/query';
import type { FindQueryResult } from '@/services/analytics/query';

const runFind = mock(async (): Promise<FindQueryResult> => ({
  parsed: { target: 'block', filters: [] },
  notes: [],
  blocks: [
    { id: 'b1', noteId: 'crossfit-girls', segmentId: 's1', segmentVersion: 1, dataType: 'wod',
      blockContentId: 'bc-fran', rawContent: '21-15-9 Thrusters 95lb', noteTitle: 'Fran',
      createdAt: 0, sourceId: 'collection:crossfit-girls' },
  ] as BlockIndexRow[],
  stages: { selected: 1, matched: 1 },
}));

mock.module('@/services/analytics/query', () => ({ ...QueryModule, queryService: { runFind } }));

import { ScopeBlockSearch } from '../ScopeBlockSearch';

afterEach(() => { cleanup(); runFind.mockClear(); });

describe('ScopeBlockSearch', () => {
  it('composes find:block{text} in <scope> through the engine', async () => {
    render(<ScopeBlockSearch scope="collections" />);
    fireEvent.change(screen.getByLabelText('Search collections content'), { target: { value: 'thruster' } });
    await waitFor(() => expect(runFind).toHaveBeenCalledTimes(1));
    expect(runFind.mock.calls[0][0]).toMatchObject({
      target: 'block',
      scope: 'collections',
      filters: [{ key: 'text', values: [{ value: 'thruster' }] }],
    });
  });

  it('renders matching blocks after a search', async () => {
    render(<ScopeBlockSearch scope="feeds" />);
    fireEvent.change(screen.getByLabelText('Search feeds content'), { target: { value: 'fran' } });
    await waitFor(() => expect(screen.getByText('Fran')).toBeTruthy());
    expect(screen.getByText(/21-15-9/)).toBeTruthy();
  });

  it('does not query while the input is empty', () => {
    render(<ScopeBlockSearch scope="collections" />);
    expect(runFind).not.toHaveBeenCalled();
  });

  it('fires onSelectBlock with the clicked block', async () => {
    const onSelect = mock(() => {});
    render(<ScopeBlockSearch scope="collections" onSelectBlock={onSelect} />);
    fireEvent.change(screen.getByLabelText('Search collections content'), { target: { value: 'x' } });
    await waitFor(() => expect(screen.getByText('Fran')).toBeTruthy());
    fireEvent.click(screen.getByText('Fran'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].sourceId).toBe('collection:crossfit-girls');
  });
});
