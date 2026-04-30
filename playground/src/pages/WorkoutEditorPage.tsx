/**
 * WorkoutEditorPage — /workout/:category/:name
 *
 * Wrapper that loads workout content via IndexedDB (or falls back to the
 * bundled MD file). Keeps WodBlock IDs stable across page loads so results
 * stay linked.
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { EditorView } from '@codemirror/view'
import { v4 as uuidv4 } from 'uuid'
import { CalendarDaysIcon, PlayIcon } from '@heroicons/react/20/solid'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { JournalPageShell } from '@/panels/page-shells'
import type { WodBlock } from '@/components/Editor/types'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import { CalendarCard } from '@/components/ui/CalendarCard'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { NotePageActions } from './shared/NotePageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import {
  INLINE_RUNTIME_CATEGORIES,
  NON_COLLECTION_CATEGORIES,
} from './shared/pageUtils'

export interface WorkoutEditorPageProps {
  category: string
  name: string
  mdContent: string
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
}

export function WorkoutEditorPage({
  category,
  name,
  mdContent,
  theme,
  onViewCreated,
  onScrollToSection,
}: WorkoutEditorPageProps) {
  const usePopup = INLINE_RUNTIME_CATEGORIES.has(category)
  const isCollection = !NON_COLLECTION_CATEGORIES.has(category)
  const noteId = PlaygroundDBService.pageId(category, name)
  const navigate = useNavigate()
  const { content, loading, onChange } = usePlaygroundContent({ category, name, mdContent })

  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<WodBlock | null>(null)

  const handleStartWorkout = useCallback(
    async (block: WodBlock) => {
      const runtimeId = uuidv4()
      // For syntax/inline categories keep the original popup behaviour.
      if (usePopup) {
        pendingRuntimes.set(runtimeId, { block, noteId })
        navigate(`/tracker/${runtimeId}`)
        return
      }
      // Append the wod block to today's journal note and navigate there.
      try {
        const journalNoteId = await appendWorkoutToJournal({
          workoutName: name,
          category,
          wodContent: block.content,
        })
        pendingRuntimes.set(runtimeId, { block, noteId: journalNoteId })
        const dateKey = journalNoteId.replace('journal/', '')
        navigate(`/journal/${dateKey}?autoStart=${runtimeId}`)
      } catch {
        // IndexedDB unavailable — fall back to the fullscreen tracker route
        pendingRuntimes.set(runtimeId, { block, noteId })
        navigate(`/tracker/${runtimeId}`)
      }
    },
    [usePopup, noteId, name, category, navigate],
  )

  const handleScheduleBlock = useCallback(
    async (block: WodBlock, date: Date) => {
      const dateLabel = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      let noteId: string
      try {
        noteId = await appendWorkoutToJournal({
          workoutName: name,
          category,
          wodContent: block.content,
          date,
          wrapInWod: true,
        })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Could not save workout',
          description: `Failed to add "${name}" to ${dateLabel}. Please try again.`,
        })
        return
      }
      const journalRoute = `/${noteId}`
      toast({
        title: `Added to ${dateLabel}`,
        description: `"${name}" was added to your journal.`,
        action: (
          <ToastAction altText="View journal entry" onClick={() => navigate(journalRoute)}>
            View Note
          </ToastAction>
        ),
        duration: 7000,
      })
    },
    [name, category, navigate],
  )

  const collectionCommands = useMemo<WodCommand[]>(() => {
    if (!isCollection) return []
    return [
      {
        id: 'run',
        label: 'Now',
        icon: <PlayIcon className="h-3 w-3 fill-current" />,
        primary: true,
        onClick: handleStartWorkout,
      },
      {
        id: 'today',
        label: 'Today',
        icon: <CalendarDaysIcon className="h-3 w-3" />,
        onClick: (block) => handleScheduleBlock(block, new Date()),
      },
      {
        id: 'plan',
        label: 'Plan',
        icon: <CalendarDaysIcon className="h-3 w-3" />,
        onClick: (block) => setPendingScheduleBlock(block),
      },
    ]
  }, [isCollection, handleStartWorkout, handleScheduleBlock])

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([])
  const index = useNotePageNav({ content, wodBlocks, onStartWorkout: handleStartWorkout })

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
        title={name}
        index={index}
        onScrollToSection={onScrollToSection}
        actions={<NotePageActions currentWorkout={{ name: noteId, content }} index={index} />}
        editor={
          <NoteEditor
            value={content}
            onChange={onChange}
            noteId={noteId}
            onStartWorkout={isCollection || usePopup ? undefined : handleStartWorkout}
            enableInlineRuntime={usePopup}
            commands={collectionCommands.length > 0 ? collectionCommands : undefined}
            onViewCreated={onViewCreated}
            theme={theme}
            showLineNumbers={false}
            onBlocksChange={setWodBlocks}
          />
        }
      />

      {/* Date picker modal for "Plan" command on collection WOD blocks */}
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
              Schedule &ldquo;{name}&rdquo; for&hellip;
            </p>
            <CalendarCard
              selectedDate={null}
              onDateSelect={(date) => {
                if (date) handleScheduleBlock(pendingScheduleBlock, date)
                setPendingScheduleBlock(null)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
