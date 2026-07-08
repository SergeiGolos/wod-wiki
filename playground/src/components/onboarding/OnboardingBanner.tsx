/**
 * OnboardingBanner — the Goal Gradient credit / progress strip (ADR-0010).
 *
 * On mount it credits the visit (`mark('visitedLanding')`). It shows a
 * "Step 1 of N · Start by editing the workout below" credit until the user
 * has done more than land, then a progress bar. When `isComplete` becomes
 * true, the banner shows a compact "✓ All N steps done" pill for ~2
 * seconds (per the #664 grill) before unmounting — the user gets a brief
 * "you finished" affordance rather than a silent unmount.
 *
 * One-shot enforcement: the celebration fires at most once per
 * installation, gated by `profile.completionCelebrated` (persisted in
 * localStorage alongside other onboarding metadata). Survives the
 * canonical case where the user finishes the last onboarding step off
 * the canvas home (ReviewPage / PlaygroundNotePage) and only returns to
 * the home afterward.
 *
 * Owning surface: the canvas home page (`/`) — mounted by
 * `MarkdownCanvasPage` when `route === '/'`. ADR-0010 (Decision 1, Boundary)
 * gives the Goal Gradient "land" credit a single owning surface; the
 * legacy landing (`/legacy`) does not render this banner. Do not mount
 * this component on additional surfaces without updating the ADR.
 */

import { useEffect, useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingProgress } from '../../hooks/useOnboardingProgress';
import { getProfile, updateProfile } from '../../services/playgroundProfile';
import { ProgressBar } from '../atoms/ProgressBar';

const COMPLETION_DISPLAY_MS = 2000;

export interface OnboardingBannerProps {
  /** Copy after the "Step 1 of N" pill on the pre-progress credit. */
  hint?: string;
  className?: string;
}

export function OnboardingBanner({
  hint = 'Start by editing the example',
  className,
}: OnboardingBannerProps) {
  const { stepsComplete, totalSteps, isComplete, mark } = useOnboardingProgress();

  useEffect(() => {
    mark('visitedLanding');
  }, [mark]);

  // One-shot completion celebration (per the #664 grill): when isComplete
  // becomes true and the user hasn't already seen the celebration, show
  // the compact pill for COMPLETION_DISPLAY_MS, then unmount. The
  // effect depends only on `isComplete` so the timer fires exactly once
  // per isComplete-flipping-to-true; `showingCompletion` is excluded from
  // deps because toggling it would re-fire the effect and cause infinite
  // oscillation. The persisted flag (read inside the effect) prevents
  // re-firing when the user returns home after celebrating — at that
  // mount, `isComplete` is already true at mount time, but the persisted
  // flag is also true, so the guard short-circuits.
  const [showingCompletion, setShowingCompletion] = useState(false)

  useEffect(() => {
    if (!isComplete) return
    if (getProfile().completionCelebrated) return
    setShowingCompletion(true)
    const t = setTimeout(() => {
      updateProfile({ completionCelebrated: true })
      setShowingCompletion(false)
    }, COMPLETION_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [isComplete])

  if (isComplete && !showingCompletion) return null;

  return (
    <div className={cn('rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4', className)}>
      {isComplete && showingCompletion ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep dark:text-brand-light">
          <span className="inline-flex items-center gap-1 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            <Check className="size-3" aria-hidden="true" />
            All {totalSteps} steps done
          </span>
        </p>
      ) : stepsComplete <= 1 ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep dark:text-brand-light">
          <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            Step 1 of {totalSteps}
          </span>
          {hint}
          <ArrowDown className="size-4 animate-bounce" aria-hidden="true" />
        </p>
      ) : (
        <ProgressBar value={stepsComplete} max={totalSteps} label="Getting started" />
      )}
    </div>
  );
}