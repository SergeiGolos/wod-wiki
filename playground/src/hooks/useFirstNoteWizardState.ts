/**
 * useFirstNoteWizardState — owns the First-Note Wizard's visibility and close handling.
 *
 * Layer extraction (wayfinder map #670): the wizard's open/close wiring was
 * inline in `PlaygroundNotePage.tsx`, mixing three concerns:
 *
 *   1. The completion gate (`useIsFirstNoteEver` — localStorage `firstNoteDone`)
 *   2. The profile-initialized gate (`useProfileInitialized` — flag written on
 *      any `updateProfile` call)
 *   3. Per-mount dismissal state (`useState(false)` — survives the note's
 *      lifetime; resets on `key={effectivePlaygroundId}` remount)
 *
 * Plus the close-handler that branches on `completed`. This hook bundles
 * all four into one `useState`-derived surface so the page only sees
 * `{ open, handleClose }` — no localStorage reads, no per-mount dismissed
 * state, no branching on the boolean.
 *
 * ADR-0010 anchors:
 *
 * - **Decision 2 (Dismissal semantics)**: `handleClose(false)` does NOT flip
 *   the completion gate and does NOT mark the profile initialized. It only
 *   sets the in-memory `dismissed` flag for the current page mount. The
 *   wizard reappears on the next note navigation if the profile is still
 *   empty (per-note nag cadence).
 * - **IKEA Effect**: completion does flip the gate (via
 *   `markFirstNoteDone`), which together with the persisted profile is the
 *   IKEA artifact — the user's profile and the quick-insert button in the
 *   editor.
 *
 * **Out of scope (stays in the consumer):**
 *
 * - Refreshing `pinnedEffort` from the profile on completion. The page
 *   reads `getProfile()` itself; the hook does not know about the IKEA
 *   payoff surface.
 * - The Goal Gradient hooks. Separate ticket; the boundary fix (#659)
 *   settled the banner surface so the urgency is lower.
 * - The cursor-insert seam (the IKEA payoff button + `EditorView` ref).
 *   Separate ticket; the layer decision affects both this hook and that
 *   surface.
 *
 * **Why this is a real regression guard:**
 *
 * The #662 revision shipped `handleClose(false)` as a literal no-op and the
 * wizard became non-dismissible. The existing tests at
 * `FirstNoteWizard.test.tsx` only assert the `onClose` callback fires; they
 * don't assert that the consumer flips `open` to false. A `renderHook`-based
 * test on this hook exercises the wiring directly and fails if any of the
 * three gates drop.
 */

import { useCallback, useState } from 'react';

import { useIsFirstNoteEver } from './useIsFirstNoteEver';
import { useProfileInitialized } from './useProfileInitialized';

export interface UseFirstNoteWizardStateResult {
  /** Whether the wizard should render. Consumer binds `<FirstNoteWizard open={open} />`. */
  open: boolean;
  /** Pass to `<FirstNoteWizard onClose={handleClose} />`. Branches on completed. */
  handleClose: (completed: boolean) => void;
}

export function useFirstNoteWizardState(): UseFirstNoteWizardStateResult {
  const { isFirstNote, markFirstNoteDone } = useIsFirstNoteEver()
  const { isInitialized } = useProfileInitialized()
  const [dismissed, setDismissed] = useState(false)

  const handleClose = useCallback((completed: boolean) => {
    if (completed) {
      markFirstNoteDone()
    } else {
      setDismissed(true)
    }
  }, [markFirstNoteDone])

  const open = isFirstNote && !isInitialized && !dismissed

  return { open, handleClose }
}