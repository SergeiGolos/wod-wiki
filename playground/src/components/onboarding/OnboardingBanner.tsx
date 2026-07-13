/**
 * OnboardingBanner — integrated sticky header onboarding progress (Concept 1).
 *
 * It is rendered in the `headerActions` slot of `CanvasEditorPanel` on the
 * home canvas route (`/`). Renders a compact progress badge on mobile and
 * details on desktop, featuring a hover overlay for step navigation.
 *
 * It uses the localStorage-backed onboarding progress state to display a
 * read-only roadmap checklist of onboarding tasks, plus a "Chapters"
 * section that aggregates cross-route chapter quest progress via
 * `useChapterProgress`.
 */

import { useEffect, useState } from 'react';
import { Activity, Blocks, Check, Dumbbell, FileText, Play, Puzzle, Timer, Trophy } from 'lucide-react';
import {
  StructureBlocksBadge,
  ProtocolsTimerBadge,
  ComplexPuzzleBadge,
  BasicsMovementIcon,
  MetricsCustomIcon,
  DialectsLogIcon,
} from '../ChallengeBadges';
import { cn } from '@/lib/utils';
import { useOnboardingProgress } from '../../hooks/useOnboardingProgress';
import { useChapterProgress } from '../../hooks/useChapterProgress';
import { getProfile, updateProfile } from '../../services/playgroundProfile';
import type { Chapter } from '../../canvas/parseCanvasMarkdown';

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
  /** Page-level chapter declarations. Each chapter's quest ids are
   *  aggregated across all routes in the localStorage ledger. */
  chapters?: Chapter[];
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

/** Resolve a Lucide icon component from the chapter's `badge` string.
 *  Defaults to Trophy when the named icon isn't supported. */
function chapterIcon(badge: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  switch (badge) {
    case 'trophy':
      return BasicsMovementIcon;
    case 'dumbbell':
      return Dumbbell;
    case 'timer':
      return ProtocolsTimerBadge;
    case 'play':
      return Play;
    case 'blocks':
      return StructureBlocksBadge;
    case 'puzzle':
      return ComplexPuzzleBadge;
    case 'activity':
      return MetricsCustomIcon;
    case 'file-text':
      return DialectsLogIcon;
    default:
      return Trophy;
  }
}

export function OnboardingBanner({ className, chapters = [] }: OnboardingBannerProps) {
  const { progress, stepsComplete, totalSteps, isComplete, mark } = useOnboardingProgress();
  const { chapters: chapterProgress } = useChapterProgress(chapters);

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
              isCelebrative && 'animate-pulse',
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
                    isStepFuture ? 'text-muted-foreground/70' : 'text-foreground',
                  )}>
                    {step.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-normal mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {chapterProgress.length > 0 && (
          <>
            <div className="mt-3 pt-2.5 border-t border-border/60">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Chapters
              </h5>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Unlock each chapter by completing its quest on the chapter page.
              </p>
            </div>
            <div className="flex flex-col gap-1 mt-1.5" data-testid="onboarding-chapters">
              {chapterProgress.map((cp) => {
                const Icon = chapterIcon(cp.chapter.badge);
                return (
                  <div
                    key={cp.chapter.id}
                    data-testid={`chapter-row-${cp.chapter.id}`}
                    data-completed={cp.isComplete ? 'true' : 'false'}
                    className={cn(
                      'w-full text-left p-1.5 flex items-start gap-2.5 rounded-md',
                      cp.isComplete && 'bg-emerald-500/5',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full mt-0.5',
                        cp.isComplete
                          ? 'bg-emerald-500 text-white'
                          : 'border border-muted-foreground/40 text-muted-foreground/70',
                      )}
                    >
                      {cp.isComplete ? (
                        <Check className="size-2.5" />
                      ) : (
                        <Icon className="size-2.5" />
                      )}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-[10px] font-bold leading-none',
                          cp.isComplete
                            ? 'text-foreground line-through decoration-emerald-500/60'
                            : 'text-foreground',
                        )}>
                          {cp.chapter.title}
                        </span>
                        <span className="text-[8px] text-muted-foreground tabular-nums">
                          {cp.completedCount}/{cp.totalCount}
                        </span>
                      </div>
                      <span className="text-[8px] text-muted-foreground leading-normal mt-0.5 truncate">
                        {cp.totalCount === 0
                          ? 'No quests linked yet.'
                          : cp.isComplete
                            ? 'Chapter complete.'
                            : `${cp.totalCount - cp.completedCount} quest${cp.totalCount - cp.completedCount === 1 ? '' : 's'} remaining.`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
