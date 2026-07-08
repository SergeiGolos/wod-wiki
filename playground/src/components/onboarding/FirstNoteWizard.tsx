/**
 * FirstNoteWizard — a 3-step, one-shot, dismissable Dialog.
 *
 * ADR-0010 (IKEA Effect): runs at most once per installation (gated by
 * `useIsFirstNoteEver`), collects three quick answers, and writes them to
 * the user's local profile so they've *built* a personalized config in
 * ~30 seconds. Dismissable via Skip / Esc / backdrop click — forcing
 * completion would kill the IKEA effect (the user must choose to build).
 *
 * Close contract: `onClose` is invoked with `completed: true` only when the
 * user reaches the final step and clicks "Done". All other close paths
 * (Skip button, Esc, backdrop) invoke `onClose(false)`. The consumer uses
 * the boolean to decide whether to flip the one-shot gate (only on
 * completion) and whether to refresh derived state from the profile
 * (only on completion — dismissal writes no profile).
 *
 * It is a Dialog, not a full-page flow, so it never breaks navigation
 * history.
 */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/atoms/Dialog';
import { cn } from '@/lib/utils';
import {
  updateProfile,
  type TrainingGoal,
  type UnitSystem,
} from '../../services/playgroundProfile';
import { clearProgress, getProgress, writeProgress } from '../../services/firstNoteProgress';

export interface FirstNoteWizardProps {
  open: boolean;
  /** Called when the wizard closes. `completed` is `true` only from the
   * final-step Done button; `false` from Skip / Esc / backdrop. The
   * consumer decides what to do with each (e.g. flip the one-shot gate,
   * refresh profile-derived state) — the wizard itself does not flip
   * any persistent flag. */
  onClose: (completed: boolean) => void;
}

const GOALS: { value: TrainingGoal; label: string; hint: string }[] = [
  { value: 'general', label: 'General fitness', hint: 'Stay strong and healthy' },
  { value: 'sport', label: 'Sport performance', hint: 'Train for competition' },
  { value: 'hybrid', label: 'Hybrid', hint: 'Strength + endurance' },
  { value: 'rehab', label: 'Rehab / return', hint: 'Rebuild carefully' },
];

const UNITS: { value: UnitSystem; label: string }[] = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
];

const SUGGESTED_EFFORTS = ['Pullups', 'Pushups', 'Air Squats', 'Burpees', 'Row', 'Deadlift'];
export function FirstNoteWizard({ open, onClose }: FirstNoteWizardProps) {
  // Partial-progress resume (ADR-0010, ticket #663): the four state
  // values are seeded from localStorage on mount, and persisted on every
  // change. If the user dismisses mid-wizard, the next mount resumes
  // from where they left off — they don't re-pick goal or units they
  // already answered. The blob is cleared on the Done path because the
  // answers are now in `playgroundProfile` and the progress blob is
  // redundant.
  const [step, setStep] = useState<number>(() => getProgress().step)
  const [goal, setGoal] = useState<TrainingGoal | null>(() => getProgress().goal)
  const [units, setUnits] = useState<UnitSystem | null>(() => getProgress().units)
  const [pinnedEffort, setPinnedEffort] = useState<string>(() => getProgress().pinnedEffort)

  // Persist any change to the progress blob. Re-runs on every state
  // change, which is acceptable: localStorage writes are cheap and
  // idempotent.
  useEffect(() => {
    writeProgress({ step, goal, units, pinnedEffort })
  }, [step, goal, units, pinnedEffort])

  const totalSteps = 3;

  const finish = () => {
    updateProfile({
      trainingGoal: goal ?? undefined,
      defaultUnits: units ?? undefined,
      pinnedEffort: pinnedEffort.trim() || undefined,
    });
    // Clear the progress blob — the answers are now in the profile.
    clearProgress()
    onClose(true)
  };
  const next = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else finish();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Make it yours — 30 seconds</DialogTitle>
          <DialogDescription>
            Three quick questions so your playground fits how you train. Skip anytime.
          </DialogDescription>
        </DialogHeader>

        {/* Step dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-pill transition-colors',
                i <= step ? 'bg-brand' : 'bg-brand/15',
              )}
            />
          ))}
        </div>

        <div className="min-h-[180px]">
          {step === 0 && (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">
                What's your training goal?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      goal === g.value
                        ? 'border-brand bg-brand/5'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{g.label}</div>
                    <div className="text-xs text-muted-foreground">{g.hint}</div>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">
                Preferred units?
              </legend>
              <div className="flex gap-2">
                {UNITS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUnits(u.value)}
                    className={cn(
                      'flex-1 rounded-xl border p-4 text-center text-sm font-semibold transition-colors',
                      units === u.value
                        ? 'border-brand bg-brand/5 text-brand-deep dark:text-brand-light'
                        : 'border-border text-foreground hover:bg-muted',
                    )}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-foreground">
                Pin a favorite movement
              </legend>
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTED_EFFORTS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setPinnedEffort(e)}
                    className={cn(
                      'rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors',
                      pinnedEffort === e
                        ? 'border-brand bg-brand/5 text-brand-deep dark:text-brand-light'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={pinnedEffort}
                onChange={(e) => setPinnedEffort(e.target.value)}
                placeholder="…or type your own"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
            </fieldset>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-pill border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-pill bg-brand px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-background transition hover:bg-brand-deep"
            >
              {step < totalSteps - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}