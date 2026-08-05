/**
 * TourLearnSection.tsx / LearnProgressOverview — compact chapter-progress
 * overview that follows the six syntax chapter heroes on the home page.
 *
 * Deliberately NOT a per-quest list: each chapter hero already renders its own
 * quest cards, so this section shows only high-level per-chapter completion
 * (badge + count + progress bar) with a link into each guide. Keeps the page
 * from listing every quest twice.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { chapterIcon } from '../components/ChallengeBadges'
import { cn } from '@/lib/utils'

export interface TourLearnSectionProps {
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
}

const CHAPTER_ROUTES: Record<string, string> = {
  basics: '/guide/syntax/basics',
  protocols: '/guide/syntax/protocols',
  structure: '/guide/syntax/structure',
  'custom-metrics': '/guide/syntax/custom-metrics',
  dialects: '/guide/syntax/dialects',
  complex: '/guide/syntax/complex',
}

export function LearnProgressOverview({
  chapters,
}: TourLearnSectionProps) {
  const handleLesson = () => telemetry.record(HOME_EVENTS.lessonStarted)
  const handleCheatsheet = () => telemetry.record(HOME_EVENTS.cheatsheetOpened)
  const { chapters: progress } = useChapterProgress(chapters)

  // Only the language chapters (home-tour is honored by the celebration bridge).
  const languageChapters = progress.filter((c) => c.chapter.id !== 'home-tour')

  return (
    <section
      data-testid="tour-learn"
      className="mx-auto max-w-5xl px-6 py-16 border-b border-border/60"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Learn the Language</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed max-w-xl">
            Six chapters, each with a runnable example and quests to earn. Track your progress below or dive into a guide.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/guide/syntax/basics"
            onClick={handleLesson}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Lesson 1
          </Link>
          <Link
            to="/guide/syntax/cheatsheet"
            onClick={handleCheatsheet}
            className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Cheat sheet →
          </Link>
        </div>
      </div>

      {/* Per-chapter progress — summary only, no per-quest rows. */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {languageChapters.map(({ chapter, completedCount, totalCount, isComplete }) => {
          const route = CHAPTER_ROUTES[chapter.id] ?? '/guide/syntax'
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          const Icon = chapterIcon(chapter.badge)
          return (
            <Link
              key={chapter.id}
              to={route}
              className={cn(
                'group flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40',
                isComplete ? 'border-emerald-500/30' : 'border-border',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground">
                  {Icon && <Icon className="size-4" />}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{chapter.title}</span>
                {isComplete && (
                  <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    done
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/** Back-compat alias; the old full quest list is retired (issues #926/#927). */
export const TourLearnSection = LearnProgressOverview
