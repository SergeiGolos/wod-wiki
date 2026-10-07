import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { v7 as uuidv7 } from 'uuid'
import { CalendarDays, Copy } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { JournalPageShell } from '@/panels/page-shells'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { WorkbenchSessionProvider } from '@/stores/workbenchSessionStore';
import { ResponsiveActions } from '../nav/ResponsiveActions'
import { useEditorSave } from '../hooks/useEditorSave'
import { useNoteL1Zone } from '../nav/NavContext'
import { notePersistence } from '@/services/persistence'
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider'
import { storageService } from '@/services/storage'
import { usePageSourcesReady } from '@/hooks/usePageSourcesReady'
import { refreshPageSources } from '@/services/queryService'
import { journalDatePath, noteByIdPath, pagePath, runPath } from '../lib/routes'
import { NotePlacementDialog, type NotePlacementMode } from '../components/organisms/journal/NotePlacementDialog'
import type { HistoryEntry } from '@/types/history'
import type { Session } from '@/types/storage'
import { playgroundRecorder } from '@/services/resultRecorder'
import { pendingRuntimes } from '../runtimeStore'
import type { ScriptBlock } from '@/components/Editor/types'
import { useNotePageNav } from './shared/useNotePageNav'
import {
  NoteContextLinks,
  noteOwnership,
  provenanceLink,
  useNoteContextLinks,
} from './shared/noteContextLinks'
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
 * explicit Edit toggle the journal date page uses (?edit=1 opens in edit
 * mode); saves go through the content provider's guarded update path.
 */
