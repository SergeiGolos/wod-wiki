import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { localDateKey } from './queriable-list/JournalDateScroll';

type JournalState = {
  dateParam: string;
  selectedDate: Date;
  setDateParam: (value: string) => void;
  selectedTags: string[];
};

let journalState: JournalState;
let navigateCalls: string[] = [];
let capturedTemplateProps: ComponentProps<typeof import('../templates/CalendarListTemplate').CalendarListTemplate<any, any, any>> | null = null;

mock.module('react-router-dom', () => ({
  useNavigate: () => (to: string) => {
    navigateCalls.push(to);
  },
}));

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getRecentResults: async () => [],
  },
}));

mock.module('../services/playgroundDB', () => ({
  playgroundDB: {
    getPagesByCategory: async () => [],
  },
}));

mock.module('../hooks/useJournalQueryState', () => ({
  useJournalQueryState: () => journalState,
}));

mock.module('../templates/CalendarListTemplate', () => ({
  CalendarListTemplate: (props: any) => {
    capturedTemplateProps = props;
    return <div data-testid="calendar-list-template" />;
  },
}));

const pageModule = import('./ListViews');

describe('JournalWeeklyPage', () => {
  beforeEach(() => {
    const today = new Date();
    journalState = {
      dateParam: '',
      selectedDate: today,
      setDateParam: mock(() => {}),
      selectedTags: [],
    };
    navigateCalls = [];
    capturedTemplateProps = null;
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('does not pass an initial anchor when the journal URL has no explicit selected date', async () => {
    const { JournalWeeklyPage } = await pageModule;

    render(<JournalWeeklyPage onSelect={() => {}} />);

    expect(capturedTemplateProps).toBeTruthy();
    expect(capturedTemplateProps?.initialDate).toBeUndefined();
  });

  it('does not write the today query param on first load without an explicit selection', async () => {
    const { JournalWeeklyPage } = await pageModule;

    render(<JournalWeeklyPage onSelect={() => {}} />);

    const todayKey = localDateKey(journalState.selectedDate);
    capturedTemplateProps?.onVisibleDateChange?.(todayKey);

    expect(journalState.setDateParam).not.toHaveBeenCalled();
  });

  it('preserves explicit date anchors from the URL and continues syncing visible dates', async () => {
    const { JournalWeeklyPage } = await pageModule;
    const selectedDate = new Date('2026-05-03T00:00:00');
    journalState = {
      ...journalState,
      dateParam: '2026-05-03',
      selectedDate,
    };

    render(<JournalWeeklyPage onSelect={() => {}} />);

    expect(capturedTemplateProps?.initialDate).toEqual(selectedDate);

    capturedTemplateProps?.onVisibleDateChange?.('2026-05-01');

    expect(journalState.setDateParam).toHaveBeenCalledWith('2026-05-01');
  });
});