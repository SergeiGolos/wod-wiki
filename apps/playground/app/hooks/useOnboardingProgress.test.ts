import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useOnboardingProgress } from './useOnboardingProgress';

const STORAGE_KEY = 'wodwiki.onboarding.v1';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useOnboardingProgress', () => {
  it('starts at zero when localStorage is empty', () => {
    const { result } = renderHook(() => useOnboardingProgress());
    expect(result.current.stepsComplete).toBe(0);
    expect(result.current.totalSteps).toBe(5);
    expect(result.current.isComplete).toBe(false);
  });

  it('reads existing flags from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ visitedLanding: true }));
    const { result } = renderHook(() => useOnboardingProgress());
    expect(result.current.progress.visitedLanding).toBe(true);
    expect(result.current.stepsComplete).toBe(1);
  });

  it('mark(step) persists to localStorage and advances the count', () => {
    const { result } = renderHook(() => useOnboardingProgress());
    act(() => result.current.mark('editedNote'));
    expect(result.current.progress.editedNote).toBe(true);
    expect(result.current.stepsComplete).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).editedNote).toBe(true);
  });

  it('mark is idempotent', () => {
    const { result } = renderHook(() => useOnboardingProgress());
    act(() => result.current.mark('ranWorkout'));
    act(() => result.current.mark('ranWorkout'));
    expect(result.current.stepsComplete).toBe(1);
  });

  it('isComplete flips true once every step is marked', () => {
    const { result } = renderHook(() => useOnboardingProgress());
    act(() => {
      result.current.mark('visitedLanding');
      result.current.mark('editedNote');
      result.current.mark('ranWorkout');
      result.current.mark('loggedEffort');
      result.current.mark('openedReview');
    });
    expect(result.current.isComplete).toBe(true);
    expect(result.current.stepsComplete).toBe(5);
  });

  it('coerces unknown/malformed keys to false without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bogus: true, editedNote: 'yes' }));
    const { result } = renderHook(() => useOnboardingProgress());
    // 'yes' is not strictly true, so editedNote stays false; bogus is ignored.
    expect(result.current.stepsComplete).toBe(0);
  });
});
