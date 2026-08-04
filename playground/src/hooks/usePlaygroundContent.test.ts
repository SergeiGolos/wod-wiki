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

  it('seeds IndexedDB on mount by default when the page is missing', async () => {
    const { usePlaygroundContent } = await hookModule;
    renderHook(() =>
      usePlaygroundContent({
        category: 'journal',
        name: '2099-06-04',
        mdContent: 'bundled content',
      }),
    );

    await waitFor(() => expect(savedPages).toHaveLength(1));
    expect(savedPages[0]).toMatchObject({
      id: 'journal/2099-06-04',
      content: 'bundled content',
    });
  });

  it('does not seed on mount when seedOnMount is false (#856)', async () => {
    const { usePlaygroundContent } = await hookModule;
    const { result } = renderHook(() =>
      usePlaygroundContent({
        category: 'feed/stronglifts/2099-06-04',
        name: '5x5',
        mdContent: 'bundled feed content',
        seedOnMount: false,
      }),
    );

    // Settled into the bundled content without any write.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.content).toBe('bundled feed content');
    await act(async () => {});
    expect(savedPages).toHaveLength(0);
  });

  it('still persists the first edit when seedOnMount is false (#856)', async () => {
    const { usePlaygroundContent } = await hookModule;
    const { result } = renderHook(() =>
      usePlaygroundContent({
        category: 'feed/stronglifts/2099-06-04',
        name: '5x5',
        mdContent: 'bundled feed content',
        seedOnMount: false,
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onChange('user edit'));
    act(() => result.current.onBlur());

    await waitFor(() => expect(savedPages).toHaveLength(1));
    expect(savedPages[0]!.content).toBe('user edit');
  });
});
