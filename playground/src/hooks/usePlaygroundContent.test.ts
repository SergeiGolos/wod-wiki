import { afterEach, describe, expect, it, mock, vi } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';

interface SavedPage {
  id: string;
  category: string;
  name: string;
  content: string;
  updatedAt: number;
}

const savedPages: SavedPage[] = [];
const existingPages = new Map<string, SavedPage>();
let getPageOverride: (() => Promise<SavedPage | undefined>) | null = null;

mock.module('../services/playgroundContent', () => ({
  pageId: (category: string, name: string) => `${category}/${name}`,
  playgroundContent: {
    getPage: async (id: string) =>
      getPageOverride ? getPageOverride() : existingPages.get(id),
    savePage: async (page: SavedPage) => {
      savedPages.push(page);
      return page.id;
    },
  },
}));

const hookModule = import('./usePlaygroundContent');
const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
  vi.useRealTimers();
  getPageOverride = null;
  savedPages.length = 0;
  existingPages.clear();
});

describe('usePlaygroundContent', () => {
  it('flushes pending debounced content when unmounted before the debounce fires', async () => {
    Date.now = () => 1_714_476_000_000;
    existingPages.set('journal/2099-06-03', {
      id: 'journal/2099-06-03',
      category: 'journal',
      name: '2099-06-03',
      content: 'original content',
      updatedAt: Date.now(),
    });
    const { usePlaygroundContent } = await hookModule;

    const { result, unmount } = renderHook(() =>
      usePlaygroundContent({
        category: 'journal',
        name: '2099-06-03',
        mdContent: 'original content',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.onChange('edited immediately before navigation');
    });

    unmount();

    // The unmount cleanup calls flush(), which persists on a microtask (the save
    // is fire-and-forget by design so navigation guards never await React
    // cleanup). Wait for that microtask rather than asserting synchronously.
    await waitFor(() => expect(savedPages).toHaveLength(1));
    expect(savedPages[0]).toMatchObject({
      id: 'journal/2099-06-03',
      category: 'journal',
      name: '2099-06-03',
      content: 'edited immediately before navigation',
      updatedAt: 1_714_476_000_000,
    });
  });

  it('falls back to bundled content when the IndexedDB load never settles', async () => {
    // Simulates a permanently blocked IndexedDB open (e.g. a stale tab holding
    // the DB during a schema upgrade): the promise never resolves, and the
    // page must not spin "Loading…" forever.
    getPageOverride = () => new Promise<SavedPage | undefined>(() => {});
    const { usePlaygroundContent, LOAD_TIMEOUT_MS } = await hookModule;

    vi.useFakeTimers();
    const { result } = renderHook(() =>
      usePlaygroundContent({
        category: 'girls',
        name: 'ghost',
        mdContent: 'bundled md',
      }),
    );
    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(LOAD_TIMEOUT_MS);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.content).toBe('bundled md');
    // No seed write — the cancelled load must not persist the fallback.
    expect(savedPages).toHaveLength(0);
  });
});
