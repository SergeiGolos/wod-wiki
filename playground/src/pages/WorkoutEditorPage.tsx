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
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { JournalPageShell } from '@/panels/page-shells'
import type { WodBlock } from '@/components/Editor/types'
import { CalendarCard } from '@/components/ui/CalendarCard'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { PageActions } from './shared/PageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { useWodBlockCommands } from '../hooks/useWodBlockCommands'
import { shareBlock, openBlockInPlayground } from '../services/openInPlayground'
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
  onSearch?: () => void
}

export function WorkoutEditorPage({
  category,
  name,
  mdContent,
  theme,
  onViewCreated,
  onScrollToSection,
  onSearch,
}: WorkoutEditorPageProps) {
  const usePopup = INLINE_RUNTIME_CATEGORIES.has(category)
  const isCollection = !NON_COLLECTION_CATEGORIES.has(category)
  const noteId = PlaygroundDBService.pageId(category, name)
  const navigate = useNavigate()
  const { content, loading, onChange, onLineChange, onBlur } = usePlaygroundContent({ category, name, mdContent })
  const sourceNote = useMemo(() => {
    if (!isCollection) return null

    return {
      label: `${category}-${name}`,
      path: `/workout/${encodeURIComponent(category)}/${encodeURIComponent(name)}`,
    }
  }, [category, isCollection, name])

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
          sourceNoteLabel: sourceNote?.label,
          sourceNotePath: sourceNote?.path,
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
    [usePopup, noteId, name, category, sourceNote, navigate],
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
          sourceNoteLabel: sourceNote?.label,
          sourceNotePath: sourceNote?.path,
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
    [name, category, sourceNote, navigate],
  )

  const commands = useWodBlockCommands('collection-readonly', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onAddToToday: (block) => handleScheduleBlock(block, new Date()),
    onSchedule: setPendingScheduleBlock,
    onOpenInPlayground: (block) => openBlockInPlayground(block, navigate),
  })

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
        actions={<PageActions mode="collection-readonly" currentWorkout={{ name: noteId, content }} index={index} onSearch={onSearch ?? (() => {})} />}
        editor={
          <NoteEditor
            value={content}
            onChange={onChange}
            onCursorPositionChange={onLineChange}
            onBlur={onBlur}
            noteId={noteId}
            enableInlineRuntime={usePopup}
            commands={commands}
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
