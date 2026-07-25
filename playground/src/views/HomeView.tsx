/**
 * HomeView — the homepage: a scroll-driven product walkthrough.
 *
 * One macOS-chrome window stays mounted and morphs through the app's four
 * surfaces — the real NoteEditor (scroll-driven typewriter), the real
 * WallClock (RuntimeTimerPanel + CastButtonRpc), the real analytics review
 * (AnalyticsScorecard + ReviewGrid), and the real Collections/Feeds lists —
 * driven by scroll position over a tall runway. Pressing Run in the editor
 * hands the window to the visitor (playground mode); Stop lands on real
 * analytics; ✕ / the hint pill returns to scroll sync.
 *
 * Preserved from the markdown-driven home (markdown/canvas/home/README.md):
 *  - quick-start quests (qs-arrive / qs-edit / qs-run) plus scroll quests
 *    (qs-tour-*) fired as each tour stage scrolls into view
 *  - ChallengeHeaderBadge on '/' (mounted by App.tsx) — home quests only
 *  - search-palette content injection, zip share links
 *  - Jump-Right-In + chapter quest list with live progress (tour outro)
 *
 * Implementation lives in playground/src/tour/.
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
    />
  )
}
