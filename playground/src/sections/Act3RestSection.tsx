import { ParallaxSection } from '../components/ParallaxSection'
import { LiveTrackerPanel } from '../components/LiveTrackerPanel'
import { REST_STEPS } from '../data/parallaxActSteps'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'

export interface Act3RestSectionProps {
  actualTheme: string
  block: WodBlock | null
  onSearch: () => void
  onRuntimeReady?: (runtime: IScriptRuntime) => void
}

export function Act3RestSection({
  actualTheme,
  block,
  onSearch,
  onRuntimeReady,
}: Act3RestSectionProps) {
  return (
    <ParallaxSection
      id="rest"
      steps={REST_STEPS}
      stickyAlign="left"
      chromeTitle="Track"
      stickyContent={() => (
        <LiveTrackerPanel
          block={block}
          onSearch={onSearch}
          preview={null}
          actualTheme={actualTheme}
          onRuntimeReady={onRuntimeReady}
        />
      )}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
    />
  )
}
