import { HomeHero } from '../components/HomeHero'
import { CanvasPage } from '../canvas/CanvasPage'
import { findCanvasPage } from '../canvas/canvasRoutes'
import type { WorkoutItem } from '../App'

export interface HomeViewProps {
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
}

export function HomeView({ wodFiles, theme, workoutItems, onSelect }: HomeViewProps) {
  const page = findCanvasPage('/')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HomeHero />
      {page ? (
        <CanvasPage
          page={page}
          wodFiles={wodFiles}
          theme={theme}
          workoutItems={workoutItems}
          onSelect={onSelect}
        />
      ) : (
        <div className="flex items-center justify-center p-20 text-muted-foreground">
          Home canvas content not found (markdown/canvas/routes/home.md)
        </div>
      )}
    </div>
  )
}
