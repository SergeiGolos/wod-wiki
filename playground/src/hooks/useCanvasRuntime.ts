import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResult } from '@/types/storage'
import { playgroundRecorder } from '../services/resultRecorder'
import { parseNoteId } from '../lib/noteIdentity'
import type { RunButtonState } from '../components/molecules/SectionButtons'

export type FullscreenState =
  | { kind: 'timer'; block: ScriptBlock; results: WorkoutResults | null }
  | { kind: 'review'; segments: Segment[]; results: WorkoutResults }
  | null

export interface UseCanvasRuntimeOptions {
  canvasNoteId: string
  getBlock: () => ScriptBlock | null
}

export interface UseCanvasRuntimeReturn {
  persistedResults: WorkoutResult[]
  setPersistedResults: React.Dispatch<React.SetStateAction<WorkoutResult[]>>
  fullscreen: FullscreenState
  setFullscreen: (state: FullscreenState) => void
  runState: RunButtonState
  handleWorkoutComplete: (block: ScriptBlock, results: WorkoutResults) => void
}

export function useCanvasRuntime({
  canvasNoteId,
  getBlock,
}: UseCanvasRuntimeOptions): UseCanvasRuntimeReturn {
  const [persistedResults, setPersistedResults] = useState<WorkoutResult[]>([])
  const [fullscreen, setFullscreen] = useState<FullscreenState>(null)

  const handleWorkoutComplete = useCallback((block: ScriptBlock, results: WorkoutResults) => {
    const runtimeId = uuidv4()
    const blockId = block.id
    const optimisticNextResult = {
      id: runtimeId,
      noteId: canvasNoteId,
      blockId,
      blockContentId: block.contentId,
      data: results,
      completedAt: results.endTime || Date.now(),
    }
    setPersistedResults((previous) => {
      const deduped = previous.filter((result) => result.id !== optimisticNextResult.id)
      return [optimisticNextResult, ...deduped].sort((a, b) => b.completedAt - a.completedAt)
    })
    playgroundRecorder.record({
      runBlock: block,
      blockId,
      destination: parseNoteId(canvasNoteId),
      resultId: runtimeId,
      data: results,
      completedAt: results.endTime || Date.now(),
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
    persistedResults,
    setPersistedResults,
    fullscreen,
    setFullscreen,
    runState,
    handleWorkoutComplete,
  }
}
