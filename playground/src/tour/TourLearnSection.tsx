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

export function TourLearnSection({
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
      className="mx-auto grid max-w-5xl items-start gap-8 px-6 py-20 lg:grid-cols-2"
    >
      <div className="lg:sticky lg:top-[104px]">
        <h2 className="text-3xl font-bold tracking-tight">Learn the Language</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          From first <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.86em]">wod</code> line to fluency — Lesson 1 is 3 minutes, runnable in place.
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
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Cheat sheet
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
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
