/**
 * useFirstNoteWizardState — renderHook tests covering the wizard's open/close contract.
 *
 * Real regression guard (wayfinder map #670): these tests fail if any of the
 * three gates (`isFirstNote`, `isInitialized`, `dismissed`) is dropped, or if
 * `handleClose` stops branching correctly.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import { updateProfile } from '../services/playgroundProfile';
import { useFirstNoteWizardState } from './useFirstNoteWizardState';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useFirstNoteWizardState', () => {
  it('open=true on a fresh installation (no storage)', () => {
    const { result } = renderHook(() => useFirstNoteWizardState());
    expect(result.current.open).toBe(true);
  });

  it('open=false after updateProfile writes any preference', () => {
    updateProfile({ trainingGoal: 'sport' });
    const { result } = renderHook(() => useFirstNoteWizardState());
    expect(result.current.open).toBe(false);
  });

  it('open=false after updateProfile writes an all-undefined patch (covers the JSON.stringify hole)', () => {
    // FirstNoteWizard.finish() with no selections writes all-undefined;
    // JSON.stringify drops undefined keys, so the stored profile is '{}'.
    // The flag written by updateProfile ensures open=false even when the
    // profile shape is empty.
    updateProfile({
      trainingGoal: undefined,
      defaultUnits: undefined,
      pinnedEffort: undefined,
    });
    const { result } = renderHook(() => useFirstNoteWizardState());
    expect(result.current.open).toBe(false);
  });

  it('handleClose(true) flips the completion gate (open=false after re-render)', () => {
    const { result } = renderHook(() => useFirstNoteWizardState());
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.handleClose(true);
    });
    expect(result.current.open).toBe(false);
    expect(window.localStorage.getItem('wodwiki.firstNoteDone.v1')).toBe('true');
  });

  it('handleClose(false) sets the per-mount dismissed flag (open=false after re-render)', () => {
    const { result } = renderHook(() => useFirstNoteWizardState());
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.handleClose(false);
    });
    expect(result.current.open).toBe(false);
    // Per-mount state must not touch the completion gate.
    expect(window.localStorage.getItem('wodwiki.firstNoteDone.v1')).toBeNull();
  });

  it('handleClose(false) does NOT write the profileInitialized flag (no preference change)', () => {
    const { result } = renderHook(() => useFirstNoteWizardState());

    act(() => {
      result.current.handleClose(false);
    });
    expect(window.localStorage.getItem('wodwiki.profileInitialized.v1')).toBeNull();
  });

  it('a fresh mount after dismissal re-shows the wizard (per-note nag cadence)', () => {
    const first = renderHook(() => useFirstNoteWizardState());
    expect(first.result.current.open).toBe(true);

    act(() => {
      first.result.current.handleClose(false);
    });
    expect(first.result.current.open).toBe(false);

    // New mount simulates navigating to a different note (page remounts via
    // key={effectivePlaygroundId}). The per-mount dismissed state resets; the
    // profile is still empty; the wizard reappears.
    const second = renderHook(() => useFirstNoteWizardState());
    expect(second.result.current.open).toBe(true);
  });

  it('a fresh mount after completion stays hidden (gate persists across mounts)', () => {
    const first = renderHook(() => useFirstNoteWizardState());

    act(() => {
      first.result.current.handleClose(true);
    });

    const second = renderHook(() => useFirstNoteWizardState());
    expect(second.result.current.open).toBe(false);
  });

  it('handleClose callback identity is stable across renders without state changes', () => {
    const { result, rerender } = renderHook(() => useFirstNoteWizardState());
    const first = result.current.handleClose;

    rerender();

    // handleClose depends only on markFirstNoteDone, which is stable
    // (from useCallback with empty deps). Identity should not change.
    expect(result.current.handleClose).toBe(first);
  });
});