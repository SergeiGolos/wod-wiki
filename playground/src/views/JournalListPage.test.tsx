import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, waitFor } from '@testing-library/react';

import { localDateKey } from './queriable-list/JournalDateScroll';
import type { JournalViewMode } from '../hooks/useJournalQueryState';

/**
 * useJournalQueryState stubbed shape. The journal-page tests need:
 *   dateParam / setDateParam   — the ?s= filter param
 *   mode                        — the ?mode= view-mode param
 *   setMode                     — toggle writer (unused in current tests)
 *   selectedDate / setSelectedDate / selectedTags / toggleTag are not exercised here
 */
type JournalState = {
  dateParam: string;
  setDateParam: (value: string) => void;
  mode: JournalViewMode;
  setMode: (value: JournalViewMode) => void;
};

let journalState: JournalState;
let navigateCalls: string[] = [];
let showPlaygroundsValue = false;

// Captured props passed to JournalFeed so tests can inspect what dates / items / window are shown
type CapturedFeedProps = {
  dateKeys: string[];
  showEmptyDates: boolean;
  items: unknown[];
  createNoteDates: string[];
  visibleItemsCount: number;
};
let capturedFeedProps: CapturedFeedProps | null = null;

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string) => {
    navigateCalls.push(to);
  },
  useSearchParams: () => [
    { get: (_key: string) => null },
    mock(() => {}),
  ],
}));

const TODAY = localDateKey(new Date());
const PAST_DATE = '2026-01-15';
const PLAYGROUND_DATE = '2026-01-14';

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getRecentResults: async () => [
      {
        id: 'r1',
        noteId: `journal/${PAST_DATE}`,
        createdAt: new Date(PAST_DATE + 'T10:00:00').getTime(),
        data: { completed: true },
      },
      {
        id: 'r2',
        noteId: 'playground/abc-123',
        createdAt: new Date(PLAYGROUND_DATE + 'T10:00:00').getTime(),
        data: { completed: true },
      },
    ],
  },
}));

mock.module('@/services/persistence', () => ({
  notePersistence: {
    listNotes: async () => [
      {
        id: '00000000-0000-4000-8000-000000000001',
        journalDate: TODAY,
        title: 'Today workout',
        rawContent: '# Today workout',
        updatedAt: Date.now(),
      },
    ],
  },
}));

mock.module('../hooks/useJournalQueryState', () => ({
  useJournalQueryState: () => journalState,
}));

mock.module('../hooks/useShowPlaygrounds', () => ({
  useShowPlaygrounds: () => [showPlaygroundsValue, (_v: boolean) => {}],
}));

mock.module('../hooks/useCreateJournalEntry', () => ({
  useCreateJournalEntry: () => mock(() => Promise.resolve()),
}));

mock.module('./JournalFeed', () => ({
  JournalFeed: (props: {
    dateKeys: string[];
    showEmptyDates: boolean;
    items: unknown[];
    createNoteDates: string[];
  }) => {
    capturedFeedProps = {
      dateKeys: props.dateKeys,
      showEmptyDates: props.showEmptyDates,
      items: props.items,
      createNoteDates: Array.from(props.createNoteDates ?? []),
      visibleItemsCount: props.items.length,
    }
    return <div data-testid="journal-feed" />;
  },
}));

const pageModule = import('./JournalListPage');

function dayOffset(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

describe('JournalListPage — view-mode windowing', () => {
  beforeEach(() => {
    journalState = {
      dateParam: '',
      setDateParam: mock(() => {}),
      mode: 'all',
      setMode: mock(() => {}),
    }
    navigateCalls = []
    showPlaygroundsValue = false
    capturedFeedProps = null
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it("mode='all': window spans past + today + future planning window (default)", async () => {
    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedFeedProps).toBeTruthy())

    // Past (history) dates appear
    expect(capturedFeedProps!.dateKeys).toContain(TODAY)
    expect(capturedFeedProps!.dateKeys).toContain(PAST_DATE)

    // Future dates appear (default 14-day horizon)
    const futureDay = dayOffset(7)
    expect(capturedFeedProps!.dateKeys).toContain(futureDay)

    // Past-results overlay still rendered in 'all' mode
    expect(capturedFeedProps!.visibleItemsCount).toBeGreaterThan(0)

    // Empty slots surface their create-note card (every date without an entry)
    expect(capturedFeedProps!.showEmptyDates).toBe(true)
  })

  it("mode='today': window is today only", async () => {
    journalState = { ...journalState, mode: 'today' }
    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedFeedProps).toBeTruthy())

    expect(capturedFeedProps!.dateKeys).toEqual([TODAY])
  })

  it("mode='history': window is past dates + today (no future)", async () => {
    journalState = { ...journalState, mode: 'history' }
    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedFeedProps).toBeTruthy())

    expect(capturedFeedProps!.dateKeys).toContain(TODAY)
    expect(capturedFeedProps!.dateKeys).toContain(PAST_DATE)

    const futureDay = dayOffset(7)
    expect(capturedFeedProps!.dateKeys).not.toContain(futureDay)
  })

  it("mode='plan': window is today + future planning; no past-results overlay", async () => {
    journalState = { ...journalState, mode: 'plan' }
    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedFeedProps).toBeTruthy())

    // Today is the first key
    expect(capturedFeedProps!.dateKeys[0]).toBe(TODAY)

    // Forward window starts with today (ascending), so far-future days must be present
    const futureDay = dayOffset(14)
    expect(capturedFeedProps!.dateKeys).toContain(futureDay)

    // Past dates with results must NOT appear (plan view is forward-only)
    expect(capturedFeedProps!.dateKeys).not.toContain(PAST_DATE)

    // Past-results overlay is hidden
    expect(capturedFeedProps!.visibleItemsCount).toBe(0)

    // Every empty future date is a create-note card
    expect(capturedFeedProps!.createNoteDates.length).toBeGreaterThan(0)
  })

  it('focused date overrides the window regardless of mode', async () => {
    journalState = { ...journalState, dateParam: PAST_DATE, mode: 'plan' }
    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedFeedProps).toBeTruthy())

    expect(capturedFeedProps!.dateKeys).toEqual([PAST_DATE])
    // Filter mode: empty dates surface (matches JournalListPage focused-date semantics)
    expect(capturedFeedProps!.showEmptyDates).toBe(true)
  })

  it('navigates to /journal/:id when a date is opened', async () => {
    let capturedOnOpenEntry: ((key: string) => void) | null = null
    mock.module('./JournalFeed', () => ({
      JournalFeed: (props: {
        dateKeys: string[];
        showEmptyDates: boolean;
        items: unknown[];
        createNoteDates: string[];
        onOpenEntry?: (k: string) => void;
      }) => {
        capturedFeedProps = {
          dateKeys: props.dateKeys,
          showEmptyDates: props.showEmptyDates,
          items: props.items,
          createNoteDates: Array.from(props.createNoteDates ?? []),
          visibleItemsCount: props.items.length,
        }
        capturedOnOpenEntry = props.onOpenEntry ?? null
        return <div data-testid="journal-feed" />
      },
    }))

    const { JournalListPage } = await pageModule
    render(<JournalListPage onSelect={() => {}} />)

    await waitFor(() => expect(capturedOnOpenEntry).toBeTruthy())
    capturedOnOpenEntry!(TODAY)
    expect(navigateCalls).toContain(`/journal/${TODAY}`)
  })
})
