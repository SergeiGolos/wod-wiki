/**
 * WorkoutEditorPage — /collections/:collection/:workout
 *
 * Wrapper that loads workout content via IndexedDB (or falls back to the
 * bundled MD file). Keeps ScriptBlock IDs stable across page loads so results
 * stay linked.
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/atoms/primitives/toast'
import { EditorView } from '@codemirror/view'
import { v4 as uuidv4 } from 'uuid'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { JournalPageShell } from '@/panels/page-shells'
import type { ScriptBlock } from '@/components/Editor/types'
import { CalendarCard } from '@/components/atoms/CalendarCard'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { pageId } from '../services/playgroundContent'
import { pendingRuntimes } from '../runtimeStore'
import { journalNotePath, runPath } from '../lib/routes'
import { createJournalNoteFromWorkout } from '../services/journalWorkout'
import { PageActions } from './shared/PageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { useScriptBlockCommands } from '../hooks/useScriptBlockCommands'
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
  /**
   * Optional override for the run-button behavior.
   * - 'inline' opens the wall-clock popup in-place (useful for Storybook scenarios).
   * - 'journal' appends to the journal and navigates there (production default for collections).
   * When omitted, behavior is derived from the category.
   */
  runMode?: 'inline' | 'journal'
  /**
   * Strip non-runtime commands (Today, Schedule) from the WOD block action bar.
   * Useful in Storybook scenarios where journal persistence is out of scope.
   * Does not affect the production Playground pages.
   */
  hidePlanningCommands?: boolean
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
  onSearch?: () => void
}

export function WorkoutEditorPage({
  category,
  name,
  mdContent,
  theme,
  runMode,
  hidePlanningCommands,
  onViewCreated,
  onScrollToSection,
  onSearch,
}: WorkoutEditorPageProps) {
  const usePopup = runMode ? runMode === 'inline' : INLINE_RUNTIME_CATEGORIES.has(category)
  const isCollection = !NON_COLLECTION_CATEGORIES.has(category)
  const noteId = pageId(category, name)
  const navigate = useNavigate()
  const { content, loading, onChange, onLineChange, onBlur } = usePlaygroundContent({ category, name, mdContent })
  const sourceNote = useMemo(() => {
    if (!isCollection) return null

    return {
      label: `${category}-${name}`,
      path: `/collections/${encodeURIComponent(category)}/${encodeURIComponent(name)}`,
    }
  }, [category, isCollection, name])

  const [pendingScheduleBlock, setPendingScheduleBlock] = useState<ScriptBlock | null>(null)

  const handleStartWorkout = useCallback(
    async (block: ScriptBlock) => {
      const runtimeId = uuidv4()
      // For syntax/inline categories keep the original popup behaviour.
      if (usePopup) {
        pendingRuntimes.set(runtimeId, { block, noteId })
        navigate(runPath(runtimeId))
        return
      }
      // Append the wod block to today's journal note and navigate there.
      try {
        const journalNote = await createJournalNoteFromWorkout({
          workoutName: name,
          category,
          sourceNoteLabel: sourceNote?.label,
          sourceNotePath: sourceNote?.path,
          wodContent: block.content,
        })
        pendingRuntimes.set(runtimeId, { block, noteId: journalNote.id })
        navigate(`${journalNotePath(journalNote.journalDate ?? '', journalNote.id)}?autoStart=${runtimeId}`)
      } catch {
        // IndexedDB unavailable — fall back to the fullscreen tracker route
        pendingRuntimes.set(runtimeId, { block, noteId })
        navigate(runPath(runtimeId))
      }
    },
    [usePopup, noteId, name, category, sourceNote, navigate],
  )

  const handleScheduleBlock = useCallback(
    async (block: ScriptBlock, date: Date) => {
      const dateLabel = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      let journalNoteId: string
      let journalDate: string
      try {
        const journalNote = await createJournalNoteFromWorkout({
          workoutName: name,
          category,
          sourceNoteLabel: sourceNote?.label,
          sourceNotePath: sourceNote?.path,
          wodContent: block.content,
          date,
          wrapInWod: true,
        })
        journalNoteId = journalNote.id
        journalDate = journalNote.journalDate ?? ''
      } catch {
        toast({
          variant: 'destructive',
          title: 'Could not save workout',
          description: `Failed to add "${name}" to ${dateLabel}. Please try again.`,
        })
        return
      }
      const journalRoute = journalNotePath(journalDate, journalNoteId)
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

  const commands = useScriptBlockCommands('collection-readonly', {
    onPlay: handleStartWorkout,
    onShare: shareBlock,
    onAddToToday: hidePlanningCommands ? undefined : (block) => handleScheduleBlock(block, new Date()),
    onSchedule: hidePlanningCommands ? undefined : setPendingScheduleBlock,
    onOpenInPlayground: (block) => openBlockInPlayground(block, navigate),
  })

  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([])
  const index = useNotePageNav({ content, scriptBlocks, onStartWorkout: handleStartWorkout })

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
            onBlocksChange={setScriptBlocks}
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
