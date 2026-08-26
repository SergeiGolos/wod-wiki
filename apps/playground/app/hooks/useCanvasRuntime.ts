import { useState, useCallback } from 'react'
import { v7 as uuidv7 } from 'uuid'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import { playgroundRecorder } from '@/services/resultRecorder'
import type { RunButtonState } from '../components/molecules/SectionButtons'

export type FullscreenState =
  | { kind: 'timer'; block: ScriptBlock; results: WorkoutResults | null }
  | null

export interface UseCanvasRuntimeOptions {
  canvasNoteId: string
  getBlock: () => ScriptBlock | null
}

export interface UseCanvasRuntimeReturn {
  fullscreen: FullscreenState
  setFullscreen: (state: FullscreenState) => void
  /** Results of the last completed workout on this page (#945 quest signal). */
  completedResults: WorkoutResults | null
  runState: RunButtonState
  handleWorkoutComplete: (block: ScriptBlock, results: WorkoutResults) => void
}

export function useCanvasRuntime({
  canvasNoteId,
  getBlock,
}: UseCanvasRuntimeOptions): UseCanvasRuntimeReturn {
  const [fullscreen, setFullscreen] = useState<FullscreenState>(null)
  const [completedResults, setCompletedResults] = useState<WorkoutResults | null>(null)

  const handleWorkoutComplete = useCallback((block: ScriptBlock, results: WorkoutResults) => {
    const runtimeId = uuidv7()
    setCompletedResults(results)
    const blockId = block.id
    const optimisticNextResult = {
      id: runtimeId,
      noteId: canvasNoteId,
      blockId,
      blockContentId: block.contentId,
      data: results,
      createdAt: results.endTime || Date.now(),
    }
    playgroundRecorder.record({
      runBlock: block,
      blockId,
      noteId: canvasNoteId,
      resultId: runtimeId,
      data: results,
      createdAt: results.endTime || Date.now(),
      // Canvas noteIds ('canvas:<route>') parse as 'workout' — override so
      // canvas runs are excluded from default journal filters.
      origin: 'playground',
    }).catch(() => {})
  }, [canvasNoteId])

  const runState: RunButtonState = {
    isReconnect: false,
    onReconnect: () => {},
    onRun: () => {
      const block = getBlock()
      if (block) {
        setFullscreen({ kind: 'timer', block, results: null })
      }
    },
  }

  return {
    fullscreen,
    setFullscreen,
    completedResults,
    runState,
    handleWorkoutComplete,
  }
}