export function NoteByIdPage({ noteId, theme }: NoteByIdPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [missing, setMissing] = useState(false)
  const isReadOnly = location.pathname.startsWith('/p/')
  const [saveError, setSaveError] = useState<{ noteId: string; message: string } | null>(null)
  const [placement, setPlacement] = useState<NotePlacementMode | null>(null)
  const [sourceEntry, setSourceEntry] = useState<HistoryEntry | null>(null)
  // Page-source datasets (@session/@today) populate before the first child
  // query block evaluates; a new page context re-populates (@today may have
  // changed since the previous page loaded).
  const sourcesReady = usePageSourcesReady()
  useEffect(() => {
    void refreshPageSources().catch(() => {
      // Failure stays on the cached promise — child queries surface it.
    })
  }, [noteId])

  useEffect(() => {
    let cancelled = false
    setEntry(null)
    setMissing(false)
    setSaveError(null)
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
  }, [noteId, searchParams])

  // Resolve the source lineage's title so it can link to the original note.
  const sourceId = entry?.sourceId
  useEffect(() => {
    setSourceEntry(null)
    if (!sourceId) return
    let cancelled = false
    contentProvider
      .getEntry(sourceId)
      .then((src) => {
        if (!cancelled) setSourceEntry(src)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sourceId])

  // ── Source-aware navigation: owning list ("Up"), L1 zone, sourceNote stamps
  const ownership = useMemo(
    () => (entry ? noteOwnership(entry) : { zone: null, up: null, stamps: [] }),
    [entry],
  )
  useNoteL1Zone(ownership.zone)

  // ── Outline (L3) + Run + result badges, wired like the other note pages
  const [scriptBlocks, setScriptBlocks] = useState<ScriptBlock[]>([])
  const [results, setResults] = useState<Session[]>([])
  const noteKey = entry?.id
  useEffect(() => {
    setResults([])
    setScriptBlocks([])
    if (!noteKey) return
    let cancelled = false
    storageService.getSessionsForNote(noteKey).then((rows) => {
      if (!cancelled) setResults(rows)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [noteKey])

  const handleStartWorkout = useCallback(
    (block: ScriptBlock) => {
      if (!entry) return
      const runtimeId = uuidv7()
      pendingRuntimes.set(runtimeId, {
        block,
        noteId: entry.id,
        returnTo: noteByIdPath(entry.id),
      })
      navigate(runPath(runtimeId))
    },
    [entry, navigate],
  )

  useNotePageNav({
    content: entry?.rawContent ?? '',
    scriptBlocks,
    onStartWorkout: handleStartWorkout,
    results,
  })

  const contextLinks = useNoteContextLinks(
    entry ? { noteId: entry.id, stamps: ownership.stamps } : { noteId: '', stamps: [] },
  )

  const save = useCallback(
    (value: string) =>
      // Returning the chain lets useEditorSave serialize saves.
      contentProvider
        .updateEntry(noteId, { rawContent: value })
        .then((updated) => {
          // Keep the local draft; a late response for a previous note must
          // not touch the current one.
          setSaveError((prev) => (prev?.noteId === noteId ? null : prev))
          setEntry((prev) => (prev && prev.id === noteId ? { ...prev, title: updated.title } : prev))
        })
        .catch(() => {
          setSaveError({ noteId, message: 'Save failed — your edit is kept below. Try again.' })
        }),
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
  const handleCompleteWorkout = useCallback(
    (
      blockId: string,
      results: ScriptBlock['results'],
      resultId?: string,
      runBlock?: Pick<ScriptBlock, 'id' | 'contentId'>,
    ) => {
      if (!results || !resultId) return
      void playgroundRecorder.record({
        runBlock,
        blockId,
        noteId,
        resultId,
        data: results,
        createdAt: results.endTime || Date.now(),
      })
    },
    [noteId],
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
    const actionPill =
      'inline-flex min-h-11 items-center gap-1 rounded-pill border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent'

    const pageActions = (
      <ResponsiveActions label="Note actions">
        <button type="button" className={actionPill} onClick={() => setPlacement('relationships')}>
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Note relationships
        </button>
        <button type="button" className={actionPill} onClick={() => setPlacement('clone')}>
          <Copy className="size-3.5" aria-hidden="true" />
          Clone
        </button>
      </ResponsiveActions>
    )

    body = (
      <WorkbenchSessionProvider notePersistence={notePersistence} provider={contentProvider}>
        <JournalPageShell
          title={entry.title}
          subtitle={noteByIdPath(noteId)}
          actions={pageActions}
          editor={
            <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 min-w-0 max-w-full">
              <NoteContextLinks data={contextLinks} up={ownership.up} />
              {(entry.journalDate || entry.slug || entry.sourceId) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {entry.journalDate && (
                    <Link to={journalDatePath(entry.journalDate)} className="underline-offset-2 hover:underline">
                      {entry.journalDate}
                    </Link>
                  )}
                  {entry.slug && (
                    <Link to={pagePath(entry.slug)} className="underline-offset-2 hover:underline">
                      /p/{entry.slug}
                    </Link>
                  )}
                  {entry.sourceId && (
                    <span>
                      Cloned from{' '}
                      {sourceEntry ? (
                        <Link to={noteByIdPath(sourceEntry.id)} className="underline-offset-2 hover:underline">
                          {sourceEntry.title || sourceEntry.id}
                        </Link>
                      ) : (
                        (() => {
                          const stamped = provenanceLink(entry.sourceId!)
                          return stamped ? (
                            <Link to={stamped.to} className="underline-offset-2 hover:underline">
                              {stamped.title}
                            </Link>
                          ) : (
                            entry.sourceId
                          )
                        })()
                      )}
                    </span>
                  )}
                </div>
              )}
              {sourcesReady ? (
                <NoteEditor
                  value={entry.rawContent}
                  onChange={onChange}
                  onBlur={onBlur}
                  noteId={entry.id}
                  readonly={isReadOnly}
                  theme={theme}
                  showLineNumbers={false}
                  onCompleteWorkout={handleCompleteWorkout}
                  onBlocksChange={setScriptBlocks}
                />
              ) : (
                <div className="flex items-center justify-center text-zinc-400 text-sm py-8">Loading…</div>
              )}
              {saveError?.noteId === noteId && (
                <p role="alert" className="text-sm text-destructive">
                  {saveError.message}
                </p>
              )}
            </div>
          }
        />
        {placement !== null && (
          <NotePlacementDialog
            open
            onOpenChange={(open) => {
              if (!open) setPlacement(null)
            }}
            entry={entry}
            mode={placement}
            provider={contentProvider}
            onSaved={(updated) =>
              setEntry((prev) =>
                prev && prev.id === updated.id
                  ? { ...prev, journalDate: updated.journalDate, slug: updated.slug, sourceId: updated.sourceId }
                  : prev,
              )
            }
            onCloned={(created) => navigate(`${noteByIdPath(created.id)}?edit=1`)}
          />
        )}
      </WorkbenchSessionProvider>
    )
  }

  return body
}
