/**
 * useCursorInsert — owns the IKEA payoff cursor-insert surface + its profile coupling.
 *
 * Layer extraction (wayfinder map #672): the IKEA payoff button's logic
 * was inline in `PlaygroundNotePage.tsx`, mixing four concerns:
 *
 *   1. The `editorViewRef` that the page held purely so the button could
 *      call `view.focus()` and `view.dispatch(view.state.replaceSelection(...))`.
 *   2. The `insertPinnedEffort` callback that focused the view + wrote
 *      `firstNoteUsedAt` to the profile on the first click.
 *   3. The `getProfile().pinnedEffort` initializer + the post-wizard-completion
 *      refresh (two reads in the page's lifecycle).
 *   4. The `getProfile().firstNoteUsedAt` reads in the JSX className for
 *      the strong-treatment styling.
 *
 * This hook bundles all four into a typed surface. The page no longer
 * imports `getProfile` / `updateProfile` / `EditorView` for this concern;
 * the hook owns the editor-view registration, the profile reads/writes,
 * and the strong-treatment signal.
 *
 * API choice (option b — imperative register): the page's existing
 * `handleInternalViewCreated` callback (which receives the CodeMirror
 * view when the editor mounts) is the natural place to register the
 * view with this hook. No React Context required; the page already has
 * the "view arrived" channel.
 *
 * ADR-0010 anchors:
 *
 * - **IKEA Effect**: completion writes `firstNoteUsedAt` via `updateProfile`;
 *   the hook observes the same write. The artifact moment is preserved.
 * - **Persistence shape**: profile reads/writes are unchanged. The hook is
 *   a thin consumer; it does not introduce a new persistence layer.
 *
 * **Has-inserted semantics (session + persistence):**
 *
 * - `hasInserted` initializes from `firstNoteUsedAt` at mount, so a returning
 *   user who already inserted on a previous note gets the regular quiet
 *   treatment immediately.
 * - Within this mount, `setHasInserted(true)` flips the signal locally so
 *   the strong treatment steps down on the same note after the first click.
 * - Across mounts, the profile re-init keeps both signals in sync.
 *
 * **Why this is a real guard:**
 *
 * The existing tests cover `playgroundProfile`'s round-trip and the
 * `OnboardingBanner` rendering. Neither covers the IKEA payoff button's
 * *wiring* — that the right `firstNoteUsedAt` is written on the right
 * event, that the className branches on the right signal, that
 * `pinnedEffort` refreshes after wizard completion. A `renderHook`-based
 * test on this hook exercises the consumer-side contract: the IKEA
 * artifact signal moves correctly across mount/click/refresh.
 *
 * **Out of scope (filed as separate tickets):**
 *
 * - The Goal Gradient hook coupling (#671). Independent.
 * - The wizard gate (#670). Independent.
 */

import { useCallback, useState } from 'react';
import { EditorView } from '@codemirror/view';

import { getProfile, updateProfile } from '../services/playgroundProfile';

export interface UseCursorInsertResult {
  /**
   * Focus the registered editor view and insert the pinned effort at
   * the cursor. Idempotent on the `firstNoteUsedAt` profile write (only
   * writes on the first call).
   */
  insert: () => void;
  /**
   * Whether the user has already triggered the IKEA artifact at least
   * once on this mount. Initialized from `firstNoteUsedAt`; flipped
   * locally by `insert()`.
   */
  hasInserted: boolean;
  /** The resolved pinned effort (read from the profile). */
  pinnedEffort: string;
  /**
   * Re-read the pinned effort from the profile. Call after the wizard
   * closes (completion path), so the page reflects the just-saved value.
   */
  refreshPinnedEffort: () => void;
  /**
   * Register the editor view. Call from the editor mount callback
   * (`onViewCreated`); pass `null` to clear.
   */
  registerView: (view: EditorView | null) => void;
}

export function useCursorInsert(): UseCursorInsertResult {
  const [view, setView] = useState<EditorView | null>(null);
  const [hasInserted, setHasInserted] = useState<boolean>(() =>
    Boolean(getProfile().firstNoteUsedAt),
  );
  const [pinnedEffort, setPinnedEffort] = useState<string>(() =>
    getProfile().pinnedEffort ?? '',
  );

  const registerView = useCallback((v: EditorView | null) => {
    setView(v);
  }, []);

  const insert = useCallback(() => {
    if (!view || !pinnedEffort) return;
    if (!hasInserted) {
      updateProfile({ firstNoteUsedAt: Date.now() });
      setHasInserted(true);
    }
    view.focus();
    view.dispatch(view.state.replaceSelection(pinnedEffort));
  }, [view, pinnedEffort, hasInserted]);

  const refreshPinnedEffort = useCallback(() => {
    setPinnedEffort(getProfile().pinnedEffort ?? '');
  }, []);

  return {
    insert,
    hasInserted,
    pinnedEffort,
    refreshPinnedEffort,
    registerView,
  };
}