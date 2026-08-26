/**
 * ChallengeBanner — inline quest list rendered near the canvas editor.
 *
 * Shows one row per quest from the page's frontmatter. Each row shows the
 * quest label, a live pass/fail pill, and a hint (the validator's
 * `reason` or `detail`) that updates as the user types.
 *
 * All state is read from `useSyntaxChallenge` — this component is
 * presentational and has no opinions on what counts as "pass."
 */

import { Sparkles } from 'lucide-react';
import type { Quest } from '../../canvas/parseCanvasMarkdown';
import type { ValidationResult } from '../../services/syntaxChallengeValidator';
import { cn } from '@/lib/utils';
import { ChallengeCard } from './ChallengeCard';

export interface ChallengeBannerProps {
  quests: Array<Quest & { isCompleted: boolean; result: ValidationResult }>;
  className?: string;
}

export function ChallengeBanner({ quests, className }: ChallengeBannerProps) {
  if (quests.length === 0) return null;

  const completed = quests.filter((q) => q.isCompleted).length;
  const allDone = completed === quests.length;

  return (
    <section
      data-testid="challenge-banner"
      aria-label="Syntax challenges"
      className={cn(
        'rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5',
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles
            className={cn(
              'size-4',
              allDone ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground">
            Syntax challenges
          </h2>
        </div>
        <span
          data-testid="challenge-progress"
          className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground"
        >
          {completed} / {quests.length}
        </span>
      </header>

      <ul className="space-y-2">
        {quests.map((q) => (
          <li key={q.id}>
            <ChallengeCard quest={q} />
          </li>
        ))}
      </ul>
    </section>
  );
}
