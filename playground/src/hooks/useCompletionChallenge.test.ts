import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useCompletionChallenge } from './useCompletionChallenge';
import { usePageQuests, type Quest } from './usePageQuests';
import type { FullscreenState } from './useCanvasRuntime';
import type { WorkoutResults } from '@/components/Editor/types';

const STORAGE_KEY = 'wodwiki.quests.v1';
const PAGE_A = '/guide/getting-started';
const PAGE_B = '/guide/syntax';

const mockQuests: Quest[] = [
  {
    id: 'quest-syntax',
    label: 'Syntax Quest',
    validation: { type: 'has-movement' },
  },
  {
    id: 'quest-complete-1',
    label: 'Completion Quest 1',
    validation: { type: 'workout-complete' },
  },
  {
    id: 'quest-complete-2',
    label: 'Completion Quest 2',
    validation: { type: 'workout-complete' },
  },
];

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useCompletionChallenge', () => {
  it('returns completion quest ids', () => {
    const { result } = renderHook(() =>
      useCompletionChallenge({
        pageRoute: PAGE_A,
        quests: mockQuests,
        fullscreen: null,
      })
    );

    expect(result.current.questIds).toEqual(['quest-complete-1', 'quest-complete-2']);
  });

  it('does not complete quests when fullscreen is null or timer mode', () => {
    const { rerender } = renderHook(
      ({ fullscreen }) =>
        useCompletionChallenge({
          pageRoute: PAGE_A,
          quests: mockQuests,
          fullscreen,
        }),
      {
        initialProps: { fullscreen: null as FullscreenState },
      }
    );

    const checkQuests = () => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      const pageQuests = saved[PAGE_A] || {};
      expect(pageQuests['quest-complete-1']).toBeUndefined();
      expect(pageQuests['quest-complete-2']).toBeUndefined();
    };

    checkQuests();

    // Change fullscreen to timer
    const timerState: FullscreenState = {
      kind: 'timer',
      block: { id: 'block-1', content: '10 pushups' },
      results: null,
    };
    rerender({ fullscreen: timerState });
    checkQuests();
  });

  it('completes workout-complete quests when fullscreen transitions to completed review', () => {
    const { rerender } = renderHook(
      ({ fullscreen }) =>
        useCompletionChallenge({
          pageRoute: PAGE_A,
          quests: mockQuests,
          fullscreen,
        }),
      {
        initialProps: { fullscreen: null as FullscreenState },
      }
    );

    const results: WorkoutResults = {
      startTime: 1000,
      endTime: 2000,
      duration: 1000,
      completed: true,
      logs: [],
    };

    const reviewState: FullscreenState = {
      kind: 'review',
      segments: [],
      results,
    };

    rerender({ fullscreen: reviewState });

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    const pageQuests = saved[PAGE_A] || {};
    expect(pageQuests['quest-complete-1']).toBe(true);
    expect(pageQuests['quest-complete-2']).toBe(true);
    // Syntax quest should NOT be completed
    expect(pageQuests['quest-syntax']).toBeUndefined();
  });

  it('does not complete quests if results.completed is false', () => {
    const { rerender } = renderHook(
      ({ fullscreen }) =>
        useCompletionChallenge({
          pageRoute: PAGE_A,
          quests: mockQuests,
          fullscreen,
        }),
      {
        initialProps: { fullscreen: null as FullscreenState },
      }
    );

    const results: WorkoutResults = {
      startTime: 1000,
      endTime: 2000,
      duration: 1000,
      completed: false, // stopped early
      logs: [],
    };

    const reviewState: FullscreenState = {
      kind: 'review',
      segments: [],
      results,
    };

    rerender({ fullscreen: reviewState });

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    const pageQuests = saved[PAGE_A] || {};
    expect(pageQuests['quest-complete-1']).toBeUndefined();
    expect(pageQuests['quest-complete-2']).toBeUndefined();
  });

  it('does not complete quests when enabled is false', () => {
    const { rerender } = renderHook(
      ({ fullscreen, enabled }) =>
        useCompletionChallenge({
          pageRoute: PAGE_A,
          quests: mockQuests,
          fullscreen,
          enabled,
        }),
      {
        initialProps: { fullscreen: null as FullscreenState, enabled: false },
      }
    );

    const results: WorkoutResults = {
      startTime: 1000,
      endTime: 2000,
      duration: 1000,
      completed: true,
      logs: [],
    };

    const reviewState: FullscreenState = {
      kind: 'review',
      segments: [],
      results,
    };

    rerender({ fullscreen: reviewState, enabled: false });

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    const pageQuests = saved[PAGE_A] || {};
    expect(pageQuests['quest-complete-1']).toBeUndefined();
  });
});
