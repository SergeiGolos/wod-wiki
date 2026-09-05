import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { v7 as uuidv7 } from 'uuid'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import { playgroundRecorder } from '@/services/resultRecorder'
import { toast } from '@/hooks/use-toast'
import { ensurePlaygroundEntry } from '../services/createPlaygroundPage'
import type { RunButtonState } from '../components/molecules/SectionButtons'

export type FullscreenState =
  | { kind: 'timer'; block: ScriptBlock; results: WorkoutResults | null }
  | null

export interface UseCanvasRuntimeOptions {
  canvasNoteId: string
  title?: string
  getBlock: () => ScriptBlock | null
  getContent: () => string
}

export interface UseCanvasRuntimeReturn {
  fullscreen: FullscreenState
  startRun: (block?: ScriptBlock | null, content?: string) => Promise<void>
  closeRun: () => void
  completedResults: WorkoutResults | null
  runState: RunButtonState
  handleWorkoutComplete: (results: WorkoutResults) => Promise<void>
}

/** Owns persistence-before-run and recording against the exact started entry. */
export function useCanvasRuntime({
  canvasNoteId,
  title,
  getBlock,
  getContent,
}: UseCanvasRuntimeOptions): UseCanvasRuntimeReturn {
  const [fullscreen, setFullscreen] = useState<FullscreenState>(null)
  const [completedResults, setCompletedResults] = useState<WorkoutResults | null>(null)
  const activeRun = useRef<{ noteId: string; resultId: string; block: ScriptBlock } | null>(null)
  const starting = useRef(false)
  const generation = useRef(0)

  useEffect(() => () => { generation.current += 1 }, [])

  const closeRun = useCallback(() => {
    generation.current += 1
    setFullscreen(null)
  }, [])

  const startRun = useCallback(async (selectedBlock?: ScriptBlock | null, content?: string) => {
    const block = selectedBlock ?? getBlock()
    if (!block || starting.current) return
    starting.current = true
    const request = ++generation.current
    try {
      const entry = await ensurePlaygroundEntry(content ?? getContent(), { reuseKey: canvasNoteId, title })
      if (request !== generation.current) return
      activeRun.current = { noteId: entry.noteId, resultId: uuidv7(), block }
      setCompletedResults(null)
      setFullscreen({ kind: 'timer', block, results: null })
    } catch (error) {
      if (request === generation.current) {
        toast({
          title: 'Could not save playground workout',
          description: error instanceof Error ? error.message : 'The workout was not started. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      starting.current = false
    }
  }, [canvasNoteId, title, getBlock, getContent])

  const handleWorkoutComplete = useCallback(async (results: WorkoutResults) => {
    const run = activeRun.current
    if (!run) return
    const request = generation.current
    try {
      await playgroundRecorder.record({
        runBlock: run.block,
        blockId: run.block.id,
        noteId: run.noteId,
        resultId: run.resultId,
        data: results,
        createdAt: results.endTime || Date.now(),
        origin: 'playground',
      })
      if (request === generation.current) {
        setCompletedResults(results)
        setFullscreen(null)
      }
    } catch (error) {
      if (request === generation.current) {
        toast({
          title: 'Could not save workout results',
          description: error instanceof Error ? error.message : 'Your playground workout is still saved.',
          variant: 'destructive',
        })
      }
    }
  }, [])

  const runState = useMemo<RunButtonState>(() => ({
    isReconnect: false,
    onReconnect: () => {},
    onRun: () => { void startRun() },
  }), [startRun])

  return { fullscreen, startRun, closeRun, completedResults, runState, handleWorkoutComplete }
}
