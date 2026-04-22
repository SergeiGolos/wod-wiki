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
import { ArrowTopRightOnSquareIcon, PlayIcon } from '@heroicons/react/20/solid'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { AudioToggle } from '@/components/audio/AudioToggle'
import { JournalPageShell } from '@/panels/page-shells'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { WodBlock } from '@/components/Editor/types'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { useNav } from '../nav/NavContext'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { NewEntryButton, ThemeSwitcher, ActionsMenu } from './shared/PageToolbar'
import { extractPageIndex, mapIndexToL3 } from './shared/pageUtils'
import newPlaygroundTemplate from '../templates/new-playground.md?raw'
import { applyTemplate } from './shared/pageUtils'

const PLAYGROUND_TEMPLATE = applyTemplate(newPlaygroundTemplate)

export interface PlaygroundNotePageProps {
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
}

export function PlaygroundNotePage({
  theme,
  onViewCreated,
  onScrollToSection,
}: PlaygroundNotePageProps) {
  const { id } = useParams<{ id: string }>()
  // noteId is the full 'playground/uuid' so results can be grouped correctly in the journal
  const noteId = PlaygroundDBService.pageId('playground', id!)
  const navigate = useNavigate()
  const { content, loading, onChange } = usePlaygroundContent({
    category: 'playground',
    name: id!,
    mdContent: PLAYGROUND_TEMPLATE.content,
  })

  // Place cursor at the $CURSOR token position on first mount
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
      const runtimeId = uuidv4()
      pendingRuntimes.set(runtimeId, { block, noteId })
      navigate(`/tracker/${runtimeId}`)
    },
    [noteId, navigate],
  )

  const [wodBlocks, setWodBlocks] = useState<WodBlock[]>([])
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks.find(b => b.startLine + 1 === lineNum)
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
        />
      }
    />
  )
}
