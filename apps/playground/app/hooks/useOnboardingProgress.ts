/**
 * useOnboardingProgress — typed, localStorage-backed onboarding progress.
 *
 * ADR-0010 (Goal Gradient): a first-time visitor has no sense of having
 * "started." This hook owns five boolean flags — the user's first session:
 * land, edit, run, log, review — and a typed `mark(step)` setter so call sites
 * can't typo a flag name.
 *
 * Why localStorage and not IndexedDB: these are tiny, disposable, cross-cutting
 * metadata (~5 booleans), not user *content*. They survive a content wipe and
 * are per-installation (no cross-device sync — by design). Unknown/removed keys
 * coerce to `false`, so the flag set can change across versions with no
 * migration code.
 *
 * Why a hook and not a context: the data crosses no component boundaries —
 * landing reads it, action sites write it, nobody in between reacts. A
 * `storage` event listener handles cross-tab sync.
 */

import { useCallback, useEffect, useState } from 'react';

export type OnboardingStep =
  | 'visitedLanding'
  | 'editedNote'
  | 'ranWorkout'
  | 'loggedEffort'
  | 'openedReview';

export interface OnboardingProgress {
  visitedLanding: boolean;
  editedNote: boolean;
  ranWorkout: boolean;
  loggedEffort: boolean;
  openedReview: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'visitedLanding',
  'editedNote',
  'ranWorkout',
  'loggedEffort',
  'openedReview',
];

const STORAGE_KEY = 'wodwiki.onboarding.v1';

const EMPTY: OnboardingProgress = {
  visitedLanding: false,
  editedNote: false,
  ranWorkout: false,
  loggedEffort: false,
  openedReview: false,
};

function readProgress(): OnboardingProgress {
  if (typeof window === 'undefined' || !window.localStorage) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Record<OnboardingStep, unknown>>;
    // Coerce unknown/removed keys to false — no migration needed if the flag
    // set ever changes.
    const next = { ...EMPTY };
    for (const step of ONBOARDING_STEPS) {
      next[step] = parsed[step] === true;
    }
    return next;
  } catch {
    return { ...EMPTY };
  }
}

function writeProgress(progress: OnboardingProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Quota / private-mode errors are non-fatal — onboarding is disposable.
  }
}

export interface UseOnboardingProgressResult {
  progress: OnboardingProgress;
  stepsComplete: number;
  totalSteps: number;
  /** Whether every step is done (progress UI should hide). */
  isComplete: boolean;
  /** Idempotently mark a step complete. Safe to call repeatedly. */
  mark: (step: OnboardingStep) => void;
}

export function useOnboardingProgress(): UseOnboardingProgressResult {
  const [progress, setProgress] = useState<OnboardingProgress>(readProgress);

  // Cross-tab sync: another tab writing the key updates this one.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setProgress(readProgress());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const mark = useCallback((step: OnboardingStep) => {
    setProgress((prev) => {
      if (prev[step]) return prev; // already done — no write, no re-render churn
      const next = { ...prev, [step]: true };
      writeProgress(next);
      return next;
    });
  }, []);

  const totalSteps = ONBOARDING_STEPS.length;
  const stepsComplete = ONBOARDING_STEPS.reduce(
    (count, step) => count + (progress[step] ? 1 : 0),
    0,
  );

  return {
    progress,
    stepsComplete,
    totalSteps,
    isComplete: stepsComplete === totalSteps,
    mark,
  };
}
