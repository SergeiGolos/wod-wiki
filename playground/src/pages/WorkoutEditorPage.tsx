/**
 * WorkoutEditorPage — /workout/:category/:name
 *
 * Wrapper that loads workout content via IndexedDB (or falls back to the
 * bundled MD file). Keeps WodBlock IDs stable across page loads so results
 * stay linked.
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { v4 as uuidv4 } from 'uuid'
import { CalendarDaysIcon, PlayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { JournalPageShell } from '@/panels/page-shells'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import { CalendarCard } from '@/components/ui/CalendarCard'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { useNav } from '../nav/NavContext'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { appendWorkoutToJournal } from '../services/journalWorkout'
import { NewEntryButton, ThemeSwitcher, ActionsMenu } from './shared/PageToolbar'
import {
  extractPageIndex,
  mapIndexToL3,
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
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const iso = `${y}-${m}-${d}`
      try {
        await appendWorkoutToJournal({
          workoutName: name,
          category,
          wodContent: block.content,
          date,
          wrapInWod: true,
        })
      } finally {
        navigate(`/journal/${iso}`)
      }
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
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks.find(b => b.startLine + 1 === lineNum)
      // Fallback: if block not yet parsed, allow clicking but it might do nothing or use a fallback
      return {
        ...link,
        onRun: () => {
          const b = block || wodBlocks.find(b => b.startLine + 1 === lineNum) || wodBlocks[0]
          if (b) handleStartWorkout(b)
        },
      }
    })
  }, [content, wodBlocks, handleStartWorkout])

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
    <>
      <JournalPageShell
        title={name}
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
