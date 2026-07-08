/**
 * OnboardingBanner — the Goal Gradient credit / progress strip (ADR-0010).
 *
 * On mount it credits the visit (`mark('visitedLanding')`). It shows a
 * "Step 1 of N · Start by editing the example" credit until the user has done
 * more than land, then a progress bar, then hides itself once onboarding is
 * complete. Self-contained so any landing surface can drop it in.
 */

import { useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingProgress } from '../../hooks/useOnboardingProgress';
import { ProgressBar } from '../atoms/ProgressBar';

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

  if (isComplete) return null;

  return (
    <div className={cn('rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4', className)}>
      {stepsComplete <= 1 ? (
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
