/**
 * OnboardingBanner — integrated sticky header onboarding progress (Concept 1).
 *
 * It is rendered in the `headerActions` slot of `CanvasEditorPanel` on the
 * home canvas route (`/`). Renders a compact progress badge on mobile and
 * details on desktop, featuring a hover overlay for step navigation.
 *
 * It uses the localStorage-backed onboarding progress state to display a
 * read-only roadmap checklist of onboarding tasks.
 */

import { useEffect, useState } from 'react';
import { Check, Dumbbell, Play, Timer, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingProgress, type OnboardingStep } from '../../hooks/useOnboardingProgress';
import { getProfile, updateProfile } from '../../services/playgroundProfile';

const COMPLETION_DISPLAY_MS = 2000;

const ONBOARDING_STEPS_META = [
  { id: 1, key: 'visitedLanding' as const, label: 'Landed on WOD Wiki', desc: 'Arrived at the playground dashboard', icon: Check },
  { id: 2, key: 'editedNote' as const, label: 'Edit example workout', desc: 'Modify the markdown content below', icon: Dumbbell },
  { id: 3, key: 'ranWorkout' as const, label: 'Run workout timer', desc: 'Start compiling and run the timer', icon: Play },
  { id: 4, key: 'loggedEffort' as const, label: 'Log workout results', desc: 'Save your completed workout data', icon: Timer },
  { id: 5, key: 'openedReview' as const, label: 'Review your progress', desc: 'Check your logged performance metrics', icon: Trophy },
];

export interface OnboardingBannerProps {
  className?: string;
}

function getHintText(stepsComplete: number): string {
  switch (stepsComplete) {
    case 1:
      return 'Landed ✅ · Edit note to start';
    case 2:
      return 'Edited note ✅ · Run timer to start';
    case 3:
      return 'Timer run ✅ · Save result to log';
    case 4:
      return 'Result logged ✅ · Open review to finish';
    default:
      return '';
  }
}

export function OnboardingBanner({ className }: OnboardingBannerProps) {
  const { progress, stepsComplete, totalSteps, isComplete, mark } = useOnboardingProgress();

  useEffect(() => {
    mark('visitedLanding');
  }, [mark]);

  // Completion celebration lifecycle: runs for COMPLETION_DISPLAY_MS
  // then updates the persisted flag to transition into the quiet state.
  const [showingCompletion, setShowingCompletion] = useState(false);

  useEffect(() => {
    if (!isComplete) return;
    if (getProfile().completionCelebrated) return;
    setShowingCompletion(true);
    const t = setTimeout(() => {
      updateProfile({ completionCelebrated: true });
      setShowingCompletion(false);
    }, COMPLETION_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [isComplete]);

  const completionCelebrated = getProfile().completionCelebrated;
  const isCelebrative = isComplete && showingCompletion && !completionCelebrated;

  return (
    <div className={cn('relative group py-1 shrink-0', className)}>
      {/* Header Actions Badge */}
      <button className="flex items-center gap-2 cursor-pointer focus:outline-none select-none text-left">
        {isComplete ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" />
            <span className={cn(
              'text-[8px] font-black uppercase tracking-wider',
              isCelebrative && 'animate-pulse'
            )}>
              {isCelebrative ? 'Complete! 🎉' : 'Done'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-background shrink-0">
              Step {stepsComplete}/{totalSteps}
            </span>
            <span className="text-[9px] text-muted-foreground select-none hidden lg:inline">
              {getHintText(stepsComplete)}
            </span>
          </div>
        )}
      </button>

      {/* Hover popover details & navigation overlay */}
      <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5">
        <div className="mb-2.5 pb-2 border-b border-border/60">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Onboarding Roadmap
          </h5>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Click steps to toggle progress or jump back & forth.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {ONBOARDING_STEPS_META.map((step) => {
            const isStepDone = progress[step.key];
            const isStepActive = !isStepDone && (
              step.id === 1 ||
              (step.id === 2 && progress.visitedLanding) ||
              (step.id === 3 && progress.editedNote) ||
              (step.id === 4 && progress.ranWorkout) ||
              (step.id === 5 && progress.loggedEffort)
            );
            const isStepFuture = !isStepDone && !isStepActive;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="w-full text-left p-1.5 flex items-start gap-2.5"
              >
                {/* State Bullet Indicator */}
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full mt-0.5">
                  {isStepDone ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-2.5" />
                    </span>
                  ) : isStepActive ? (
                    <span className="flex size-4 items-center justify-center rounded-full border border-brand bg-brand/10">
                      <span className="size-1.5 rounded-full bg-brand" />
                    </span>
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full border border-muted-foreground/30 text-[8px] font-bold text-muted-foreground/60">
                      {step.id}
                    </span>
                  )}
                </span>

                <div className="flex flex-col">
                  <span className={cn(
                    'text-[10px] font-bold leading-none',
                    isStepFuture ? 'text-muted-foreground/70' : 'text-foreground'
                  )}>
                    {step.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-normal mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
