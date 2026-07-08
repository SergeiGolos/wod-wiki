/**
 * useIsFirstNoteEver — one-shot flag gating the First-Note Wizard.
 *
 * ADR-0010 (IKEA Effect): after a user creates their first page they land in
 * an empty editor with nothing to feel ownership of. The wizard closes that
 * cold-start gap — but only once. This hook returns `true` exactly once per
 * browser installation; after `markFirstNoteDone()` runs (wizard completed or
 * dismissed), it returns `false` forever.
 *
 * Lives in localStorage (per-installation, disposable metadata) so a user who
 * wipes their content does not see the wizard again. The trigger lives in the
 * page that renders it, not in the page-creation service, keeping that API pure
 * (ADR-0010, Decision 4).
 */

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'wodwiki.firstNoteDone.v1';

function readDone(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true; // SSR: never show
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export interface UseIsFirstNoteEverResult {
  isFirstNote: boolean;
  markFirstNoteDone: () => void;
}

export function useIsFirstNoteEver(): UseIsFirstNoteEverResult {
  // Snapshot on first render so the value is stable for this mount — flipping
  // the flag mid-session shouldn't yank the wizard away mid-interaction.
  const [done, setDone] = useState<boolean>(readDone);

  const markFirstNoteDone = useCallback(() => {
    setDone(true);
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Non-fatal — worst case the wizard shows once more.
    }
  }, []);

  return { isFirstNote: !done, markFirstNoteDone };
}
