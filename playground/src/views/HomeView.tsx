/**
 * HomeView — the homepage: a scroll-driven product walkthrough.
 *
 * The redesigned home page renders the interactive hero (with live editor),
 * a short-circuit strip, the Learn section, the sticky Timer/Analytics runway,
 * and the Registry/Reference static areas. See playground/src/tour/HomeTour.tsx
 * for the section-level implementation.
 *
 * Preserved from the markdown-driven home (markdown/canvas/home/README.md):
 *  - quick-start quests (qs-arrive / qs-edit / qs-run) plus scroll quests
 *    (qs-tour-*) fired as each tour stage scrolls into view
 *  - ChallengeHeaderBadge on '/' (mounted by App.tsx) — home quests only
 *  - chapter quest list with live progress (now in the Learn section)
 */

import { useMemo } from 'react'
import { canvasRoutes, findCanvasPage } from '../canvas/canvasRoutes'
import { HomeTour } from '../tour/HomeTour'
import type { WorkoutItem } from '../App'

export interface HomeViewProps {
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
}

export function HomeView({ wodFiles, theme }: HomeViewProps) {
  const page = findCanvasPage('/')

  // Cross-page quest id → label, so chapter quest rows can show the real
  // labels declared on their owning guide pages.
  const questLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const { page: p } of canvasRoutes) {
      for (const q of p.quests) labels[q.id] = q.label
    }
    return labels
  }, [])

  if (!page) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        Home canvas content not found (markdown/canvas/routes/home.md)
      </div>
    )
  }

  return (
    <HomeTour
      wodFiles={wodFiles}
      theme={theme}
      quests={page.quests ?? []}
      chapters={page.chapters ?? []}
      questLabels={questLabels}
      chapterScroll={page.namedScrolls?.['chapters']}
    />
  )
}
