/**
 * JournalPage — /journal/:id
 *
 * Stored-note page. Renders a journal entry identified by its date-key (id
 * URL parameter) in the editor. Supports inline timer and review overlays so
 * the user can start and review workouts without leaving the journal.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { v4 as uuidv4 } from 'uuid'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { JournalPageShell } from '@/panels/page-shells'
import type { WodBlock } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResult } from '@/types/storage'
import { notePersistence } from '@/services/persistence'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { pendingRuntimes } from '../runtimeStore'
import { NotePageActions } from './shared/NotePageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { applyTemplate } from './shared/pageUtils'
import newPlaygroundTemplate from '../templates/new-playground.md?raw'

const PLAYGROUND_TEMPLATE = applyTemplate(newPlaygroundTemplate)

export interface JournalPageProps {
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
}

export function JournalPage({
  theme,
  onViewCreated,
  onScrollToSection,
}: JournalPageProps) {
  const { id } = useParams<{ id: string }>()
  const noteId = id!
  const [searchParams, setSearchParams] = useSearchParams()
  const [isTimerOpen, setIsTimerOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [timerBlock, setTimerBlock] = useState<WodBlock | null>(null)
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  const [results, setResults] = useState<WorkoutResult[]>([])

  const { content, loading, onChange, onLineChange, onBlur } = usePlaygroundContent({
    category: 'journal',
    name: noteId,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  const refreshResults = useCallback(() => {
    notePersistence.listNotes({ ids: [noteId], projection: 'history-detail' })
      .then(entries => setResults(entries[0]?.extendedResults ?? []))
      .catch(() => {})
  }, [noteId])

  useEffect(() => {
    refreshResults()
  }, [refreshResults])

  // Consume ?autoStart=<runtimeId> placed by WorkoutEditorPage when it redirects
  // here after appending a block to the journal note.
  useEffect(() => {
    const autoStartId = searchParams.get('autoStart')
    if (!autoStartId) return
    const pending = pendingRuntimes.get(autoStartId)
    if (pending) {
      pendingRuntimes.delete(autoStartId)
      setTimerBlock(pending.block)
      setActiveRuntimeId(autoStartId)
      setIsTimerOpen(true)
    }
    // Remove the param from the URL so sharing / refresh doesn't re-trigger
    setSearchParams(prev => {
      prev.delete('autoStart')
      return prev
    }, { replace: true })
  }, []) // intentionally runs once on mount

  // Place cursor at the $CURSOR token position on first mount (new entries only)
  const cursorPlaced = useRef(false)
  const handleInternalViewCreated = useCallback((view: EditorView) => {
    onViewCreated?.(view)
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(PLAYGROUND_TEMPLATE.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [onViewCreated])

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      setTimerBlock(block)
      setActiveRuntimeId(uuidv4())
      setIsTimerOpen(true)
    },
    [],
  )

  const handleTimerComplete = useCallback(
    (blockId: string, workoutResults: any) => {
      setIsTimerOpen(false)
      // Persist result when we have a runtimeId.
      // Use noteId (the date key) directly — this is what NoteEditor uses for lookups.
      if (activeRuntimeId) {
        notePersistence.mutateNote(noteId, {
          workoutResult: {
            id: activeRuntimeId,
            sectionId: blockId,
            data: workoutResults,
            completedAt: workoutResults?.endTime || Date.now(),
          },
        }).then(() => {
          refreshResults()
        }).catch(() => {})
        setActiveRuntimeId(null)
      }
      // WorkoutResults has .logs and .startTime directly (not nested under .data)
      if (workoutResults?.logs) {
        const { segments } = getAnalyticsFromLogs(workoutResults.logs, workoutResults.startTime)
        setReviewSegments(segments)
        setIsReviewOpen(true)
      }
    },
    [activeRuntimeId, noteId, refreshResults],
  )

  const handleCloseReview = useCallback(() => {
    setIsReviewOpen(false)
    setReviewSegments([])
  }, [])

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([])
  const index = useNotePageNav({
    content,
    wodBlocks,
    onStartWorkout: handleStartWorkout,
    results,
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <JournalPageShell
      title={noteId}
      index={index}
      onScrollToSection={onScrollToSection}
      actions={<NotePageActions currentWorkout={{ name: noteId, content }} index={index} />}
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
          onCursorPositionChange={onLineChange}
          onBlur={onBlur}
          noteId={noteId}
          onStartWorkout={handleStartWorkout}
          enableInlineRuntime={false}
          onViewCreated={handleInternalViewCreated}
          theme={theme}
          showLineNumbers={false}
          onBlocksChange={setWodBlocks}
          extendedResults={results}
        />
      }
      timerOverlay={
        timerBlock ? (
          <FullscreenTimer
            block={timerBlock}
            onClose={() => setIsTimerOpen(false)}
            onCompleteWorkout={handleTimerComplete}
            autoStart
          />
        ) : undefined
      }
      reviewOverlay={
        reviewSegments.length > 0 ? (
          <FullscreenReview
            segments={reviewSegments}
            onClose={handleCloseReview}
            title="Workout Review"
          />
        ) : undefined
      }
      isTimerOpen={isTimerOpen}
      isReviewOpen={isReviewOpen}
      onCloseTimer={() => setIsTimerOpen(false)}
      onCloseReview={handleCloseReview}
    />
  )
}
