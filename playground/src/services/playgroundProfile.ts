/**
 * playgroundProfile — the user's local, per-installation preferences.
 *
 * ADR-0010 (IKEA Effect): the First-Note Wizard writes the three answers it
 * collects (training goal, default units, pinned effort) to the user's own
 * storage so they feel ownership of a configuration they built.
 *
 * These are preferences/metadata — not workout *content* — so they live in
 * localStorage alongside onboarding state rather than in the IndexedDB content
 * store (`playgroundContent`). They are intentionally disposable and
 * per-installation. Unknown keys are ignored on read; the shape can evolve with
 * no migration.
 *
 * `updateProfile` also writes the `wodwiki.profileInitialized.v1` flag on
 * every call, regardless of patch content. A patch of all-undefined (the
 * "user clicked through without selecting" path through
 * `FirstNoteWizard.finish`) still sets the flag — the user has interacted
 * with the profile, even if they chose nothing. The flag is read by
 * `useProfileInitialized` to gate the wizard's re-appearance.
 */
export type TrainingGoal = 'general' | 'sport' | 'hybrid' | 'rehab';
export type UnitSystem = 'lb' | 'kg';

export interface PlaygroundProfile {
  trainingGoal?: TrainingGoal;
  defaultUnits?: UnitSystem;
  /** Effort id/slug the user pinned as their favorite. */
  pinnedEffort?: string;
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
      // Mark the profile as initialized on every write — even an
      // all-undefined patch counts (user clicked through without
      // selecting). The flag is read by `useProfileInitialized`; see
      // that file's docstring for the full rationale.
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    } catch {
      // Non-fatal — preferences are disposable.
    }
  }
  return next;
}
