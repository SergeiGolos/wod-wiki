/**
 * useChapterProgress.test.ts — unit tests for the cross-route chapter
 * aggregation hook.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useChapterProgress } from './useChapterProgress';
import type { Chapter } from '../canvas/parseCanvasMarkdown';

const STORAGE_KEY = 'wodwiki.quests.v1';

const CHAPTERS: Chapter[] = [
  {
    id: 'basics',
    title: 'Basics',
    badge: 'trophy',
    questIds: ['basics-movement', 'basics-reps'],
    sectionIds: [],
  },
  {
    id: 'sequences',
    title: 'Sequences',
    badge: 'dumbbell',
    questIds: ['sequences-timer', 'sequences-rounds'],
    sectionIds: [],
  },
];

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useChapterProgress', () => {
  it('returns all chapters as not-started when the ledger is empty', () => {
    const { result } = renderHook(() => useChapterProgress(CHAPTERS));
    act(() => {
      // Wait for hydration effect
    });
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.chapters).toEqual([
      { chapter: CHAPTERS[0], completedCount: 0, totalCount: 2, isComplete: false },
      { chapter: CHAPTERS[1], completedCount: 0, totalCount: 2, isComplete: false },
    ]);
  });

  it('aggregates quests from across multiple pages', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '/guide/syntax/basics': { 'basics-movement': true },
        '/guide/syntax/sequences': { 'sequences-timer': true, 'sequences-rounds': true },
      }),
    );

    const { result } = renderHook(() => useChapterProgress(CHAPTERS));
    expect(result.current.chapters).toEqual([
      { chapter: CHAPTERS[0], completedCount: 1, totalCount: 2, isComplete: false },
      { chapter: CHAPTERS[1], completedCount: 2, totalCount: 2, isComplete: true },
    ]);
  });

  it('marks a chapter complete when all of its quest ids are done', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '/guide/syntax/basics': { 'basics-movement': true, 'basics-reps': true },
      }),
    );
    const { result } = renderHook(() => useChapterProgress(CHAPTERS));
    expect(result.current.chapters[0].isComplete).toBe(true);
    expect(result.current.chapters[1].isComplete).toBe(false);
  });

  it('treats a chapter with zero quests as not-complete (defensive)', () => {
    const emptyChapter: Chapter[] = [
      { id: 'empty', title: 'Empty', badge: 'trophy', questIds: [], sectionIds: [] },
    ];
    const { result } = renderHook(() => useChapterProgress(emptyChapter));
    expect(result.current.chapters[0].isComplete).toBe(false);
    expect(result.current.chapters[0].totalCount).toBe(0);
  });
});
