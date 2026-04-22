/**
 * JournalPage — /journal/:id
 *
 * Stored-note page. Renders a journal entry identified by its date-key (id
 * URL parameter) in the editor. Supports inline timer and review overlays so
 * the user can start and review workouts without leaving the journal.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { v4 as uuidv4 } from 'uuid'
import { ArrowTopRightOnSquareIcon, PlayIcon } from '@heroicons/react/20/solid'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer'
import { FullscreenReview } from '@/components/Editor/overlays/FullscreenReview'
import { JournalPageShell } from '@/panels/page-shells'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { WodBlock } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { WorkoutResult } from '@/types/storage'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { useNav } from '../nav/NavContext'
import { pendingRuntimes } from '../runtimeStore'
import { NewEntryButton, ThemeSwitcher, ActionsMenu } from './shared/PageToolbar'
import { extractPageIndex, mapIndexToL3, applyTemplate } from './shared/pageUtils'
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

  const { content, loading, onChange } = usePlaygroundContent({
    category: 'journal',
    name: noteId,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  const refreshResults = useCallback(() => {
    indexedDBService.getResultsForNote(noteId).then(setResults).catch(() => {})
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
        indexedDBService.saveResult({
          id: activeRuntimeId,
          noteId,
          segmentId: blockId,
          sectionId: blockId,
          data: workoutResults,
          completedAt: workoutResults?.endTime || Date.now(),
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
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks.find(b => b.startLine + 1 === lineNum)

      const sectionResults = results.filter(r => r.sectionId === link.id || r.segmentId === link.id)
      const hasResult = sectionResults.length > 0
      const resultCount = sectionResults.length

      if (!block) {
        return {
          ...link,
          hasResult,
          resultCount,
          onRun: () => {
            const b = wodBlocks.find(b => b.startLine + 1 === lineNum) || wodBlocks[0]
            if (b) handleStartWorkout(b)
          },
        }
      }
      return { ...link, onRun: () => handleStartWorkout(block), hasResult, resultCount }
    })
  }, [content, wodBlocks, handleStartWorkout, results])

  const { setL3Items } = useNav()
  useEffect(() => {
    setL3Items(index.map(link => ({
      id: link.id,
      label: link.label,
      level: 3 as const,
      action: { type: 'scroll' as const, sectionId: link.id },
      secondaryAction: link.onRun
        ? {
            id: link.id + '-run',
            label: 'Run',
            icon: link.runIcon === 'link' ? ArrowTopRightOnSquareIcon : PlayIcon,
            action: { type: 'call' as const, handler: link.onRun },
          }
        : undefined,
    })))
    return () => setL3Items([])
  }, [index, setL3Items])

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
      actions={
        <div className="flex items-center gap-4">
          <NewEntryButton />
          <CastButtonRpc />
          <AudioToggle />
          <ThemeSwitcher />
          <ActionsMenu currentWorkout={{ name: noteId, content }} items={mapIndexToL3(index)} />
        </div>
      }
      editor={
        <NoteEditor
          value={content}
          onChange={onChange}
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
