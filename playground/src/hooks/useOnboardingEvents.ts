/**
 * useOnboardingEvents — typed event API for the Goal Gradient onboarding counter.
 *
 * Layer extraction (wayfinder map #671): the Goal Gradient coupling was
 * inline in `PlaygroundNotePage.tsx`, calling
 * `useOnboardingProgress().mark(...)` directly for three semantic events:
 *
 *   - `editedNote` — user changes the editor content
 *   - `ranWorkout` — user clicks Run on a code block
 *   - `loggedEffort` — user adds the workout to their journal
 *
 * The page has three distinct semantic events; translating each into a
 * `mark(step)` string is a coupling the page shouldn't own. This hook
 * bundles the three events into a typed API the page consumes.
 *
 * ADR-0010 anchors:
 *
 * - **Decision 1 (Goal Gradient step list)**: the five steps are fixed
 *   (land / edit / run / log / review). The hook does not change which
 *   steps count; it changes who owns the step-string mapping.
 * - **Persistence shape**: writes still go through `mark()`, which is
 *   idempotent against localStorage. The hook is a thin typed wrapper,
 *   not a new persistence layer.
 *
 * **Why this is a real guard:**
 *
 * The existing `useOnboardingProgress.test.ts` covers the *internal*
 * behavior of the mark function. It does not cover the consumer's
 * *wiring* — i.e., that `PlaygroundNotePage` calls the right step for the
 * right semantic event. A `renderHook`-based test on
 * `useOnboardingEvents` exercises the consumer-side contract: each
 * handler maps to exactly one step.
 *
 * **Out of scope (filed as separate tickets):**
 *
 * - The wizard's open/close contract (see `useFirstNoteWizardState`).
 * - The cursor-insert seam (IKEA payoff button + `EditorView` ref).
 */

import { useCallback } from 'react';

import { useOnboardingProgress } from './useOnboardingProgress';

export interface UseOnboardingEventsResult {
  /** Fire when the user changes the editor content (mark step: editedNote). */
  onEditNote: () => void;
  /** Fire when the user clicks Run on a code block (mark step: ranWorkout). */
  onRunWorkout: () => void;
  /** Fire when the user adds the workout to their journal (mark step: loggedEffort). */
  onLogEffort: () => void;
}

export function useOnboardingEvents(): UseOnboardingEventsResult {
  const { mark } = useOnboardingProgress();

  const onEditNote = useCallback(() => {
    mark('editedNote');
  }, [mark]);

  const onRunWorkout = useCallback(() => {
    mark('ranWorkout');
  }, [mark]);

  const onLogEffort = useCallback(() => {
    mark('loggedEffort');
  }, [mark]);

  return { onEditNote, onRunWorkout, onLogEffort };
}