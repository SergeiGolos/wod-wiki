import { afterEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import { useShowPlaygrounds } from './useShowPlaygrounds';

const STORAGE_KEY = 'wodwiki:showPlaygrounds';

describe('useShowPlaygrounds', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('defaults to false when localStorage is empty', () => {
    const { result } = renderHook(() => useShowPlaygrounds());
    expect(result.current[0]).toBe(false);
  });

  it('reads the persisted boolean from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useShowPlaygrounds());
    expect(result.current[0]).toBe(true);
  });

  it('writes the boolean to localStorage when changed', () => {
    const { result } = renderHook(() => useShowPlaygrounds());

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('gracefully handles invalid localStorage values', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-boolean');
    const { result } = renderHook(() => useShowPlaygrounds());
    // JSON.parse('not-a-boolean') throws, caught by try/catch → false
    expect(result.current[0]).toBe(false);
  });
});
