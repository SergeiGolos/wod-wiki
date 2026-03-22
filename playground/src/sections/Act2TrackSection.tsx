import { Play, Search } from 'lucide-react'
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
}: Act2TrackSectionProps) {
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
    />
  )
}
