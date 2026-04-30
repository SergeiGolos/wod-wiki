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
import type { WodBlock } from '@/components/Editor/types'
import { usePlaygroundContent } from '../hooks/usePlaygroundContent'
import { PlaygroundDBService } from '../services/playgroundDB'
import { pendingRuntimes } from '../runtimeStore'
import { NotePageActions } from './shared/NotePageActions'
import { useNotePageNav } from './shared/useNotePageNav'
import { applyTemplate } from './shared/pageUtils'
import newPlaygroundTemplate from '../templates/new-playground.md?raw'
import { formatPlaygroundPageTitle } from '@/lib/playgroundDisplay'

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
  const pageName = id ?? 'playground'
  // noteId is the full playground page identifier (for example, 'playground/<pageName>') so results can be grouped correctly in the journal
  const noteId = PlaygroundDBService.pageId('playground', pageName)
  const pageTitle = useMemo(() => (id ? formatPlaygroundPageTitle(id) : 'Playground'), [id])
  const navigate = useNavigate()
  const { content, loading, onChange, onLineChange, onBlur } = usePlaygroundContent({
    category: 'playground',
    name: pageName,
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
  const index = useNotePageNav({ content, wodBlocks, onStartWorkout: handleStartWorkout })

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
    <JournalPageShell
      title={pageTitle}
      index={index}
      onScrollToSection={onScrollToSection}
      actions={<NotePageActions currentWorkout={{ name: pageTitle, content }} index={index} />}
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
        />
      }
    />
  )
}
