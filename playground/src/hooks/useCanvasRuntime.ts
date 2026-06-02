import { useState, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { WodBlock, WorkoutResults } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResult } from '@/types/storage'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import { notePersistence } from '@/services/persistence'
import { activeRuntimes, pendingRuntimes } from '../runtimeStore'
import { runPath } from '../lib/routes'
import type { RunButtonState } from '../components/molecules/SectionButtons'

type PanelMode = 'editor' | 'running' | 'review'

interface UseCanvasRuntimeOptions {
  canvasNoteId: string
  navigate: (to: string) => void
  getBlock: () => WodBlock | null
}

export interface UseCanvasRuntimeReturn {
  panelMode: PanelMode
  setPanelMode: (mode: PanelMode) => void
  viewTimerBlock: WodBlock | null
  reviewSegments: Segment[]
  selectedSegmentIds: Set<number>
  setSelectedSegmentIds: React.Dispatch<React.SetStateAction<Set<number>>>
  persistedResults: WorkoutResult[]
  setPersistedResults: React.Dispatch<React.SetStateAction<WorkoutResult[]>>
  activeViewRuntimeId: string | null
  fullscreenBlock: WodBlock | null
  setFullscreenBlock: (block: WodBlock | null) => void
  launchViewRuntime: (block: WodBlock) => void
  closeViewRuntime: () => void
  handleViewComplete: (blockId: string, results: WorkoutResults) => void
  hasActiveViewRuntime: boolean
  runState: RunButtonState
  setPanelState: (state: 'note' | 'review' | 'track', open?: 'view' | 'dialog' | 'route') => void
}

export function useCanvasRuntime({
  canvasNoteId,
  navigate,
  getBlock,
}: UseCanvasRuntimeOptions): UseCanvasRuntimeReturn {
  const [panelMode, setPanelMode] = useState<PanelMode>('editor')
  const [viewTimerBlock, setViewTimerBlock] = useState<WodBlock | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set())
  const [persistedResults, setPersistedResults] = useState<WorkoutResult[]>([])
  const [activeViewRuntimeId, setActiveViewRuntimeId] = useState<string | null>(null)
  const activeViewBlockRef = useRef<WodBlock | null>(null)
  const [fullscreenBlock, setFullscreenBlock] = useState<WodBlock | null>(null)

  const launchViewRuntime = useCallback((block: WodBlock) => {
    activeViewBlockRef.current = block
    activeRuntimes.set(block.id, block)
    setActiveViewRuntimeId(uuidv4())
    setViewTimerBlock(block)
    setPanelMode('running')
  }, [])

  const closeViewRuntime = useCallback(() => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setActiveViewRuntimeId(null)
    setViewTimerBlock(null)
    setPanelMode('editor')
  }, [])

  const handleViewComplete = useCallback((blockId: string, results: WorkoutResults) => {
    const block = activeViewBlockRef.current
    if (block) activeRuntimes.delete(block.id)
    activeViewBlockRef.current = null
    setViewTimerBlock(null)

    if (results) {
      const runtimeId = activeViewRuntimeId ?? uuidv4()
      const nextResult: WorkoutResult = {
        id: runtimeId,
        noteId: canvasNoteId,
        segmentId: blockId,
        sectionId: blockId,
        data: results,
        completedAt: results.endTime || Date.now(),
      }
      setPersistedResults((previous) => {
        const deduped = previous.filter((result) => result.id !== nextResult.id)
        return [nextResult, ...deduped].sort((a, b) => b.completedAt - a.completedAt)
      })
      notePersistence.mutateNote(canvasNoteId, {
        workoutResult: {
          id: runtimeId,
          sectionId: blockId,
          data: results,
          completedAt: results.endTime || Date.now(),
        },
      }).catch(() => {})
    }

    setActiveViewRuntimeId(null)
    if (results.completed && results.logs && results.logs.length > 0) {
      const { segments } = getAnalyticsFromLogs(results.logs as any, results.startTime)
      setReviewSegments(segments)
    } else {
      setReviewSegments([])
    }
    setSelectedSegmentIds(new Set())
    setPanelMode('review')
  }, [activeViewRuntimeId, canvasNoteId])

  const hasActiveViewRuntime = viewTimerBlock !== null

  const setPanelState = useCallback((state: 'note' | 'review' | 'track', open?: 'view' | 'dialog' | 'route') => {
    if (state === 'note') {
      closeViewRuntime()
    } else if (state === 'review') {
      setPanelMode('review')
    } else if (state === 'track') {
      const block = getBlock()
      if (!block) return
      if (open === 'view') {
        launchViewRuntime(block)
      } else if (open === 'route') {
        const runtimeId = uuidv4()
        pendingRuntimes.set(runtimeId, { block, noteId: canvasNoteId })
        navigate(runPath(runtimeId))
      } else {
        setFullscreenBlock(block)
      }
    }
  }, [closeViewRuntime, getBlock, launchViewRuntime, navigate, canvasNoteId])

  const runState: RunButtonState = {
    isReconnect: hasActiveViewRuntime && panelMode !== 'running',
    onReconnect: () => setPanelMode('running'),
    onRun: () => setPanelState('track', 'view'),
    onFullscreen: () => setPanelState('track', 'route'),
  }

  return {
    panelMode,
    setPanelMode,
    viewTimerBlock,
    reviewSegments,
    selectedSegmentIds,
    setSelectedSegmentIds,
    persistedResults,
    setPersistedResults,
    activeViewRuntimeId,
    fullscreenBlock,
    setFullscreenBlock,
    launchViewRuntime,
    closeViewRuntime,
    handleViewComplete,
    hasActiveViewRuntime,
    runState,
    setPanelState,
  }
}
