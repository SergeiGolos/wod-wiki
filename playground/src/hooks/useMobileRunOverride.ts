/**
 * useMobileRunOverride — on mobile, timer/wall-clock blocks always run
 * fullscreen rather than in-panel. The page passes the chosen `runState`
 * (the override on mobile, the runtime's own on desktop) to its panels and
 * the prose column.
 */
import { useMemo, type MutableRefObject } from 'react'
import type { ScriptBlock } from '@/components/Editor/types'
import type { RunButtonState } from '../components/molecules/SectionButtons'
import { blockHasTimer } from '../canvas/canvasUtils'

interface UseMobileRunOverrideOptions {
  isMobile: boolean
  baseRunState: RunButtonState
  setFullscreenBlock: (block: ScriptBlock | null) => void
  scriptBlocksRef: MutableRefObject<ScriptBlock[]>
}

export function useMobileRunOverride({
  isMobile,
  baseRunState,
  setFullscreenBlock,
  scriptBlocksRef,
}: UseMobileRunOverrideOptions): RunButtonState {
  return useMemo<RunButtonState>(() => {
    if (!isMobile) return baseRunState
    return {
      ...baseRunState,
      onRun: () => {
        const block = scriptBlocksRef.current[0]
        if (block && blockHasTimer(block)) {
          setFullscreenBlock(block)
        } else {
          baseRunState.onRun()
        }
      },
    }
  }, [isMobile, baseRunState, setFullscreenBlock, scriptBlocksRef])
}
