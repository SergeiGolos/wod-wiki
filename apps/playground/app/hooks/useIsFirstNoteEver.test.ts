import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useIsFirstNoteEver } from './useIsFirstNoteEver';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useIsFirstNoteEver', () => {
  it('is true on a fresh installation', () => {
    const { result } = renderHook(() => useIsFirstNoteEver());
    expect(result.current.isFirstNote).toBe(true);
  });

  it('markFirstNoteDone flips it false and persists', () => {
    const { result } = renderHook(() => useIsFirstNoteEver());
    act(() => result.current.markFirstNoteDone());
    expect(result.current.isFirstNote).toBe(false);
    expect(window.localStorage.getItem('wodwiki.firstNoteDone.v1')).toBe('true');
  });

  it('a later mount after completion returns false', () => {
    const first = renderHook(() => useIsFirstNoteEver());
    act(() => first.result.current.markFirstNoteDone());
    const second = renderHook(() => useIsFirstNoteEver());
    expect(second.result.current.isFirstNote).toBe(false);
  });
});
