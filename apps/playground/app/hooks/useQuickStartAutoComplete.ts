import { useEffect, useRef } from 'react';
import { usePageQuests, type Quest } from './usePageQuests';

export interface UseQuickStartAutoCompleteArgs {
  pageRoute: string;
  quests: Quest[];
  /** The demo's initial source (before the user edits). */
  initialSource: string;
  /** The editor's current source. */
  currentSource: string;
  /** Disable when the editor is not meant to be interactive. */
  enabled?: boolean;
}

/**
 * Auto-completes the home-page Quick-Start quest chain for events the static
 * syntax validator cannot see: arriving on the page and editing the demo.
 *
 * - `qs-arrive` marks complete on mount (endowed progress).
 * - `qs-edit` marks complete as soon as the editor content diverges from the
 *   initial demo source.
 * - `qs-run` is handled by `useCompletionChallenge` (workout-complete).
 *
 * Safe on any page: if the page has no `qs-arrive`/`qs-edit` quests, the hook
 * is a no-op.
 */
export function useQuickStartAutoComplete({
  pageRoute,
  quests,
  initialSource,
  currentSource,
  enabled = true,
}: UseQuickStartAutoCompleteArgs): void {
  const { markComplete } = usePageQuests(pageRoute, quests);

  const hasArrive = quests.some((q) => q.id === 'qs-arrive');
  const hasEdit = quests.some((q) => q.id === 'qs-edit');

  const initialRef = useRef(initialSource);
  initialRef.current = initialSource;

  const currentRef = useRef(currentSource);
  currentRef.current = currentSource;

  // Mount effect: auto-complete the arrival quest once.
  useEffect(() => {
    if (!enabled || !hasArrive) return;
    markComplete('qs-arrive');
  }, [enabled, hasArrive, markComplete]);

  // Edit effect: auto-complete the edit quest when the user changes the source.
  useEffect(() => {
    if (!enabled || !hasEdit) return;
    const initial = initialRef.current.trim();
    const current = currentRef.current.trim();
    if (current !== initial && current.length > 0) {
      markComplete('qs-edit');
    }
  }, [enabled, hasEdit, currentSource, markComplete]);
}
