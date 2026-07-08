/**
 * PlaygroundNotePage — /playground/:id
 *
 * Loads a personal note page by ID from IndexedDB, renders it in the editor,
 * and places the cursor at the $CURSOR token position on first mount.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { v4 as uuidv4 } from 'uuid'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { JournalPageShell } from '@/panels/page-shells'
import type { WidgetRegistry } from '@/components/Editor/widgets/types'
import { PlaygroundRunTipWidget } from '../components/molecules/PlaygroundRunTipWidget'
import {
  createAttentionWidgetWrapper,
  createCodeExampleWidgetWrapper,
  createSyntaxGroupWidgetWrapper,
} from '../components/widgets/widgetWrappers'
import type { ScriptBlock } from '@/components/Editor/types'
import type { WorkoutResult } from '@/types/storage'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { pageId } from '../services/playgroundContent'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { pendingRuntimes } from '../runtimeStore'
import { runPath } from '../lib/routes'
import { PageActions } from './shared/PageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { useScriptBlockCommands } from '../hooks/useScriptBlockCommands'
import { shareBlock } from '../services/openInPlayground'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { CalendarCard } from '@/components/atoms/CalendarCard'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/atoms/primitives/toast'
import { DEFAULT_PLAYGROUND_CONTENT } from '../templates/defaultPlaygroundContent'
import { formatPlaygroundPageTitle } from '@/lib/playgroundDisplay'
import { localDateKey } from '../views/queriable-list/JournalDateScroll'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useIsFirstNoteEver } from '../hooks/useIsFirstNoteEver'
import { useProfileInitialized } from '../hooks/useProfileInitialized'
import { FirstNoteWizard } from '../components/onboarding/FirstNoteWizard'
import { getProfile } from '../services/playgroundProfile'
import { Pin } from 'lucide-react'

export interface PlaygroundNotePageProps {
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
  onSearch?: () => void
}

export function PlaygroundNotePage({
  theme,
  onViewCreated,
  onScrollToSection,
  onSearch,
}: PlaygroundNotePageProps) {
  const { id } = useParams<{ id: string }>()
  const pageName = id ?? 'playground'
  // noteId is the full playground page identifier (for example, 'playground/<pageName>') so results can be grouped correctly in the journal
  const noteId = pageId('playground', pageName)
  const pageTitle = useMemo(() => (id ? formatPlaygroundPageTitle(id) : 'Playground'), [id])
  const navigate = useNavigate()
  const { content, loading, onChange: persistOnChange, onLineChange, onBlur, resetToOriginal } = usePlaygroundContent({
    category: 'playground',
    name: pageName,
    mdContent: DEFAULT_PLAYGROUND_CONTENT.content,
  })

  // Onboarding (ADR-0010, Goal Gradient) — mark meaningful actions.
  const { mark } = useOnboardingProgress()
  const onChange = useCallback(
    (value: string) => {
      mark('editedNote')
      persistOnChange(value)
    },
    [mark, persistOnChange],
  )

  // First-Note Wizard (ADR-0010, IKEA Effect) — one-shot per installation.
  // The wizard renders when ALL three gates allow: the user has never
  // completed it, the profile is empty, AND they have not dismissed it
  // on this page mount. The `dismissed` flag is per-mount state — it
  // suppresses the wizard for the current note, but the wizard
  // reappears on the next note navigation (the page is keyed by
  // effectivePlaygroundId, so navigating notes remounts it) if the
  // profile is still empty. This honors ADR-0010 Decision 2
  // (Dismissal semantics): dismissal never flips the completion gate
  // or marks the profile initialized; it only hides the wizard for
  // the current note.
  const { isFirstNote, markFirstNoteDone } = useIsFirstNoteEver()
  const { isInitialized } = useProfileInitialized()
  const [dismissed, setDismissed] = useState(false)

  // Pinned effort (ADR-0010, IKEA payoff) — the wizard's answer becomes a
  // visible quick-insert button, so "I answered questions" becomes "I built
  // something." Refresh from the local profile on completion; on dismissal
  // the profile is unchanged so the existing pinnedEffort is preserved.
  const [pinnedEffort, setPinnedEffort] = useState<string>(() => getProfile().pinnedEffort ?? '')
  const handleWizardClose = useCallback((completed: boolean) => {
    if (completed) {
      markFirstNoteDone()
      setPinnedEffort(getProfile().pinnedEffort ?? '')
    } else {
      setDismissed(true)
    }
  }, [markFirstNoteDone])

  const [results, setResults] = useState<WorkoutResult[]>([])

  const refreshResults = useCallback(() => {
    indexedDBService.getResultsForNote(noteId)
      .then(results => setResults(results))
      .catch(() => {})
  }, [noteId])

  useEffect(() => {
    refreshResults()
  }, [refreshResults])

  // Place cursor at the $CURSOR token position on first mount
  const cursorPlaced = useRef(false)
  const editorViewRef = useRef<EditorView | null>(null)
  const handleInternalViewCreated = useCallback((view: EditorView) => {
    editorViewRef.current = view
    onViewCreated?.(view)
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(DEFAULT_PLAYGROUND_CONTENT.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [onViewCreated])

  // Insert the pinned effort at the editor's cursor (IKEA payoff).
  const insertPinnedEffort = useCallback(() => {
    const view = editorViewRef.current
    if (!view || !pinnedEffort) return
    view.focus()
    view.dispatch(view.state.replaceSelection(pinnedEffort))
  }, [pinnedEffort])

  const handleStartWorkout = useCallback(
    (block: ScriptBlock) => {
      mark('ranWorkout')
      const runtimeId = uuidv4()
      pendingRuntimes.set(runtimeId, { block, noteId })
      navigate(runPath(runtimeId))
    },
    [noteId, navigate, mark],
  )

  const handleAddToToday = useCallback(
    async (block: ScriptBlock) => {
      try {
        mark('loggedEffort')
        const journalNoteId = await appendWorkoutToJournal({
          workoutName: pageTitle,
          category: 'playground',
          sourceNoteLabel: pageTitle,
          sourceNotePath: `/playground/${pageName}`,
          wodContent: block.content,
        })
        const dateKey = journalNoteId.replace('journal/', '')
        const today = localDateKey(new Date())
        toast({
          title: 'Added to journal',
          description: dateKey === today ? "Added to today's journal" : `Added to ${dateKey}`,
          action: (
            <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
              Open
            </ToastAction>
          ),
        })
      } catch {
        toast({ title: 'Error', description: 'Could not add to journal', variant: 'destructive' })
      }
    },
    [pageTitle, pageName, navigate, mark],
  )

  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<ScriptBlock | null>(null)

  const handleScheduleBlock = useCallback(
    async (block: ScriptBlock, date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${d}`
      try {
        await appendWorkoutToJournal({
          workoutName: pageTitle,
          category: 'playground',
          sourceNoteLabel: pageTitle,
          sourceNotePath: `/playground/${pageName}`,
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
    [pageTitle, pageName, navigate],
  )

  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([])
  const index = useNotePageNav({ content, scriptBlocks, onStartWorkout: handleStartWorkout, results })

  const commands = useScriptBlockCommands('playground', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onAddToToday: handleAddToToday,
    onSchedule: setPendingScheduleBlock,
  })

  const handleAttentionAction = useCallback(
    (action: 'scroll-to-workout' | 'open-search') => {
      if (action === 'scroll-to-workout') {
        const firstWod = index.find(item => item.type === 'wod')
        if (firstWod) {
          onScrollToSection?.(firstWod.id)
        }
      } else if (action === 'open-search') {
        onSearch?.()
      }
    },
    [onScrollToSection, onSearch],
  )

  const handleCodeExampleRun = useCallback(
    (script: string) => {
      // Parse the script as a WOD block and start workout
      const exampleBlock: ScriptBlock = {
        id: 'code-example-block',
        line: 0,
        endLine: script.split('\n').length,
        content: script,
      }
      handleStartWorkout(exampleBlock)
    },
    [handleStartWorkout],
  )

  const handleOpenDocs = useCallback(
    (docsPath: string) => {
      // Navigate to docs page
      if (docsPath.startsWith('/')) {
        window.open(docsPath, '_blank')
      } else {
        navigate(docsPath)
      }
    },
    [navigate],
  )

  const handleButtonAction = useCallback(
    (action: string, params: Record<string, string>) => {
      if (action === 'route' && params['route']) {
        navigate(params['route'])
      } else if (action === 'start-workout') {
        // Start the first available wod block
        const firstBlock = scriptBlocks[0]
        if (firstBlock) handleStartWorkout(firstBlock)
      } else if (action === 'new-note') {
        navigate('/playground')
      }
    },
    [navigate, scriptBlocks, handleStartWorkout],
  )

  const widgetComponents: WidgetRegistry = useMemo(
    () => new Map([
      ['playground-run-tip', PlaygroundRunTipWidget],
      ['attention', createAttentionWidgetWrapper(handleAttentionAction)],
      ['code-example', createCodeExampleWidgetWrapper(theme === 'dark', handleCodeExampleRun)],
      ['syntax-group', createSyntaxGroupWidgetWrapper(handleOpenDocs)],
    ]),
    [handleAttentionAction, handleCodeExampleRun, handleOpenDocs, theme],
  )

  useEffect(() => {
    document.title = `Wod.Wiki - ${pageTitle}`
  }, [pageTitle])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <>
      <FirstNoteWizard open={isFirstNote && !isInitialized && !dismissed} onClose={handleWizardClose} />
      <JournalPageShell
        title={pageTitle}
        index={index}
        onScrollToSection={onScrollToSection}
        actions={
          <div className="flex items-center gap-2">
            {pinnedEffort && (
              <button
                type="button"
                onClick={insertPinnedEffort}
                title={`Insert ${pinnedEffort} at the cursor`}
                className="inline-flex items-center gap-1 rounded-pill border border-brand/40 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-brand-deep transition-colors hover:bg-brand/10 dark:text-brand-light"
              >
                <Pin className="size-3" aria-hidden="true" />
                {pinnedEffort}
              </button>
            )}
            <PageActions
              mode="playground"
              currentWorkout={{ name: pageTitle, content }}
              index={index}
              onSearch={onSearch ?? (() => {})}
              onReset={resetToOriginal}
            />
          </div>
        }
        editor={
          <NoteEditor
            value={content}
            onChange={onChange}
            onCursorPositionChange={onLineChange}
            onBlur={onBlur}
            noteId={noteId}
            commands={commands}
            enableInlineRuntime={false}
            onViewCreated={handleInternalViewCreated}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setScriptBlocks}
            onButtonAction={handleButtonAction}
            widgetComponents={widgetComponents}
            extendedResults={results}
          />
        }
      />
      {pendingScheduleBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPendingScheduleBlock(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-4 text-foreground">
              Schedule for&hellip;
            </p>
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date) => {
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
