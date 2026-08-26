/**
 * useProfileInitialized — flag-based gate for the First-Note Wizard.
 *
 * ADR-0010 (Decision 2) and follow-up #662 (revised twice): the First-Note
 * Wizard is the SOLE writer of `updateProfile`. Permanent dismissal was a
 * trap: a user who clicked Skip would have an empty profile forever (no
 * training goal, no default units, no pinned effort) and no path back to
 * the wizard short of clearing localStorage by hand. The IKEA payoff
 * button (which depends on `pinnedEffort`) would never render for them.
 *
 * Earlier derivation-based check (`Object.keys(getProfile()).length > 0`)
 * had a verified hole: `FirstNoteWizard.finish()` writes all-undefined when
 * the user clicks through without selecting anything, and `JSON.stringify`
 * drops undefined keys, so the stored profile is `{}` even after
 * completion — a derived check would re-show the wizard. The user's pick
 * (option C from the #662 re-grill): use a FLAG, not a derivation.
 *
 * The flag is written by `updateProfile()` on every call (regardless of
 * patch content). Reading an "all-undefined" patch as "user clicked
 * through" is intentional — the user has interacted with the profile,
 * even if they chose nothing. Future writers of the profile will
 * automatically write the flag too; no special-casing.
 *
 * The wizard disappears for good when EITHER the completion gate flips
 * (`useIsFirstNoteEver`) OR the flag is set (some path wrote the
 * profile). Dismissal does not set the flag; on the next mount the wizard
 * reappears if the flag is unset.
 *
 * SSR posture: returns `false` (not-initialized) so the wizard CAN render
 * if there's no client info.
 */

import { useState } from 'react';

const STORAGE_KEY = 'wodwiki.profileInitialized.v1';

function readInitialized(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false; // SSR: not initialized
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface UseProfileInitializedResult {
  isInitialized: boolean;
}

export function useProfileInitialized(): UseProfileInitializedResult {
  // Snapshot on first render so the value is stable for this mount —
  // we don't subscribe to storage changes. The wizard's `finish()` writes
  // the flag; the page remounts (key={effectivePlaygroundId}) and reads
  // the new value on the next note.
  const [initialized] = useState<boolean>(readInitialized);

  return { isInitialized: initialized };
}