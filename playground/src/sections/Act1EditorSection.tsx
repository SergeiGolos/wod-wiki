import { useRef, useState, useCallback } from 'react'
import { Play, Search } from 'lucide-react'
import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { LiveTrackerPanel } from '../components/LiveTrackerPanel'
import { FrozenReviewPanel } from '../components/FrozenReviewPanel'
import {
  EDITOR_STEPS,
  TRACK_STEP_START,
  REVIEW_STEP_START,
  RECORDS_STEP_START,
} from '../data/parallaxActSteps'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'

export interface Act1EditorSectionProps {
  actualTheme: string
  onRun: (script: string) => void
  onSearch: () => void
  /** Ref exposed so parent can push scripts into the editor */
  editorRef?: React.RefObject<FrozenEditorPanelHandle | null>
  /** When set, the sticky panel shows the live tracker */
  trackerBlock?: WodBlock | null
  /** Preview script loaded from command palette but not yet started */
  trackerPreview?: string | null
  /** Called when user resets back to the editor view */
  onReset?: () => void
  /** Called when the tracker's preview Run button is clicked */
  onStartPreview?: (script: string) => void
  /** Opens the browse/collection palette from inside the tracker header */
  onClearPreview?: () => void
  /** Receives the live runtime when the tracker mounts */
  onRuntimeReady?: (runtime: IScriptRuntime) => void
  /** Live runtime lifted from RuntimeTimerPanel — drives the review panel */
  liveRuntime?: IScriptRuntime | null
  /** Called when the Track phase scrolls into view with no workout running */
  onAutoStart?: () => void
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
  onClearPreview,
  onRuntimeReady,
  liveRuntime = null,
  onAutoStart,
}: Act1EditorSectionProps) {
  const internalRef = useRef<FrozenEditorPanelHandle>(null)
  const ref = editorRef ?? internalRef

  // Track the active scroll step so we can drive chromeTitle / headerActions
  const [currentStep, setCurrentStep] = useState(0)

  // Refs for stable callbacks
  const blockRef = useRef(trackerBlock)
  blockRef.current = trackerBlock
  const autoStartFiredRef = useRef(false)

  const inPlan    = currentStep < TRACK_STEP_START
  const inTrack   = currentStep >= TRACK_STEP_START && currentStep < REVIEW_STEP_START
  const inReview  = currentStep >= REVIEW_STEP_START && currentStep < RECORDS_STEP_START
  const inRecords = currentStep >= RECORDS_STEP_START

  const chromeTitle = inReview ? 'Review' : inTrack ? 'Track' : 'Plan'

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step)
    // One-shot auto-start when the Track phase's sticky header first becomes active
    if (step === TRACK_STEP_START && !blockRef.current && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true
      onAutoStart?.()
    }
  }, [onAutoStart])

  const handleReset = useCallback(() => {
    onReset?.()
  }, [onReset])

  // Header actions shown in the MacOS chrome bar
  const headerActions = (inTrack || inReview || inRecords) ? (
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
      {inTrack && onClearPreview && (
        <button
          onClick={onClearPreview}
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
      onReset={(inTrack || inReview || inRecords) ? handleReset : undefined}
      headerActions={headerActions}
      onStepChange={handleStepChange}
      stickyContent={(activeStep, selectedExample) => {
        if (activeStep >= RECORDS_STEP_START) {
          return (
            <FrozenEditorPanel
              ref={ref}
              activeStep={activeStep}
              selectedExample={selectedExample}
              actualTheme={actualTheme}
              onRun={onRun}
              showRecords
            />
          )
        }
        if (activeStep >= REVIEW_STEP_START) {
          return <FrozenReviewPanel runtime={liveRuntime} />
        }
        if (activeStep >= TRACK_STEP_START) {
          return (
            <LiveTrackerPanel
              block={trackerBlock}
              onSearch={onSearch}
              preview={trackerPreview}
              actualTheme={actualTheme}
              onRuntimeReady={onRuntimeReady}
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
      className="bg-background"
    />
  )
}

