import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useCompletionChallenge } from './useCompletionChallenge';
import { type Quest } from './usePageQuests';
import type { WorkoutResults } from '@/components/Editor/types';

const STORAGE_KEY = 'wodwiki.quests.v1';
const PAGE_A = '/guide/getting-started';

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

const completedRun: WorkoutResults = {
  startTime: 1000,
  endTime: 2000,
  duration: 1000,
  completed: true,
  logs: [],
};

const stoppedRun: WorkoutResults = { ...completedRun, completed: false };

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

function savedQuests() {
  const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  return saved[PAGE_A] || {};
}

describe('useCompletionChallenge', () => {
  it('returns completion quest ids', () => {
    const { result } = renderHook(() =>
      useCompletionChallenge({
        pageRoute: PAGE_A,
        quests: mockQuests,
        completedResults: null,
      })
    );

    expect(result.current.questIds).toEqual(['quest-complete-1', 'quest-complete-2']);
  });

  it('does not complete quests when no workout has finished', () => {
    renderHook(() =>
      useCompletionChallenge({
        pageRoute: PAGE_A,
        quests: mockQuests,
        completedResults: null,
      })
    );

    expect(savedQuests()['quest-complete-1']).toBeUndefined();
    expect(savedQuests()['quest-complete-2']).toBeUndefined();
  });

  it('completes workout-complete quests when a run completes', () => {
    const { rerender } = renderHook(
      ({ completedResults }) =>
        useCompletionChallenge({
          pageRoute: PAGE_A,
          quests: mockQuests,
          completedResults,
        }),
      {
        initialProps: { completedResults: null as WorkoutResults | null },
      }
    );

    rerender({ completedResults: completedRun });

    expect(savedQuests()['quest-complete-1']).toBe(true);
    expect(savedQuests()['quest-complete-2']).toBe(true);
    // Syntax quest should NOT be completed
    expect(savedQuests()['quest-syntax']).toBeUndefined();
  });

  it('does not complete quests if results.completed is false', () => {
    renderHook(() =>
      useCompletionChallenge({
        pageRoute: PAGE_A,
        quests: mockQuests,
        completedResults: stoppedRun,
      })
    );

    expect(savedQuests()['quest-complete-1']).toBeUndefined();
    expect(savedQuests()['quest-complete-2']).toBeUndefined();
  });

  it('does not complete quests when enabled is false', () => {
    renderHook(() =>
      useCompletionChallenge({
        pageRoute: PAGE_A,
        quests: mockQuests,
        completedResults: completedRun,
        enabled: false,
      })
    );

    expect(savedQuests()['quest-complete-1']).toBeUndefined();
    expect(savedQuests()['quest-complete-2']).toBeUndefined();
  });
});
