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
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { JournalPageShell } from '@/panels/page-shells'
import type { WidgetRegistry } from '@/components/Editor/overlays/WidgetCompanion'
import { PlaygroundRunTipWidget } from '../components/widgets/PlaygroundRunTipWidget'
import type { WodBlock } from '@/components/Editor/types'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { PageActions } from './shared/PageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { useWodBlockCommands } from '../hooks/useWodBlockCommands'
import { shareBlock } from '../services/openInPlayground'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { CalendarCard } from '@/components/ui/CalendarCard'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { DEFAULT_PLAYGROUND_CONTENT } from '../templates/defaultPlaygroundContent'
import { formatPlaygroundPageTitle } from '@/lib/playgroundDisplay'
import { localDateKey } from '../views/queriable-list/JournalDateScroll'

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
  const noteId = PlaygroundDBService.pageId('playground', pageName)
  const pageTitle = useMemo(() => (id ? formatPlaygroundPageTitle(id) : 'Playground'), [id])
  const navigate = useNavigate()
  const { content, loading, onChange, onLineChange, onBlur, resetToOriginal } = usePlaygroundContent({
    category: 'playground',
    name: pageName,
    mdContent: DEFAULT_PLAYGROUND_CONTENT.content,
  })

  // Place cursor at the $CURSOR token position on first mount
  const cursorPlaced = useRef(false)
  const handleInternalViewCreated = useCallback((view: EditorView) => {
    onViewCreated?.(view)
    if (cursorPlaced.current) return
    cursorPlaced.current = true
    const offset = Math.min(DEFAULT_PLAYGROUND_CONTENT.cursorOffset, view.state.doc.length)
    view.dispatch({ selection: EditorSelection.cursor(offset) })
  }, [onViewCreated])

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      const runtimeId = uuidv4()
      pendingRuntimes.set(runtimeId, { block, noteId })
      navigate(`/tracker/${runtimeId}`)
    },
    [noteId, navigate],
  )

  const handleAddToToday = useCallback(
    async (block: WodBlock) => {
      try {
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
    [pageTitle, pageName, navigate],
  )

  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<WodBlock | null>(null)

  const handleScheduleBlock = useCallback(
    async (block: WodBlock, date: Date) => {
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

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([])
  const index = useNotePageNav({ content, wodBlocks, onStartWorkout: handleStartWorkout })

  const commands = useWodBlockCommands('playground', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onAddToToday: handleAddToToday,
    onSchedule: setPendingScheduleBlock,
  })

  const handleButtonAction = useCallback(
    (action: string, params: Record<string, string>) => {
      if (action === 'route' && params['route']) {
        navigate(params['route'])
      } else if (action === 'start-workout') {
        // Start the first available wod block
        const firstBlock = wodBlocks[0]
        if (firstBlock) handleStartWorkout(firstBlock)
      } else if (action === 'new-note') {
        navigate('/playground')
      }
    },
    [navigate, wodBlocks, handleStartWorkout],
  )

  const widgetComponents: WidgetRegistry = useMemo(
    () => new Map([
      ['playground-run-tip', PlaygroundRunTipWidget],
    ]),
    [],
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
      <JournalPageShell
        title={pageTitle}
        index={index}
        onScrollToSection={onScrollToSection}
        actions={
          <PageActions
            mode="playground"
            currentWorkout={{ name: pageTitle, content }}
            index={index}
            onSearch={onSearch ?? (() => {})}
            onReset={resetToOriginal}
          />
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
            onBlocksChange={setWodBlocks}
            onButtonAction={handleButtonAction}
            widgetComponents={widgetComponents}
          />
        }
      />
      {pendingScheduleBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CalendarCard
            selectedDate={null}
            onDateSelect={(date) => {
              handleScheduleBlock(pendingScheduleBlock, date)
              setPendingScheduleBlock(null)
            }}
          />
        </div>
      )}
    </>
  )
}
