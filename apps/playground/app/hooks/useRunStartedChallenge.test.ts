/**
 * useRunStartedChallenge.test.ts — unit tests for run-started quest gating.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useRunStartedChallenge } from './useRunStartedChallenge';
import type { Quest } from './usePageQuests';

const STORAGE_KEY = 'wodwiki.quests.v1';
const PAGE_ROUTE = '/';

function readLedger(): Record<string, Record<string, boolean>> {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useRunStartedChallenge', () => {
  it('is a no-op when running is false', () => {
    const quests: Quest[] = [
      { id: 'qs-tour-timer', label: 'See the timer run it', validation: { type: 'run-started' } },
    ];

    renderHook(({ running }) => useRunStartedChallenge({ pageRoute: PAGE_ROUTE, quests, running }), {
      initialProps: { running: false },
    });

    expect(readLedger()[PAGE_ROUTE]).toBeUndefined();
  });

  it('marks run-started quests complete when running becomes true', () => {
    const quests: Quest[] = [
      { id: 'qs-tour-timer', label: 'See the timer run it', validation: { type: 'run-started' } },
      { id: 'qs-run', label: 'Run it to the finish', validation: { type: 'workout-complete' } },
      { id: 'qs-tour-analytics', label: 'Review the session' },
    ];

    const { rerender } = renderHook(
      ({ running }) => useRunStartedChallenge({ pageRoute: PAGE_ROUTE, quests, running }),
      { initialProps: { running: false } },
    );

    act(() => rerender({ running: true }));

    const page = readLedger()[PAGE_ROUTE] ?? {};
    expect(page['qs-tour-timer']).toBe(true);
    expect(page['qs-run']).toBeUndefined();
    expect(page['qs-tour-analytics']).toBeUndefined();
  });

  it('is idempotent — remaining running keeps the quest complete', () => {
    const quests: Quest[] = [
      { id: 'qs-tour-timer', label: 'See the timer run it', validation: { type: 'run-started' } },
    ];

    const { rerender } = renderHook(
      ({ running }) => useRunStartedChallenge({ pageRoute: PAGE_ROUTE, quests, running }),
      { initialProps: { running: false } },
    );

    act(() => rerender({ running: true }));
    act(() => rerender({ running: true }));

    expect(readLedger()[PAGE_ROUTE]?.['qs-tour-timer']).toBe(true);
  });
});
