/**
 * playgroundProfile — the user's local, per-installation one-shot flags.
 *
 * These are preferences/metadata — not workout *content* — so they live in
 * localStorage alongside onboarding state rather than in the IndexedDB content
 * store (`playgroundContent`). They are intentionally disposable and
 * per-installation. Unknown keys are ignored on read; the shape can evolve with
 * no migration.
 *
 * ponytail: legacy keys from the removed First-Note Wizard (trainingGoal,
 * defaultUnits, pinnedEffort, firstNoteUsedAt, wodwiki.profileInitialized.v1)
 * remain in old installs' localStorage as inert bytes; resetUserData wipes
 * localStorage wholesale, so no targeted cleanup exists. Add cleanup if a new
 * consumer ever needs the key space.
 */
export interface PlaygroundProfile {
  /** One-shot flag — true after the Goal Gradient completion celebration
   *  has been shown. Read by `OnboardingBanner` to gate the pill (see
   *  wayfinder #668). Survives across home-page visits so the user sees
   *  the celebration once per installation. */
  completionCelebrated?: boolean;
}

const STORAGE_KEY = 'wodwiki.profile.v1';

export function getProfile(): PlaygroundProfile {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as PlaygroundProfile) : {};
  } catch {
    return {};
  }
}

/** Merge a partial profile into the stored one. Returns the merged result. */
export function updateProfile(patch: Partial<PlaygroundProfile>): PlaygroundProfile {
  const next = { ...getProfile(), ...patch };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal — preferences are disposable.
    }
  }
  return next;
}
