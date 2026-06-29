/**
 * JournalPage — /journal/:id
 *
 * Renders a journal entry identified by its date-key (id URL parameter) in the
 * editor. Supports inline timer and review overlays so the user can start and
 * review workouts without leaving the journal.
 *
 * Wired onto the WorkbenchSessionStore (per note-identity-uuid-canonical ADR):
 * the page mounts its own session via WorkbenchSessionProvider with the default
 * IndexedDBNotePersistence, resolves the route id through findOrMigrate so
 * legacy journal notes migrate lazily to UUID, and reads/writes through the
 * session's loadEntry / setContent / getNote seams. The Recorder still owns
 * result-identity (Recorder-above-adapters, cross-note-result-aggregation ADR).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { v4 as uuidv4 } from 'uuid'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { FullscreenTimer } from '@/components/organisms/review/FullscreenTimer'
import { FullscreenReview } from '@/components/organisms/review/FullscreenReview'
import { JournalPageShell } from '@/panels/page-shells'
import type { ScriptBlock } from '@/components/Editor/types'
import type { Segment } from '@/core/models/AnalyticsModels'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { notePersistence } from '@/services/persistence'
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer'
import { pendingRuntimes } from '../runtimeStore'
// NotePageActions replaced by PageActions (see navbar-wodblock-actions-assessment-2026-05-08.md)
import { PageActions } from './shared/PageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { useScriptBlockCommands } from '../hooks/useScriptBlockCommands'
import { derivePageMode } from '@/types/content-type'
import { shareBlock, openBlockInPlayground } from '../services/openInPlayground'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { playgroundRecorder } from '../services/resultRecorder'
import { parseNoteId } from '../lib/noteIdentity'
import { CalendarCard } from '@/components/atoms/CalendarCard'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/atoms/primitives/toast'
import { applyTemplate } from './shared/pageUtils'
import newPlaygroundTemplate from '../templates/new-playground.md?raw'
import {
  WorkbenchSessionProvider,
  useWorkbenchSession,
} from '@/stores/workbenchSessionStore'

const PLAYGROUND_TEMPLATE = applyTemplate(newPlaygroundTemplate)

export interface JournalPageProps {
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
  onSearch?: () => void
}

/**
 * Inner page — runs inside the session provider. Reads/writes through the
 * WorkbenchSessionStore; mounts the editor + overlays.
 */
