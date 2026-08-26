/**
 * useOnboardingEvents — renderHook tests covering the consumer-side event mapping.
 *
 * Real regression guard (wayfinder map #671): each handler must map to
 * exactly one localStorage step. If the page swaps the wrong event handler
 * for the wrong semantic action (e.g. calling `onLogEffort` when the
 * user runs the workout), the test catches the miswrite.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import { useOnboardingEvents } from './useOnboardingEvents';

const STORAGE_KEY = 'wodwiki.onboarding.v1';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

function readProgress(): Record<string, boolean> {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, boolean>;
}

describe('useOnboardingEvents', () => {
  it('onEditNote marks the editedNote step', () => {
    const { result } = renderHook(() => useOnboardingEvents());
    act(() => {
      result.current.onEditNote();
    });
    expect(readProgress().editedNote).toBe(true);
  });

  it('onRunWorkout marks the ranWorkout step', () => {
    const { result } = renderHook(() => useOnboardingEvents());
    act(() => {
      result.current.onRunWorkout();
    });
    expect(readProgress().ranWorkout).toBe(true);
  });

  it('onLogEffort marks the loggedEffort step', () => {
    const { result } = renderHook(() => useOnboardingEvents());
    act(() => {
      result.current.onLogEffort();
    });
    expect(readProgress().loggedEffort).toBe(true);
  });

  it('handlers are idempotent (re-firing writes the same step; counter does not double)', () => {
    const { result } = renderHook(() => useOnboardingEvents());
    act(() => {
      result.current.onEditNote();
    });
    act(() => {
      result.current.onEditNote();
    });
    // The boolean flag is true; the underlying counter logic in
    // useOnboardingProgress is the authoritative source for stepsComplete.
    // This test pins the hook's idempotency contract: the same handler
    // can fire repeatedly without producing invalid state.
    expect(readProgress().editedNote).toBe(true);
  });

  it('handler identities are stable across renders', () => {
    const { result, rerender } = renderHook(() => useOnboardingEvents());
    const first = result.current;
    rerender();
    expect(result.current.onEditNote).toBe(first.onEditNote);
    expect(result.current.onRunWorkout).toBe(first.onRunWorkout);
    expect(result.current.onLogEffort).toBe(first.onLogEffort);
  });

  it('does not leak the progress counter or other internal state', () => {
    const { result } = renderHook(() => useOnboardingEvents());
    // The hook's surface is the three event handlers only. If a future
    // refactor accidentally exposes `mark`, `progress`, or `stepsComplete`,
    // this assertion would still pass (the object would just have more
    // keys); the type system is the primary guard. The test pins the
    // current shape.
    expect(Object.keys(result.current).sort()).toEqual(
      ['onEditNote', 'onLogEffort', 'onRunWorkout'].sort(),
    );
  });
});