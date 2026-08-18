import React, { useCallback, useEffect, useRef } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { CastButtonRpc } from '@/components/organisms/cast/CastButtonRpc'
import { RuntimeTimerPanel } from '@/components/organisms/editor/RuntimeTimerPanel'
import { TEST_IDS } from '@/testing/contracts/TestIdContract'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine'
import { useRingRef } from '../TourRing'

export interface TourTimerScreenProps {
  block: ScriptBlock | null
  autoStart: boolean
  onClose: () => void
  onComplete: (blockId: string, results: WorkoutResults) => void
  onRuntimeReady: (runtime: IScriptRuntime) => void
  /** Called once when the runtime transitions from idle to running. */
  onRunStarted?: () => void
  /**
   * Scroll-out stop (#885): when true, the panel halts execution without
   * resetting — the run's outputs stay in the runtime so the analytics
   * cards keep the data.
   */
  externalPause?: boolean
  /** Header Reset button: restart the run on demand (#885). */
  onReset?: () => void
}

export const TourTimerScreen: React.FC<TourTimerScreenProps> = ({
  block,
  autoStart,
  onClose,
  onComplete,
  onRuntimeReady,
  onRunStarted,
  externalPause,
  onReset,
}) => {
  const floorRef = useRingRef('timer.floor')
  const nextButtonRef = useRingRef('timer.nextButton')
  const castButtonRef = useRingRef('timer.castButton')
  const floorElRef = useRef<HTMLDivElement | null>(null)

  const setFloorEl = useCallback(
    (el: HTMLDivElement | null) => {
      floorElRef.current = el
      floorRef(el)
    },
    [floorRef],
  )

  // Card-2 highlight (#885): the ring targets the panel's live Next button.
  // The button mounts asynchronously (the panel builds its runtime first),
  // so watch the floor for it and register the element once it exists.
  useEffect(() => {
    const floor = floorElRef.current
    if (!floor) return
    const register = (): boolean => {
      const btn = floor.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.TIMER_NEXT_BLOCK}"]`)
      nextButtonRef(btn)
      return btn != null
    }
    if (register()) return () => nextButtonRef(null)
    const observer = new MutationObserver(() => {
      if (register()) observer.disconnect()
    })
    observer.observe(floor, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      nextButtonRef(null)
    }
  }, [nextButtonRef, block])

  // The panel's Stop button fires onComplete (→ analytics screen) and then
  // onClose. The tour window stays mounted across screens, so the panel's
  // "close" is a no-op — exiting playground mode is the ✕ button's job
  // (prop onClose), wired above.
  const handlePanelClose = () => {}

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-end gap-2 border-b border-border px-3 py-2">
        {onReset && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onReset}
            title="Reset timer"
            aria-label="Reset timer"
            data-testid="tour-timer-reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <div ref={castButtonRef}>
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

      <div ref={setFloorEl} className="flex-1 min-h-0">
        {block ? (
          <RuntimeTimerPanel
            block={block}
            onClose={handlePanelClose}
            onComplete={onComplete}
            autoStart={autoStart}
            onRuntimeReady={onRuntimeReady}
            onRunStarted={onRunStarted}
            externalPause={externalPause}
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
