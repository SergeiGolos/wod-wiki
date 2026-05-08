import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';

import { localDateKey } from './queriable-list/JournalDateScroll';

type JournalState = {
  dateParam: string;
  setDateParam: (value: string) => void;
  selectedTags: string[];
};

let journalState: JournalState;
let navigateCalls: string[] = [];

// Captured props passed to JournalFeed so we can inspect what dates are shown
let capturedFeedProps: { dateKeys: string[]; showEmptyDates: boolean } | null = null;

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string) => {
    navigateCalls.push(to);
  },
  useSearchParams: () => [
    { get: (_key: string) => null },
    mock(() => {}),
  ],
}));

mock.module('@/components/command-palette/CommandContext', () => ({
  useCommandPalette: () => ({
    setIsOpen: mock(() => {}),
    setStrategy: mock(() => {}),
  }),
}));

const TODAY = localDateKey(new Date());
const PAST_DATE = '2026-01-15';

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getRecentResults: async () => [
      {
        id: 'r1',
        noteId: `journal/${PAST_DATE}`,
        completedAt: new Date(PAST_DATE + 'T10:00:00').getTime(),
        data: { completed: true },
      },
    ],
  },
}));

mock.module('../services/playgroundDB', () => ({
  playgroundDB: {
    getPagesByCategory: async () => [
      {
        id: `journal/${TODAY}`,
        content: '# Today workout',
        updatedAt: Date.now(),
      },
    ],
  },
}));

mock.module('../hooks/useJournalQueryState', () => ({
  useJournalQueryState: () => journalState,
}));

mock.module('./JournalFeed', () => ({
  JournalFeed: (props: any) => {
    capturedFeedProps = { dateKeys: props.dateKeys, showEmptyDates: props.showEmptyDates };
    return <div data-testid="journal-feed" />;
  },
}));

const pageModule = import('./ListViews');

describe('JournalWeeklyPage', () => {
  beforeEach(() => {
    journalState = {
      dateParam: '',
      setDateParam: mock(() => {}),
      selectedTags: [],
    };
    navigateCalls = [];
    capturedFeedProps = null;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('feed mode: shows all dates that have records when no date is selected', async () => {
    const { JournalWeeklyPage } = await pageModule;
    render(<JournalWeeklyPage onSelect={() => {}} />);

    await waitFor(() => expect(capturedFeedProps).toBeTruthy());

    // Should include today (journal entry) and the past date (result)
    expect(capturedFeedProps?.dateKeys).toContain(TODAY);
    expect(capturedFeedProps?.dateKeys).toContain(PAST_DATE);
    // Feed mode: empty dates not shown
    expect(capturedFeedProps?.showEmptyDates).toBe(false);
    // Descending order
    expect(capturedFeedProps!.dateKeys[0]! >= capturedFeedProps!.dateKeys[1]!).toBe(true);
  });

  it('filter mode: shows only the selected date when dateParam is set', async () => {
    journalState = { ...journalState, dateParam: PAST_DATE };
    const { JournalWeeklyPage } = await pageModule;
    render(<JournalWeeklyPage onSelect={() => {}} />);

    await waitFor(() => expect(capturedFeedProps).toBeTruthy());

    expect(capturedFeedProps?.dateKeys).toEqual([PAST_DATE]);
    // Filter mode: show empty dates so the user sees the date even with no activity
    expect(capturedFeedProps?.showEmptyDates).toBe(true);
  });

  it('does not update dateParam from scrolling (no scroll tracking)', async () => {
    const { JournalWeeklyPage } = await pageModule;
    render(<JournalWeeklyPage onSelect={() => {}} />);

    // No callback that could update dateParam is exposed — verify setDateParam is never called
    await waitFor(() => expect(capturedFeedProps).toBeTruthy());
    expect(journalState.setDateParam).not.toHaveBeenCalled();
  });

  it('navigates to the journal entry page when a note is opened', async () => {
    const { JournalWeeklyPage } = await pageModule;
    // Re-capture onOpenEntry from JournalFeed props
    let capturedOnOpenEntry: ((key: string) => void) | null = null;
    mock.module('./JournalFeed', () => ({
      JournalFeed: (props: any) => {
        capturedFeedProps = { dateKeys: props.dateKeys, showEmptyDates: props.showEmptyDates };
        capturedOnOpenEntry = props.onOpenEntry;
        return <div data-testid="journal-feed" />;
      },
    }));

    render(<JournalWeeklyPage onSelect={() => {}} />);
    await waitFor(() => expect(capturedOnOpenEntry).toBeTruthy());

    capturedOnOpenEntry!(TODAY);
    expect(navigateCalls).toContain(`/journal/${TODAY}`);
  });
});
