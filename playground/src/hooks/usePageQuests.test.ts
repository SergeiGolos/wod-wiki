/**
 * usePageQuests.test.ts — Unit tests for the usePageQuests hook.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { usePageQuests, type Quest } from './usePageQuests';

const STORAGE_KEY = 'wodwiki.quests.v1';

const mockQuests: Quest[] = [
  { id: 'quest1', label: 'First Quest', desc: 'Step one description' },
  { id: 'quest2', label: 'Second Quest', desc: 'Step two description' },
];

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('usePageQuests', () => {
  it('starts at zero progress when localStorage is empty', () => {
    const { result } = renderHook(() => usePageQuests(mockQuests));
    expect(result.current.stepsComplete).toBe(0);
    expect(result.current.totalSteps).toBe(2);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.quests[0].isCompleted).toBe(false);
    expect(result.current.quests[1].isCompleted).toBe(false);
  });

  it('reads existing progress from localStorage on mount', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ quest1: true })
    );

    const { result } = renderHook(() => usePageQuests(mockQuests));
    expect(result.current.stepsComplete).toBe(1);
    expect(result.current.quests[0].isCompleted).toBe(true);
    expect(result.current.quests[1].isCompleted).toBe(false);
  });

  it('markComplete(questId) persists completion and increments count', () => {
    const { result } = renderHook(() => usePageQuests(mockQuests));
    
    act(() => result.current.markComplete('quest1'));
    
    expect(result.current.stepsComplete).toBe(1);
    expect(result.current.quests[0].isCompleted).toBe(true);

    const progressObj = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(progressObj['quest1']).toBe(true);
  });

  it('toggleQuest(questId) toggles status back and forth', () => {
    const { result } = renderHook(() => usePageQuests(mockQuests));
    
    act(() => result.current.toggleQuest('quest2'));
    expect(result.current.quests[1].isCompleted).toBe(true);

    act(() => result.current.toggleQuest('quest2'));
    expect(result.current.quests[1].isCompleted).toBe(false);
  });

  it('isComplete flips true once every quest is complete', () => {
    const { result } = renderHook(() => usePageQuests(mockQuests));
    
    act(() => {
      result.current.markComplete('quest1');
      result.current.markComplete('quest2');
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.stepsComplete).toBe(2);
  });

  it('shares progress globally across hook instances', () => {
    const { result: instanceA } = renderHook(() => usePageQuests(mockQuests));
    const { result: instanceB } = renderHook(() => usePageQuests(mockQuests));

    act(() => instanceA.current.markComplete('quest1'));

    expect(instanceA.current.quests[0].isCompleted).toBe(true);
    expect(instanceB.current.quests[0].isCompleted).toBe(true); // Shared globally!
  });
});
