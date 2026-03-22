import { Play, Search } from 'lucide-react'
import { useRef, useCallback } from 'react'
import { ParallaxSection } from '../components/ParallaxSection'
import { LiveTrackerPanel } from '../components/LiveTrackerPanel'
import { TRACKER_STEPS } from '../data/parallaxActSteps'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'

export interface Act2TrackSectionProps {
  actualTheme: string
  block: WodBlock | null
  preview: string | null
  onReset: () => void
  onSearch: () => void
  onStartPreview: (script: string) => void
  onClearPreview: () => void
  onRuntimeReady?: (runtime: IScriptRuntime) => void
  /** Called when the tracker section scrolls into view with no workout running */
  onAutoStart?: () => void
}

export function Act2TrackSection({
  actualTheme,
  block,
  preview,
  onReset,
  onSearch,
  onStartPreview,
  onClearPreview,
  onRuntimeReady,
  onAutoStart,
}: Act2TrackSectionProps) {
  // Track block in a ref so the step-change callback always sees the latest value
  const blockRef = useRef(block)
  blockRef.current = block

  // Once auto-start fires it should never re-fire (e.g. after reset the block
  // becomes null again but the step is still 0, which would cause an instant
  // restart loop).
  const autoStartFiredRef = useRef(false)

  const handleStepChange = useCallback((step: number) => {
    if (step !== 0 || blockRef.current || autoStartFiredRef.current) return
    // Guard against premature fire while the user is still on the Plan section:
    // only proceed when the tracker section has scrolled meaningfully into view.
    const section = document.getElementById('tracker')
    if (section) {
      const rect = section.getBoundingClientRect()
      if (rect.top > window.innerHeight * 0.5) return
    }
    autoStartFiredRef.current = true
    onAutoStart?.()
  }, [onAutoStart])
  const headerActions = (
    <>
      {!block && preview && (
        <button
          onClick={() => onStartPreview(preview)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
        >
          <Play className="size-2.5 fill-current" />
          Run
        </button>
      )}
      <button
        onClick={onClearPreview}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-transparent hover:border-border/60 transition-all"
      >
        <Search className="size-2.5" />
        Browse
      </button>
    </>
  )

  return (
    <ParallaxSection
      id="tracker"
      steps={TRACKER_STEPS}
      stickyAlign="left"
      chromeTitle="Track"
      onReset={onReset}
      headerActions={headerActions}
      stickyContent={() => (
        <LiveTrackerPanel
          block={block}
          onSearch={onSearch}
          preview={preview}
          actualTheme={actualTheme}
          onRuntimeReady={onRuntimeReady}
        />
      )}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
      onStepChange={handleStepChange}
    />
  )
}
