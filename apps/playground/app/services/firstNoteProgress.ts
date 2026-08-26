/**
 * firstNoteProgress — persisted partial answers for the First-Note Wizard.
 *
 * ADR-0010 (IKEA Effect, ticket #663): the wizard's three partial answers
 * (`goal`, `units`, `pinnedEffort`) and the current `step` are lifted out of
 * `useState` locals into localStorage so the wizard can resume where the
 * user left off if they dismiss mid-wizard. The blob is cleared on the
 * Done path (the answers are now persisted to `playgroundProfile`).
 *
 * Persistence shape: same localStorage flavor as the other onboarding
 * flags. Per-installation, disposable. Unknown / removed keys coerce to
 * the empty defaults so the schema can evolve without migration.
 *
 * `step` is stored as a number (not a literal union) so the consumer can
 * pass `s + 1` / `s - 1` callbacks without casting. `writeProgress` clamps
 * step to [0, 2] and `getProgress` re-clamps on read, so the wizard can
 * never persist an out-of-range value.
 *
 * SSR posture: read returns the empty defaults when `typeof window`
 * is undefined.
 */

export type ProgressGoal = 'general' | 'sport' | 'hybrid' | 'rehab';
export type ProgressUnit = 'lb' | 'kg';

export interface FirstNoteProgress {
  step: number;
  goal: ProgressGoal | null;
  units: ProgressUnit | null;
  pinnedEffort: string;
}

const STORAGE_KEY = 'wodwiki.firstNoteProgress.v1';

const EMPTY: FirstNoteProgress = {
  step: 0,
  goal: null,
  units: null,
  pinnedEffort: '',
};

function clampStep(step: unknown): number {
  if (typeof step !== 'number') return 0;
  return Math.max(0, Math.min(2, Math.floor(step)));
}

export function getProgress(): FirstNoteProgress {
  if (typeof window === 'undefined' || !window.localStorage) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Record<keyof FirstNoteProgress, unknown>>;
    const step = clampStep(parsed.step);
    const goal: ProgressGoal | null =
      parsed.goal === 'general' || parsed.goal === 'sport' ||
      parsed.goal === 'hybrid' || parsed.goal === 'rehab'
        ? parsed.goal
        : null;
    const units: ProgressUnit | null =
      parsed.units === 'lb' || parsed.units === 'kg' ? parsed.units : null;
    const pinnedEffort = typeof parsed.pinnedEffort === 'string' ? parsed.pinnedEffort : '';
    return { step, goal, units, pinnedEffort };
  } catch {
    return { ...EMPTY };
  }
}

export function writeProgress(progress: FirstNoteProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const step = clampStep(progress.step);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step, goal: progress.goal, units: progress.units, pinnedEffort: progress.pinnedEffort }),
    );
  } catch {
    // Quota / private-mode errors are non-fatal — the wizard can be
    // re-completed without persisted progress.
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal — next mount will treat absence as empty.
  }
}