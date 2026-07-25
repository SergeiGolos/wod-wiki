/**
 * OnboardingBanner — integrated header onboarding progress.
 *
 * It is rendered in the page title accessory / nav header on the home
 * canvas route (`/`). Renders a compact progress badge on mobile and
 * details on desktop, featuring a click/hover overlay for step navigation.
 *
 * It uses the localStorage-backed onboarding progress state to display a
 * read-only roadmap checklist of onboarding tasks, plus a "Chapters"
 * section that aggregates cross-route chapter quest progress via
 * `useChapterProgress`.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Dumbbell, Play, Timer, Trophy } from 'lucide-react';
import { chapterIcon } from '../ChallengeBadges';
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

/** SVG progress ring — POC "honest progress" meter. Fills clockwise as
 *  `fraction` goes 0 → 1, with the `done/total` label centered. */
function ProgressRing({ done, total, size = 36, stroke = 3.5 }: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted/40" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className="stroke-brand transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tabular-nums text-foreground">
        {done}/{total}
      </span>
    </span>
  );
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

export function OnboardingBanner({ className, chapters = [] }: OnboardingBannerProps) {
  const { progress, stepsComplete, totalSteps, isComplete, mark } = useOnboardingProgress();
  const { chapters: chapterProgress } = useChapterProgress(chapters);

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

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

  // Clear any pending close timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  // Close on Escape, focusout, and click-outside
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      const container = buttonRef.current?.parentElement;
      if (container && next && !container.contains(next)) {
        setOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const container = buttonRef.current?.parentElement;
      if (container && !container.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    panelRef.current?.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      panelRef.current?.removeEventListener('focusout', handleFocusOut);
    };
  }, [open]);

  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimeoutRef.current = window.setTimeout(() => setOpen(false), 150);
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      cancelClose();
      setOpen(true);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      scheduleClose();
    }
  };

  const completionCelebrated = getProfile().completionCelebrated;
  const isCelebrative = isComplete && showingCompletion && !completionCelebrated;

  // One honest meter: first-run steps + chapter quests in a single count,
  // so the ring only moves when the user actually does something.
  const questsTotal = chapterProgress.reduce((n, cp) => n + cp.totalCount, 0);
  const questsDone = chapterProgress.reduce((n, cp) => n + cp.completedCount, 0);
  const overallDone = stepsComplete + questsDone;
  const overallTotal = totalSteps + questsTotal;

  return (
    <div
      className={cn('relative py-1 shrink-0', className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Header Actions Badge */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 cursor-pointer focus:outline-none select-none text-left"
      >
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
            <ProgressRing done={overallDone} total={overallTotal} size={18} stroke={2.5} />
            <span className="text-[9px] text-muted-foreground select-none hidden lg:inline">
              {getHintText(stepsComplete)}
            </span>
          </div>
        )}
      </button>

      {/* Click/hover popover details & navigation overlay */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3.5 z-50 origin-top-left before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5 before:bg-transparent"
        >
          <div className="mb-2.5 pb-2 border-b border-border/60 flex items-center gap-2.5">
            <ProgressRing done={overallDone} total={overallTotal} size={34} />
            <div className="min-w-0">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Onboarding Roadmap
              </h5>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Step 1 was free. The rest is you.
              </p>
            </div>
          </div>

        {chapterProgress.length > 0 && (
          <div className="flex flex-col gap-1" data-testid="onboarding-chapters">
            {chapterProgress.map((cp) => {
              const Icon = chapterIcon(cp.chapter.badge);
              const pct = cp.totalCount > 0 ? (cp.completedCount / cp.totalCount) * 100 : 0;
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
                        : cp.completedCount > 0
                          ? 'border border-brand text-brand bg-brand/10'
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
                          ? 'text-muted-foreground line-through decoration-emerald-500/60'
                          : 'text-foreground',
                      )}>
                        {cp.chapter.title}
                      </span>
                      <span className="text-[8px] text-muted-foreground tabular-nums">
                        {cp.completedCount}/{cp.totalCount}
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          cp.isComplete ? 'bg-emerald-500' : 'bg-brand',
                        )}
                        style={{ width: `${pct}%` }}
                      />
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
        )}

        <div className="mt-3 pt-2.5 border-t border-border/60">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
            First Run
          </h5>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Progress only moves when you do.
          </p>
        </div>
        <div className="flex flex-col gap-1 mt-1.5">
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
                    <span className="flex size-4 items-center justify-center rounded-full border border-brand bg-brand/10 text-[8px] font-bold text-brand">
                      {step.id}
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
                    isStepDone
                      ? 'text-muted-foreground line-through decoration-emerald-500/60'
                      : isStepFuture
                        ? 'text-muted-foreground/70'
                        : 'text-foreground',
                  )}>
                    {step.label}
                  </span>
                  <span className="text-[8px] text-muted-foreground leading-normal mt-0.5">
                    {isStepDone && step.id === 1
                      ? 'Endowed progress — given, not earned.'
                      : step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
