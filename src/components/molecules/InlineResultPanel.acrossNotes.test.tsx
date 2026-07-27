import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import type { HistoryEntry } from '@/types/history';
import type { INotePersistence } from '@/services/persistence';
import type { WorkoutResult } from '@/types/storage';
import type { InlineResultPanelProps } from './InlineResultPanel';

const getSimilarWorkoutResults = mock<NonNullable<INotePersistence['getSimilarWorkoutResults']>>(
  async () => []
);
const getNote = mock<INotePersistence['getNote']>(async () => makeNoteEntry('Other Note'));

mock.module('@/services/persistence', () => ({
  notePersistence: {
    getSimilarWorkoutResults,
    getNote,
  },
}));

mock.module('@/stores/workbenchSessionStore', () => {
  const overrides = new Map();
  return {
    useWorkbenchSession: (selector?: (state: unknown) => unknown) => {
      const state = {
        userOutputOverrides: overrides,
        viewMode: 'track',
        execution: { status: 'idle' },
      };
      return selector ? selector(state) : state;
    },
  };
});

// Dynamic import is required so the `@/services/persistence` mock is registered
// before the module under test evaluates its dependency on the singleton.
let InlineResultPanel: ComponentType<InlineResultPanelProps>;

function makeResult(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  const now = Date.now();
  return {
    id: 'result-id',
    noteId: 'other-note',
    blockContentId: 'content-id',
    data: { completed: true, startTime: now - 1000, endTime: now, duration: 1000 },
    createdAt: now,
    ...overrides,
  };
}

function makeNoteEntry(title: string): HistoryEntry {
  return {
    id: 'note-id',
    title,
    createdAt: 0,
    updatedAt: 0,
    targetDate: 0,
    rawContent: '',
    tags: [],
    schemaVersion: 1,
  };
}

describe('InlineResultPanel across-notes', () => {
  beforeEach(async () => {
    const mod = await import('./InlineResultPanel');
    InlineResultPanel = mod.InlineResultPanel;
    getSimilarWorkoutResults.mockClear();
    getNote.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders nothing when the API returns an empty list', async () => {
    getSimilarWorkoutResults.mockImplementation(async () => []);
    render(
      <InlineResultPanel
        sectionId="s"
        allResults={[]}
        currentContentId="content-id"
        noteId="current-note"
      />
    );

    await waitFor(() => {
      expect(getSimilarWorkoutResults).toHaveBeenCalledWith(
        'content-id',
        expect.objectContaining({ excludeNoteId: 'current-note', limit: 10 })
      );
    });
    expect(screen.queryByRole('button', { name: /Across notes/i })).toBeNull();
  });

  it('renders the section with rows and resolves note titles', async () => {
    getSimilarWorkoutResults.mockImplementation(async () => [
      makeResult({
        id: 'r1',
        noteId: 'note-a',
        data: { completed: true, startTime: 1, endTime: 2, duration: 1 },
      }),
      makeResult({
        id: 'r2',
        noteId: 'note-b',
        data: { completed: false, startTime: 1, endTime: 2, duration: 1 },
      }),
    ]);
    getNote.mockImplementation(async (locator) => {
      const id = typeof locator === 'string' ? locator : '';
      if (id === 'note-a') return makeNoteEntry('Alpha Note');
      if (id === 'note-b') return makeNoteEntry('Beta Note');
      return makeNoteEntry('Unknown');
    });
    const onOpenReview = mock((_result: WorkoutResult) => {});

    render(
      <InlineResultPanel
        sectionId="s"
        allResults={[]}
        currentContentId="content-id"
        noteId="current-note"
        onOpenReview={onOpenReview}
      />
    );

    await screen.findByText(/Across notes/i);

    // Expand the section so the rows render.
    fireEvent.click(screen.getByText(/Across notes/i));

    await screen.findByText('Alpha Note');
    await screen.findByText('Beta Note');
    expect(screen.getByText(/Completed/)).toBeTruthy();
    expect(screen.getByText(/Partial/)).toBeTruthy();

    fireEvent.click(screen.getByText('Alpha Note'));
    await waitFor(() =>
      expect(onOpenReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }))
    );
  });

  it('calls getSimilarWorkoutResults without includePlayground', async () => {
    getSimilarWorkoutResults.mockImplementation(async () => []);
    render(
      <InlineResultPanel
        sectionId="s"
        allResults={[]}
        currentContentId="content-id"
        noteId="current-note"
      />
    );

    await waitFor(() => expect(getSimilarWorkoutResults).toHaveBeenCalled());
    const calls = getSimilarWorkoutResults.mock.calls as [string, { includePlayground?: boolean }][];
    expect(calls[0][1]).not.toHaveProperty('includePlayground');
  });
});
