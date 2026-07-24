/**
 * QuestMenu — the single header quest unit for canvas pages.
 *
 * Replaces the former ChallengeHeaderBadge (page challenges) and
 * OnboardingBanner (roadmap + chapters), which duplicated the same dropdown
 * shell and split one concept across two triggers. One trigger shows a
 * combined completion summary; one dropdown holds up to three sections:
 *
 *   1. Onboarding Roadmap — the 5 Goal Gradient steps (home route only).
 *   2. Syntax Challenges — this page's quests; click scrolls to its section.
 *   3. Chapters — cross-route chapter progress from the localStorage ledger.
 *
 * Completion state is read-only and behavior-coupled: roadmap via
 * `useOnboardingProgress`, page quests via the `usePageQuests` ledger.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Dumbbell, Play, Sparkles, Timer, Trophy } from 'lucide-react';
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
import { usePageQuests } from '../../hooks/usePageQuests';
import { getProfile, updateProfile } from '../../services/playgroundProfile';
import type { Chapter, Quest } from '../../canvas/parseCanvasMarkdown';
import { ChallengeCard } from '../molecules/ChallengeCard';

const COMPLETION_DISPLAY_MS = 2000;

const ONBOARDING_STEPS_META = [
  { id: 1, key: 'visitedLanding' as const, label: 'Landed on WOD Wiki', desc: 'Arrived at the playground dashboard', icon: Check },
  { id: 2, key: 'editedNote' as const, label: 'Edit example workout', desc: 'Modify the markdown content below', icon: Dumbbell },
  { id: 3, key: 'ranWorkout' as const, label: 'Run workout timer', desc: 'Start compiling and run the timer', icon: Play },
  { id: 4, key: 'loggedEffort' as const, label: 'Log workout results', desc: 'Save your completed workout data', icon: Timer },
  { id: 5, key: 'openedReview' as const, label: 'Review your progress', desc: 'Check your logged performance metrics', icon: Trophy },
];

export interface QuestMenuProps {
  className?: string;
  pageRoute: string;
  /** This page's quests (canvas markdown ```quest blocks). */
  quests: Quest[];
  /** Chapter declarations; progress aggregates across routes. */
  chapters?: Chapter[];
  /** Render the 5-step Onboarding Roadmap section (home route only). */
  includeRoadmap?: boolean;
  /** challenge id → section id, for scroll-to-section navigation. */
  challengeSectionMap?: Map<string, string>;
  onScrollToSection?: (sectionId: string) => void;
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

/** Resolve an icon component from the chapter's `badge` string. */
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

export function QuestMenu({
  className,
  pageRoute,
  quests,
  chapters = [],
  includeRoadmap = false,
  challengeSectionMap,
  onScrollToSection,
}: QuestMenuProps) {
  const { progress, stepsComplete: roadmapDone, totalSteps: roadmapTotal, isComplete: roadmapComplete, mark } =
    useOnboardingProgress();
  const { chapters: chapterProgress } = useChapterProgress(chapters);
  const { quests: questsWithStatus, stepsComplete: questsDone, totalSteps: questsTotal } =
    usePageQuests(pageRoute, quests);

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  // Landing credit — only the roadmap-owning route marks it.
  useEffect(() => {
    if (includeRoadmap) mark('visitedLanding');
  }, [includeRoadmap, mark]);

  // One-shot completion celebration (per installation), then quiet state.
  const [showingCompletion, setShowingCompletion] = useState(false);
  useEffect(() => {
    if (!roadmapComplete) return;
    if (getProfile().completionCelebrated) return;
    setShowingCompletion(true);
    const t = setTimeout(() => {
      updateProfile({ completionCelebrated: true });
      setShowingCompletion(false);
    }, COMPLETION_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [roadmapComplete]);

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

  const handleChallengeClick = (questId: string) => {
    const sectionId = challengeSectionMap?.get(questId);
    if (sectionId && onScrollToSection) {
      onScrollToSection(sectionId);
      setOpen(false);
    }
  };

  const shownDone = (includeRoadmap ? roadmapDone : 0) + questsDone;
  const shownTotal = (includeRoadmap ? roadmapTotal : 0) + questsTotal;
  if (shownTotal === 0) return null;

  const allComplete = shownDone === shownTotal;
  const isCelebrative = roadmapComplete && showingCompletion && !getProfile().completionCelebrated;

  return (
    <div
      className={cn('relative py-1.5 shrink-0', className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Single trigger: combined completion summary */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 cursor-pointer focus:outline-none select-none text-left rounded-full border border-border/70 bg-background px-3 py-1 hover:bg-muted/40 hover:border-border transition-colors shadow-sm"
      >
        {allComplete ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <Sparkles className="size-4 text-muted-foreground" />
        )}
        <span
          data-testid="quest-menu-summary"
          className={cn(
            'text-[10px] font-black uppercase tracking-wider tabular-nums',
            allComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
            isCelebrative && 'animate-pulse',
          )}
        >
          {isCelebrative ? 'Complete! 🎉' : `${shownDone}/${shownTotal}`}
        </span>
        {includeRoadmap && !roadmapComplete && (
          <span className="text-[9px] text-muted-foreground select-none hidden lg:inline">
            {getHintText(roadmapDone)}
          </span>
        )}
      </button>

      {/* Single dropdown */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full mt-1.5 w-72 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3.5 z-50 origin-top-left before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5 before:bg-transparent"
        >
          <div className="mb-2.5 pb-2 border-b border-border/60 flex items-center justify-between gap-2">
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                Zero to Hero
              </h5>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Your quests, roadmap, and chapters in one place.
              </p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground tabular-nums">
              {shownDone}/{shownTotal}
            </span>
          </div>

          {includeRoadmap && (
            <div className="flex flex-col gap-1" data-testid="quest-menu-roadmap">
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
          )}

          {questsWithStatus.length > 0 && (
            <>
              {includeRoadmap && (
                <div className="mt-3 pt-2.5 border-t border-border/60">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                    Syntax Challenges
                  </h5>
                  <p className="text-[9px] text-muted-foreground mt-0.5 mb-1.5">
                    Click a challenge to jump to its section.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-1.5" data-testid="quest-menu-challenges">
                {questsWithStatus.map((quest) => (
                  <ChallengeCard
                    key={quest.id}
                    quest={quest}
                    compact
                    onClick={() => handleChallengeClick(quest.id)}
                  />
                ))}
              </div>
            </>
          )}

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
              <div className="flex flex-col gap-1 mt-1.5" data-testid="quest-menu-chapters">
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
      )}
    </div>
  );
}
