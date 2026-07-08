import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { renderHook } from '@testing-library/react';

import { updateProfile } from '../services/playgroundProfile';
import { useProfileInitialized } from './useProfileInitialized';

const FLAG_KEY = 'wodwiki.profileInitialized.v1';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useProfileInitialized (flag-based)', () => {
  it('is false on a fresh installation', () => {
    const { result } = renderHook(() => useProfileInitialized());
    expect(result.current.isInitialized).toBe(false);
    expect(window.localStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it('is true after updateProfile writes any field', () => {
    updateProfile({ trainingGoal: 'sport' });
    const { result } = renderHook(() => useProfileInitialized());
    expect(result.current.isInitialized).toBe(true);
    expect(window.localStorage.getItem(FLAG_KEY)).toBe('true');
  });

  it('is true even when updateProfile writes an all-undefined patch (the JSON.stringify hole)', () => {
    // FirstNoteWizard.finish() with no selections writes:
    //   { trainingGoal: undefined, defaultUnits: undefined, pinnedEffort: undefined }
    // JSON.stringify drops undefined keys, so the stored profile is '{}'.
    // A derived check (Object.keys(getProfile()).length > 0) would read
    // "not initialized" and re-show the wizard despite completion. The
    // flag is set by updateProfile regardless of patch content.
    updateProfile({
      trainingGoal: undefined,
      defaultUnits: undefined,
      pinnedEffort: undefined,
    });
    const { result } = renderHook(() => useProfileInitialized());
    expect(result.current.isInitialized).toBe(true);
    expect(window.localStorage.getItem(FLAG_KEY)).toBe('true');
  });

  it('does not change within a mount — snapshot semantics', () => {
    const { result } = renderHook(() => useProfileInitialized());
    expect(result.current.isInitialized).toBe(false);
    updateProfile({ trainingGoal: 'rehab' });
    expect(result.current.isInitialized).toBe(false);
  });

  it('reads true across a fresh mount after the flag is written', () => {
    updateProfile({ pinnedEffort: 'Pullups' });
    const second = renderHook(() => useProfileInitialized());
    expect(second.result.current.isInitialized).toBe(true);
  });
});