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

import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import type { Quest } from '@/hooks/usePageQuests';
import type { ValidationResult } from '@/services/syntaxChallengeValidator';
import { cn } from '@/lib/utils';

export interface ChallengeBannerProps {
  quests: Array<Quest & { result: ValidationResult }>;
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
          <li
            key={q.id}
            data-testid={`challenge-row-${q.id}`}
            data-completed={q.isCompleted ? 'true' : 'false'}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
              q.isCompleted
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/50 bg-background/60',
            )}
          >
            <span
              className={cn(
                'mt-0.5 shrink-0',
                q.isCompleted ? 'text-primary' : 'text-muted-foreground/50',
              )}
              aria-hidden="true"
            >
              {q.isCompleted ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Circle className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'font-semibold',
                  q.isCompleted
                    ? 'text-foreground line-through decoration-primary/40'
                    : 'text-foreground',
                )}
              >
                {q.label}
              </p>
              {q.desc && (
                <p className="mt-0.5 text-xs text-muted-foreground">{q.desc}</p>
              )}
              <p
                data-testid={`challenge-hint-${q.id}`}
                className={cn(
                  'mt-1 text-xs',
                  q.isCompleted
                    ? 'text-primary/80'
                    : q.result.pass
                    ? 'text-primary/80'
                    : 'text-muted-foreground',
                )}
              >
                {q.isCompleted
                  ? 'Challenge complete.'
                  : q.result.pass
                  ? `Ready — ${q.result.detail ?? 'looks good'}`
                  : q.result.reason ?? 'Open the editor to begin.'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
