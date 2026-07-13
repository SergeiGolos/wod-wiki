/**
 * ChallengeHeaderBadge — compact challenge progress badge + dropdown for
 * the canvas page sticky header. Reads persisted completion state from
 * the page quest ledger; clicking a challenge scrolls to its section.
 */

import { Check, Sparkles } from 'lucide-react';
import type { Quest } from '../../canvas/parseCanvasMarkdown';
import { usePageQuests } from '../../hooks/usePageQuests';
import { cn } from '@/lib/utils';

export interface ChallengeHeaderBadgeProps {
  pageRoute: string;
  quests: Quest[];
  /** challenge id → section id, used for scroll-to-section navigation. */
  challengeSectionMap: Map<string, string>;
  onScrollToSection?: (sectionId: string) => void;
  className?: string;
}

export function ChallengeHeaderBadge({
  pageRoute,
  quests,
  challengeSectionMap,
  onScrollToSection,
  className,
}: ChallengeHeaderBadgeProps) {
  const { quests: questsWithStatus, stepsComplete, totalSteps, isComplete } = usePageQuests(pageRoute, quests);

  if (totalSteps === 0) return null;

  const handleChallengeClick = (questId: string) => {
    const sectionId = challengeSectionMap.get(questId);
    if (sectionId) {
      onScrollToSection?.(sectionId);
    }
  };

  return (
    <div className={cn('relative group py-1 shrink-0', className)}>
      <button
        type="button"
        className="flex items-center gap-1.5 cursor-pointer focus:outline-none select-none text-left rounded-full border border-border/70 bg-background px-2 py-0.5 hover:bg-muted/40 transition-colors"
      >
        {isComplete ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <Sparkles className="size-3 text-muted-foreground" />
        )}
        <span
          className={cn(
            'text-[9px] font-black uppercase tracking-wider',
            isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {stepsComplete}/{totalSteps}
        </span>
      </button>

      {/* Hover popover challenge list */}
      <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100 transition-all duration-150 origin-top-left before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1.5">
        <div className="mb-2.5 pb-2 border-b border-border/60 flex items-center justify-between gap-2">
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">
              Syntax Challenges
            </h5>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Click a challenge to jump to its section.
            </p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground tabular-nums">
            {stepsComplete}/{totalSteps}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {questsWithStatus.map((q) => {
            const sectionId = challengeSectionMap.get(q.id);
            return (
              <button
                key={q.id}
                type="button"
                disabled={!sectionId}
                onClick={() => handleChallengeClick(q.id)}
                className={cn(
                  'w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  q.isCompleted
                    ? 'bg-primary/5 text-foreground'
                    : 'hover:bg-muted/40 text-foreground',
                  !sectionId && 'opacity-60 cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full',
                    q.isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'border border-muted-foreground/40 text-muted-foreground/70',
                  )}
                >
                  {q.isCompleted && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                <span className={cn('font-medium', q.isCompleted && 'line-through decoration-primary/40')}>
                  {q.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
