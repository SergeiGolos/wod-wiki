/**
 * useCursorInsert — renderHook tests covering the IKEA payoff cursor-insert
 * surface and its profile coupling (wayfinder map #672).
 *
 * Asserts:
 *   1. `hasInserted` is initialized from `firstNoteUsedAt` (returning users
 *      get the quiet treatment immediately).
 *   2. `pinnedEffort` is initialized from the profile.
 *   3. Calling `insert` (with a registered view and pinned text) flips
 *      `hasInserted` to true and writes `firstNoteUsedAt` to the profile.
 *   4. Calling `insert` again is idempotent on the profile write.
 *   5. `refreshPinnedEffort` re-reads `pinnedEffort` from the profile.
 *   6. `insert` is a no-op when no view is registered.
 *   7. `insert` is a no-op when `pinnedEffort` is empty.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

import { updateProfile } from '../services/playgroundProfile';
import { useCursorInsert } from './useCursorInsert';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

// Minimal EditorView stub — the hook only calls `view.focus()` and
// `view.dispatch(view.state.replaceSelection(text))`. We assert the
// side effects on a recorder rather than building a real CodeMirror view.
function makeStubView() {
  const calls: { focus: number; replaceSelection: string[] } = {
    focus: 0,
    replaceSelection: [],
  };
  const view = {
    focus: () => {
      calls.focus += 1;
    },
    dispatch: () => {
      // No-op in stub; we only verify call counts.
    },
    state: { replaceSelection: (text: string) => text },
  } as unknown as EditorView;
  return { view, calls };
}

describe('useCursorInsert', () => {
  it('initializes hasInserted from firstNoteUsedAt (false on fresh install)', () => {
    const { result } = renderHook(() => useCursorInsert());
    expect(result.current.hasInserted).toBe(false);
  });

  it('initializes hasInserted from firstNoteUsedAt (true on returning user)', () => {
    updateProfile({ firstNoteUsedAt: 12345 });
    const { result } = renderHook(() => useCursorInsert());
    expect(result.current.hasInserted).toBe(true);
  });

  it('initializes pinnedEffort from the profile', () => {
    updateProfile({ pinnedEffort: 'Pullups' });
    const { result } = renderHook(() => useCursorInsert());
    expect(result.current.pinnedEffort).toBe('Pullups');
  });

  it('insert flips hasInserted to true and writes firstNoteUsedAt on first click', () => {
    updateProfile({ pinnedEffort: 'Pullups' });
    const { result } = renderHook(() => useCursorInsert());
    const { view, calls } = makeStubView();

    act(() => {
      result.current.registerView(view);
    });
    act(() => {
      result.current.insert();
    });

    expect(result.current.hasInserted).toBe(true);
    expect(window.localStorage.getItem('wodwiki.profile.v1')).toContain('firstNoteUsedAt');
    // Stub state — the hook called view.focus().
    expect(calls.focus).toBe(1);
  });

  it('insert is idempotent on the profile write (no double-write)', () => {
    updateProfile({ pinnedEffort: 'Pullups' });
    const { result } = renderHook(() => useCursorInsert());
    const { view } = makeStubView();

    act(() => {
      result.current.registerView(view);
    });
    act(() => {
      result.current.insert();
    });
    const afterFirst = window.localStorage.getItem('wodwiki.profile.v1');

    act(() => {
      result.current.insert();
    });
    const afterSecond = window.localStorage.getItem('wodwiki.profile.v1');

    // The profile write is gated on `!hasInserted`; the second insert
    // should not overwrite firstNoteUsedAt with a new timestamp.
    expect(afterFirst).toBe(afterSecond);
  });

  it('refreshPinnedEffort re-reads the profile value', () => {
    const { result } = renderHook(() => useCursorInsert());
    expect(result.current.pinnedEffort).toBe('');

    updateProfile({ pinnedEffort: 'Row' });
    act(() => {
      result.current.refreshPinnedEffort();
    });
    expect(result.current.pinnedEffort).toBe('Row');
  });

  it('insert is a no-op when no view is registered', () => {
    updateProfile({ pinnedEffort: 'Pullups' });
    const { result } = renderHook(() => useCursorInsert());
    // Don't register a view.
    act(() => {
      result.current.insert();
    });
    // hasInserted stays false; firstNoteUsedAt NOT written (the pinnedEffort
    // profile entry was written by the test setup above, so we don't assert
    // the whole key is null).
    expect(result.current.hasInserted).toBe(false);
    const raw = window.localStorage.getItem('wodwiki.profile.v1');
    expect(raw).not.toContain('firstNoteUsedAt');
  });

  it('insert is a no-op when pinnedEffort is empty', () => {
    const { result } = renderHook(() => useCursorInsert());
    const { view } = makeStubView();
    act(() => {
      result.current.registerView(view);
    });
    act(() => {
      result.current.insert();
    });
    // No text to insert; no profile write.
    expect(result.current.hasInserted).toBe(false);
    expect(window.localStorage.getItem('wodwiki.profile.v1')).toBeNull();
  });

  it('handler identities are stable across renders', () => {
    const { result, rerender } = renderHook(() => useCursorInsert());
    const first = result.current;
    rerender();
    expect(result.current.insert).toBe(first.insert);
    expect(result.current.refreshPinnedEffort).toBe(first.refreshPinnedEffort);
    expect(result.current.registerView).toBe(first.registerView);
  });
});