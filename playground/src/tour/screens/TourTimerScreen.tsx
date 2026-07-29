import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc'
import { RuntimeTimerPanel } from '@/components/organisms/editor/RuntimeTimerPanel'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import { useRingRef } from '../TourRing'

export interface TourTimerScreenProps {
  block: ScriptBlock | null
  autoStart: boolean
  onClose: () => void
  onComplete: (blockId: string, results: WorkoutResults) => void
  onRuntimeReady: (runtime: IScriptRuntime) => void
  /** Called once when the runtime transitions from idle to running. */
  onRunStarted?: () => void
}

export const TourTimerScreen: React.FC<TourTimerScreenProps> = ({
  block,
  autoStart,
  onClose,
  onComplete,
  onRuntimeReady,
  onRunStarted,
}) => {
  const castRef = useRingRef('timer.cast')
  const floorRef = useRingRef('timer.floor')

  // The panel's Stop button fires onComplete (→ analytics screen) and then
  // onClose. The tour window stays mounted across screens, so the panel's
  // "close" is a no-op — exiting playground mode is the ✕ button's job
  // (prop onClose), wired above.
  const handlePanelClose = () => {}

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-end gap-2 border-b border-border px-3 py-2">
        <div ref={castRef}>
          <CastButtonRpc />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onClose}
          title="Back to the tour"
          aria-label="Back to the tour"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div ref={floorRef} className="flex-1 min-h-0">
        {block ? (
          <RuntimeTimerPanel
            block={block}
            onClose={handlePanelClose}
            onComplete={onComplete}
            autoStart={autoStart}
            onRuntimeReady={onRuntimeReady}
            onRunStarted={onRunStarted}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Write a workout in the demo editor above
          </div>
        )}
      </div>
    </div>
  )
}

export default TourTimerScreen
