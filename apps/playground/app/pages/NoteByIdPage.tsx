import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/primitives/button'
import { JournalPageShell } from '@/panels/page-shells'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { WorkbenchSessionProvider } from '@/stores/workbenchSessionStore';
import { ResponsiveActions } from '../nav/ResponsiveActions'
import { useEditorSave } from '../hooks/useEditorSave'
import { notePersistence } from '@/services/persistence'
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider'
import { noteByIdPath } from '../lib/routes'
import type { HistoryEntry } from '@/types/history'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { tagsPaletteSource } from '../services/paletteDataSources'
const contentProvider = new IndexedDBContentProvider()

export interface NoteByIdPageProps {
  noteId: string
  theme: string
}

/**
 * /notes/:noteId — the canonical single-note route.
 *
 * Loads exactly one note by id (any kind: journal, collection item,
 * playground, feed…) and renders it standalone. Read-first with the same
 * explicit Edit toggle the journal date page uses; saves go through the
 * content provider's guarded update path.
 */
export function NoteByIdPage({ noteId, theme }: NoteByIdPageProps) {
  const navigate = useNavigate()
  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [missing, setMissing] = useState(false)
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read')

  useEffect(() => {
    let cancelled = false
    setEntry(null)
    setMissing(false)
    contentProvider
      .getEntry(noteId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          setMissing(true)
          return
        }
        setEntry(loaded)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [noteId])

  const save = useCallback(
    (value: string) => {
      contentProvider
        .updateEntry(noteId, { rawContent: value })
        .then((updated) => setEntry(updated))
        .catch(() => undefined)
    },
    [noteId],
  )

  const { onChange: saveOnChange, onBlur } = useEditorSave({ onSave: save, lineIdleMs: 500 })

  const onChange = useCallback(
    (value: string) => {
      setEntry((prev) => (prev ? { ...prev, rawContent: value } : prev))
      saveOnChange(value)
    },
    [saveOnChange],
  )

  let body: ReactNode
  if (missing) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-400">
        <p>Note not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    )
  } else if (!entry) {
    body = <div className="flex flex-1 items-center justify-center text-zinc-400">Loading…</div>
  } else {
    const editToggle = (
      <Button type="button" onClick={() => setViewMode((m) => (m === 'read' ? 'edit' : 'read'))} variant="outline">
        {viewMode === 'read' ? 'Edit' : 'Read mode'}
      </Button>
    )
    const handleAddTag = async () => {
      const res = await usePaletteStore.getState().open({
        placeholder: 'Search or add tag…',
        sources: [tagsPaletteSource(entry.tags)],
      })
      if (!res.dismissed && res.item.payload) {
        const { tag } = res.item.payload as { tag: string }
        if (tag && !entry.tags.includes(tag)) {
          const nextTags = [...entry.tags, tag]
          contentProvider.updateEntry(noteId, { tags: nextTags }).then(setEntry)
        }
      }
    }
    const handleRemoveTag = (tag: string) => {
      const nextTags = entry.tags.filter((t) => t !== tag)
      contentProvider.updateEntry(noteId, { tags: nextTags }).then(setEntry)
    }
    body = (
      <WorkbenchSessionProvider notePersistence={notePersistence} provider={contentProvider}>
        <JournalPageShell
          title={entry.title}
          subtitle={noteByIdPath(noteId)}
          tags={entry.tags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          actions={<ResponsiveActions navbar={editToggle} />}
          editor={
            <div className="flex flex-col gap-8 px-4 py-6 sm:px-6">
              <NoteEditor
                value={entry.rawContent}
                onChange={onChange}
                onBlur={onBlur}
                noteId={entry.id}
                readonly={viewMode === 'read'}
                theme={theme}
                showLineNumbers={false}
              />
            </div>
          }
        />
      </WorkbenchSessionProvider>
    )
  }

  return body
}
