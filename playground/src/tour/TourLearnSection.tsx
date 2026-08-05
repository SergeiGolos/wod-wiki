/**
 * TourLearnSection.tsx / LearnProgressOverview — progress summary section.
 *
 * Appears after the six syntax chapter heroes on the home page.
 * Displays overall quest progress across all chapters via TourQuests,
 * with quick links to Lesson 1 (Basics) and the Cheatsheet.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { TourQuests } from './TourQuests'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'

export interface TourLearnSectionProps {
  quests: Quest[]
  chapters: Chapter[]
  questLabels?: Record<string, string>
  onHomeQuestClick?: (questId: string) => void
}

export function LearnProgressOverview({
  quests,
  chapters,
  questLabels,
  onHomeQuestClick,
}: TourLearnSectionProps) {
  const handleLesson = () => telemetry.record(HOME_EVENTS.lessonStarted)
  const handleCheatsheet = () => telemetry.record(HOME_EVENTS.cheatsheetOpened)

  return (
    <section
      data-testid="tour-learn"
      className="mx-auto grid max-w-5xl items-start gap-8 px-6 py-16 lg:grid-cols-2 border-b border-border/60"
    >
      <div className="lg:sticky lg:top-[104px]">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Learn the Language</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Track your progress across all six syntax chapters. Complete quests by running examples or working through the syntax guides.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <TourQuests
          quests={quests}
          chapters={chapters}
          questLabels={questLabels}
          onHomeQuestClick={onHomeQuestClick}
        />
      </div>
    </section>
  )
}

export const TourLearnSection = LearnProgressOverview
