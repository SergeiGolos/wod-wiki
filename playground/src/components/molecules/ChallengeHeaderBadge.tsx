/**
 * ChallengeHeaderBadge — compact challenge progress badge + dropdown for
 * the canvas page sticky header. Reads persisted completion state from
 * the page quest ledger; clicking a challenge scrolls to its section.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { Quest } from '../../canvas/parseCanvasMarkdown';
import { usePageQuests } from '../../hooks/usePageQuests';
import { cn } from '@/lib/utils';
import { ChallengeCard } from './ChallengeCard';

export interface ChallengeHeaderBadgeProps {
  pageRoute: string;
  quests: Quest[];
  /** challenge id → section id, used for scroll-to-section navigation. */
  challengeSectionMap: Map<string, string>;
  onScrollToSection?: (sectionId: string) => void;
}

export function ChallengeHeaderBadge({
  pageRoute,
  quests,
  challengeSectionMap,
  onScrollToSection,
}: ChallengeHeaderBadgeProps) {
  const { quests: questsWithStatus, stepsComplete, totalSteps, isComplete } = usePageQuests(pageRoute, quests);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (totalSteps === 0) return null;

  const handleChallengeClick = (questId: string) => {
    const sectionId = challengeSectionMap.get(questId);
    if (sectionId) {
      onScrollToSection?.(sectionId);
    }
    setOpen(false);
  };

  // Close on Escape; also close when focus leaves the badge container.
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

    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      panelRef.current?.removeEventListener('focusout', handleFocusOut);
    };
  }, [open]);

  return (
    <div className="relative py-1.5 shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 cursor-pointer focus:outline-none select-none text-left rounded-full border border-border/70 bg-background px-3 py-1 hover:bg-muted/40 hover:border-border transition-colors shadow-sm"
      >
        {isComplete ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <Sparkles className="size-4 text-muted-foreground" />
        )}
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-wider',
            isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {stepsComplete}/{totalSteps}
        </span>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3 z-50 origin-top-left"
        >
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
                <ChallengeCard
                  key={q.id}
                  quest={q}
                  onClick={sectionId ? () => handleChallengeClick(q.id) : undefined}
                  disabled={!sectionId}
                  compact
                  className="border-0 bg-transparent hover:bg-muted/40"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