function JournalPageInner({
  theme,
  onViewCreated,
  onScrollToSection,
  onSearch,
}: JournalPageProps) {
  const { id } = useParams<{ id: string }>()
  const noteId = id!
  const navigate = useNavigate()
  const mode = derivePageMode('journal', noteId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isTimerOpen, setIsTimerOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [timerBlock, setTimerBlock] = useState<ScriptBlock | null>(null)
  const [activeRuntimeId, setActiveRuntimeId] = useState<string | null>(null)
  const [reviewSegments, setReviewSegments] = useState<Segment[]>([])
  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([])
  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<ScriptBlock | null>(null)

  // --- Session wiring (note-identity-uuid-canonical ADR) ---
  // The provider above mounts a fresh store instance for this page; the
  // workbench has its own (independent) instance, so they don't bleed.
  const content = useWorkbenchSession((s) => s.content)
  const currentEntry = useWorkbenchSession((s) => s.currentEntry)
  const setContent = useWorkbenchSession((s) => s.setContent)
  const setBlocks = useWorkbenchSession((s) => s.setBlocks)
  const sessionBlocks = useWorkbenchSession((s) => s.blocks)
  const getNoteFromSession = useWorkbenchSession((s) => s.getNote)
  const sessionLoadEntry = useWorkbenchSession((s) => s.loadEntry)
  const setCurrentEntry = useWorkbenchSession((s) => s.setCurrentEntry)
  const resetStore = useWorkbenchSession((s) => s.resetStore)

  // The journal's extended results are the array the editor's inline panel
  // renders against. The session's `s.results` is the cumulative *completed*
  // list (a different concept); the per-note extended results live on the entry.
  const extendedResults = currentEntry?.extendedResults ?? []

  // The journal route id is `journal/<date>`. Pass it through findOrMigrate
  // so legacy route-id-keyed notes get re-keyed to UUID + slug atomically on
  // first read; once migrated, subsequent loads hit the UUID row.
  const fullNoteId = `journal/${noteId}`

  // Load (and migrate) the note on mount + whenever the route id changes.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // V8 — resolve slug -> UUID; migrates legacy notes on first read.
        const migrated = await indexedDBService.findOrMigrate(fullNoteId)
        if (cancelled) return
        const routeId = migrated?.id ?? fullNoteId
        await sessionLoadEntry({
          routeId,
          routeView: 'plan',
        })
      } catch (err) {
        // IndexedDB unavailable (e.g. Storybook) — keep the page responsive
        // by leaving the session empty; the editor still shows the template.
        if (!cancelled) console.warn('[JournalPage] loadEntry failed', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fullNoteId, sessionLoadEntry])

  // Refresh results after a workout — re-fetch the entry's results slice and
  // push through the session so the editor's inline panel re-renders.
  const refreshResults = useCallback(async () => {
    try {
      const entry = await getNoteFromSession(fullNoteId, {
        projection: 'workbench',
        resultSelection: { mode: 'all-for-note' },
      })
      if (entry) setCurrentEntry(entry)
    } catch {
      // IndexedDB unavailable — keep what we have.
    }
  }, [fullNoteId, getNoteFromSession, setCurrentEntry])

  // Tear down the page-local session on unmount (provider also does this,
  // but we want the local state gone before remount).
  useEffect(() => {
    return () => {
      resetStore()
    }
  }, [resetStore])

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
    setSearchParams((prev) => {
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
    (block: ScriptBlock) => {
      setTimerBlock(block)
      setActiveRuntimeId(uuidv4())
      setIsTimerOpen(true)
    },
    [],
  )

  const handleTimerComplete = useCallback(
    (_blockId: string, workoutResults: any) => {
      setIsTimerOpen(false)
      // Persist through the Result Recorder — the single seam that owns
      // identity (noteId, blockId, blockContentId, version) + the write.
      // The Recorder resolves identity and delegates to notePersistence.mutateNote
      // (placement A, cross-note-result-aggregation ADR), so the workbench-style
      // atomic write path is used for journal results too.
      if (activeRuntimeId && timerBlock) {
        playgroundRecorder.record({
          runBlock: timerBlock,
          blockId: timerBlock.id,
          destination: parseNoteId(fullNoteId),
          resultId: activeRuntimeId,
          data: workoutResults,
          completedAt: workoutResults?.endTime ?? Date.now(),
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
    [activeRuntimeId, fullNoteId, refreshResults, timerBlock],
  )

  const handleCloseReview = useCallback(() => {
    setIsReviewOpen(false)
    setReviewSegments([])
  }, [])

  // Sync the session's blocks into the local scriptBlocks state the editor
  // callback chain expects. The session is the source of truth.
  useEffect(() => {
    if (sessionBlocks) setScriptBlocks(sessionBlocks)
  }, [sessionBlocks])

  const index = useNotePageNav({
    content,
    scriptBlocks,
    onStartWorkout: handleStartWorkout,
    results: extendedResults,
  })

  const handleScheduleBlock = useCallback(
    async (block: ScriptBlock, date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${d}`
      try {
        await appendWorkoutToJournal({
          workoutName: noteId,
          category: 'journal',
          sourceNoteLabel: noteId,
          sourceNotePath: `/journal/${noteId}`,
          wodContent: block.content,
          date: date,
        })
        toast({
          title: 'Scheduled',
          description: `Added to journal for ${dateKey}`,
          action: (
            <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
              Open
            </ToastAction>
          ),
        })
      } catch {
        toast({ title: 'Error', description: 'Could not schedule workout', variant: 'destructive' })
      }
    },
    [noteId, navigate],
  )

  const commands = useScriptBlockCommands(mode, {
    onPlay: mode === 'journal-active' ? handleStartWorkout : undefined,
    onShare: shareBlock,
    onOpenInPlayground: mode === 'journal-plan'
      ? (block: ScriptBlock) => openBlockInPlayground(block, navigate)
      : undefined,
    onSchedule: setPendingScheduleBlock,
  })

  // Loading is the moment between mount and the loadEntry call resolving.
  // `currentEntry` is null while the load is in flight; after the first load
  // it stays non-null (until unmount resets the page-local session).
  if (!currentEntry && content === '') {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <>
      <JournalPageShell
        title={noteId}
        index={index}
        onScrollToSection={onScrollToSection}
        actions={
          <PageActions
            mode={mode}
            currentWorkout={{ name: noteId, content }}
            index={index}
            onSearch={onSearch ?? (() => {})}
          />
        }
        editor={
          <NoteEditor
            value={content}
            onChange={setContent}
            noteId={noteId}
            commands={commands}
            enableInlineRuntime={false}
            onViewCreated={handleInternalViewCreated}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setBlocks}
            extendedResults={extendedResults}
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
      {pendingScheduleBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPendingScheduleBlock(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 shadow-2xl"
            onClick={(e: React.SyntheticEvent) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-4 text-foreground">
              Schedule for&hellip;
            </p>
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date: Date) => {
                handleScheduleBlock(pendingScheduleBlock, date)
                setPendingScheduleBlock(null)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

/**
 * JournalPage — outer wrapper. Mounts a page-local WorkbenchSessionProvider
 * with the default IndexedDBNotePersistence so the session's loadEntry /
 * setContent / getNote seams work without further wiring. Unmounting the page
 * tears the session down via the provider.
 */
export function JournalPage(props: JournalPageProps) {
  return (
    <WorkbenchSessionProvider notePersistence={notePersistence}>
      <JournalPageInner {...props} />
    </WorkbenchSessionProvider>
  )
}
