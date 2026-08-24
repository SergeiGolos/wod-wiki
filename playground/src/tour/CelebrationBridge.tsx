/**
 * CelebrationBridge.tsx — static bridge section following the tour.
 *
 * Placed between the tour section and the first chapter hero (Basics).
 * Headline: "You've seen how it works. Now learn the language."
 * Hype paragraph: One-paragraph overview of the six syntax chapters.
 * Celebrated state: progress badge for `home-tour` chapter; flips to green-check
 * "Take the Tour — complete ✓" when all home-tour quests are complete.
 */

import { Check } from 'lucide-react'
import type { Chapter } from '../canvas/parseCanvasMarkdown'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { cn } from '@/lib/utils'

export interface CelebrationBridgeProps {
  chapters: Chapter[]
  className?: string
}

export function CelebrationBridge({ chapters, className }: CelebrationBridgeProps) {
  const { chapters: chapterProgress } = useChapterProgress(chapters)
  const tourProgress = chapterProgress.find((c) => c.chapter.id === 'home-tour')
  const isComplete = tourProgress?.isComplete ?? false
  const completedCount = tourProgress?.completedCount ?? 0
  const totalCount = tourProgress?.totalCount ?? 5

  return (
    <section
      data-testid="celebration-bridge"
      className={cn('py-12 px-4 border-b border-border/60 text-center', className)}
    >
      <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
        {/* Progress badge / Celebrated state */}
        <div
          data-testid="celebration-badge"
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-bold transition-colors',
            isComplete
              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border border-border bg-muted/30 text-muted-foreground',
          )}
        >
          {isComplete ? (
            <>
              <Check className="size-3.5 stroke-[2.5]" />
              <span>Take the Tour — complete ✓</span>
            </>
          ) : (
            <>
              <span className="size-2 rounded-full bg-primary" />
              <span>
                Take the Tour — {completedCount}/{totalCount}
              </span>
            </>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          You've seen how it works. Now master the syntax.
        </h2>


        {/* Hype Paragraph */}
        <p className="text-[14px] sm:text-[15px] leading-relaxed text-muted-foreground max-w-xl">
          From your first <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded text-foreground">wod</code> block to a full training session: time-capped protocols like AMRAP and EMOM, repeating rounds and dash-format rep schemes (<code className="font-mono text-[12px] bg-muted px-1 py-0.5 rounded text-foreground">21-15-9</code>), inline metrics for effort and heart rate, dialect fences for workout, log, plan, and climb notes — and complex workouts that chain it all into one session. Six chapters on the syntax, each with a runnable example and quests to earn. Keep scrolling to start.
        </p>
      </div>
    </section>
  )
}
