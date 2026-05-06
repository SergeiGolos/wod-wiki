import { useCallback, useRef, useState } from 'react'
import { Play, RotateCcw, Maximize2, BarChart2, Share2, FileText, Timer } from 'lucide-react'
import { HomeWelcome } from '../components/HomeWelcome'
import { MarkdownCanvasPage, type PanelActions } from '../canvas/MarkdownCanvasPage'
import { findCanvasPage } from '../canvas/canvasRoutes'
import { encodeZip } from '../services/encodeZip'
import type { WorkoutItem } from '../App'

export interface HomeViewProps {
  wodFiles: Record<string, string>
  theme: string
  workoutItems?: WorkoutItem[]
  onSelect?: (item: WorkoutItem) => void
  /** Opens the command palette in "load workout into home editor" mode. */
  onOpenHomePalette?: (onContentSelected: (content: string) => void) => void
}

export function HomeView({ wodFiles, theme, workoutItems, onSelect, onOpenHomePalette }: HomeViewProps) {
  const page = findCanvasPage('/')

  // Content injected from search palette selection
  const [contentOverride, setContentOverride] = useState<string | undefined>(undefined)

  // Imperative handles from MarkdownCanvasPage's first panel
  const panelActionsRef = useRef<PanelActions | null>(null)

  const handlePanelActionsReady = useCallback((actions: PanelActions) => {
    panelActionsRef.current = actions
  }, [])

  const handleOpenSearch = useCallback(() => {
    onOpenHomePalette?.((content) => {
      setContentOverride(content)
    })
  }, [onOpenHomePalette])

  const handleShare = useCallback(async () => {
    const source = panelActionsRef.current?.getSource() ?? ''
    if (!source.trim()) return
    try {
      const encoded = await encodeZip(source)
      const url = `${window.location.origin}${window.location.pathname}?z=${encoded}`
      await navigator.clipboard.writeText(url)
      console.info('[HomeView] share URL copied:', url)
    } catch (err) {
      console.error('[HomeView] share failed:', err)
    }
  }, [])

  // Action buttons rendered in the first panel's MacOSChrome header
  const panelHeaderActions = (
    <div className="flex items-center gap-1.5">

      {/* Edit | Track | Results — segmented group */}
      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <button
          onClick={() => panelActionsRef.current?.reset()}
          title="Edit workout"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-r border-border"
        >
          <FileText className="size-3" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => panelActionsRef.current?.run()}
          title="Track workout"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-r border-border"
        >
          <Timer className="size-3" />
          <span>Track</span>
        </button>
        <button
          onClick={() => panelActionsRef.current?.results()}
          title="Show results"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <BarChart2 className="size-3" />
          <span>Results</span>
        </button>
      </div>

      <div className="w-px h-4 bg-border" />

      {/* Reset — icon only */}
      <button
        onClick={() => panelActionsRef.current?.reset()}
        title="Reset"
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="size-3.5" />
      </button>

      {/* Run — primary action */}
      <button
        onClick={() => panelActionsRef.current?.run()}
        title="Run workout"
        className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
      >
        <Play className="size-3" />
        <span>Run</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        title="Copy share link"
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 className="size-3.5" />
      </button>

      {/* Fullscreen — rightmost, icon only */}
      <button
        onClick={() => panelActionsRef.current?.fullscreen()}
        title="Fullscreen"
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Maximize2 className="size-3.5" />
      </button>

    </div>
  )

  // HomeWelcome is injected as the heroSlot so it renders as the first item
  // inside the left scrolling column — sitting alongside the sticky editor panel.
  const heroSlot = (
    <HomeWelcome
      onOpenSearch={handleOpenSearch}
      onRun={() => panelActionsRef.current?.run()}
      onResults={() => panelActionsRef.current?.results()}
    />
  )

  return page ? (
    <MarkdownCanvasPage
      page={page}
      wodFiles={wodFiles}
      theme={theme}
      workoutItems={workoutItems}
      onSelect={onSelect}
      contentOverride={contentOverride}
      panelHeaderActions={panelHeaderActions}
      onPanelActionsReady={handlePanelActionsReady}
      heroSlot={heroSlot}
    />
  ) : (
    <div className="flex items-center justify-center p-20 text-muted-foreground">
      Home canvas content not found (markdown/canvas/routes/home.md)
    </div>
  )
}
