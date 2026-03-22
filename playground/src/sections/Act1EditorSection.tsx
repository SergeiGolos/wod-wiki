import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Search } from 'lucide-react'
import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { LiveTrackerPanel } from '../components/LiveTrackerPanel'
import { FrozenReviewPanel } from '../components/FrozenReviewPanel'
import { EDITOR_STEPS } from '../data/parallaxActSteps'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'

type PanelMode = 'editor' | 'tracking' | 'reviewing'

export interface Act1EditorSectionProps {
  actualTheme: string
  onRun: (script: string) => void
  onSearch: () => void
  /** Ref exposed so parent can push scripts into the editor */
  editorRef?: React.RefObject<FrozenEditorPanelHandle | null>
  /** When set, the sticky panel switches from editor → live tracker */
  trackerBlock?: WodBlock | null
  /** Preview script loaded from command palette but not yet started */
  trackerPreview?: string | null
  /** Called when user resets back to the editor view */
  onReset?: () => void
  /** Called when the tracker's preview Run button is clicked */
  onStartPreview?: (script: string) => void
  /** Receives the live runtime when the tracker mounts */
  onRuntimeReady?: (runtime: IScriptRuntime) => void
  /** Live runtime lifted from RuntimeTimerPanel — drives the review panel */
  liveRuntime?: IScriptRuntime | null
}

export function Act1EditorSection({
  actualTheme,
  onRun,
  onSearch,
  editorRef,
  trackerBlock = null,
  trackerPreview = null,
  onReset,
  onStartPreview,
  onRuntimeReady,
  liveRuntime = null,
}: Act1EditorSectionProps) {
  const internalRef = useRef<FrozenEditorPanelHandle>(null)
  const ref = editorRef ?? internalRef

  const [panelMode, setPanelMode] = useState<PanelMode>('editor')

  // Sync mode with trackerBlock lifecycle
  useEffect(() => {
    if (trackerBlock || trackerPreview) {
      setPanelMode(prev => prev === 'reviewing' ? prev : 'tracking')
    } else {
      setPanelMode('editor')
    }
  }, [trackerBlock, trackerPreview])

  const handleComplete = useCallback(() => {
    setPanelMode('reviewing')
  }, [])

  const handleReset = useCallback(() => {
    setPanelMode('editor')
    onReset?.()
  }, [onReset])

  const isTracking = panelMode === 'tracking'
  const isReviewing = panelMode === 'reviewing'
  const isActive = isTracking || isReviewing

  const chromeTitle = isReviewing ? 'Review' : isTracking ? 'Track' : 'Plan'

  // Header actions
  const activeHeaderActions = isActive ? (
    <>
      {!trackerBlock && trackerPreview && onStartPreview && (
        <button
          onClick={() => onStartPreview(trackerPreview)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
        >
          <Play className="size-2.5 fill-current" />
          Run
        </button>
      )}
      {isTracking && (
        <button
          onClick={onSearch}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-transparent hover:border-border/60 transition-all"
        >
          <Search className="size-2.5" />
          Browse
        </button>
      )}
    </>
  ) : undefined

  return (
    <ParallaxSection
      id="editor"
      steps={EDITOR_STEPS}
      stickyAlign="right"
      chromeTitle={chromeTitle}
      onReset={isActive ? handleReset : undefined}
      headerActions={activeHeaderActions}
      stickyContent={(activeStep, selectedExample) => {
        if (isReviewing) {
          return <FrozenReviewPanel runtime={liveRuntime} />
        }
        if (isTracking) {
          return (
            <LiveTrackerPanel
              block={trackerBlock}
              onSearch={onSearch}
              preview={trackerPreview}
              actualTheme={actualTheme}
              onRuntimeReady={onRuntimeReady}
              onComplete={handleComplete}
            />
          )
        }
        return (
          <FrozenEditorPanel
            ref={ref}
            activeStep={activeStep}
            selectedExample={selectedExample}
            actualTheme={actualTheme}
            onRun={onRun}
          />
        )
      }}
      renderStepExtra={(stepIdx, _activeStep) => {
        if (stepIdx !== EDITOR_STEPS.length - 1) return null
        return (
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={onSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 text-foreground text-xs font-black uppercase tracking-wider border border-border/60 shadow-sm hover:bg-muted hover:scale-[1.03] transition-all w-fit"
            >
              <Search className="size-3.5" />
              Browse Workouts
            </button>
          </div>
        )
      }}
      className="bg-background"
    />
  )
}
