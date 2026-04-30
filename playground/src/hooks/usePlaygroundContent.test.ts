import { afterEach, describe, expect, it, mock } from 'bun:test';
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

mock.module('../services/playgroundDB', () => ({
  PlaygroundDBService: {
    pageId: (category: string, name: string) => `${category}/${name}`,
  },
  playgroundDB: {
    getPage: async (id: string) => existingPages.get(id),
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

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]).toMatchObject({
      id: 'journal/2099-06-03',
      category: 'journal',
      name: '2099-06-03',
      content: 'edited immediately before navigation',
      updatedAt: 1_714_476_000_000,
    });
  });
});
