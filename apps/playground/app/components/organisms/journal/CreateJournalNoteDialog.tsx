import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { EditorDialog } from '@bitcobblers/wod-wiki-ui'
import { Button } from '@/components/atoms/primitives/button'
import { notePersistence } from '@/services/persistence'
import { storageService } from '@/services/storage'
import { getScriptCollections } from '@/repositories/script-collections'
import { getScriptFeeds } from '@/repositories/script-feeds'
import type { ScriptCollection } from '@/repositories/script-collections'
import type { ScriptFeed } from '@/repositories/script-feeds'
import type { HistoryEntry } from '@/types/history'

import { formatDateHeader } from '../../../lib/dateFormat'
import { getTodayDateKey } from '../../../services/dateUtils'
import { parseJournalDate } from '../../../services/parseJournalDate'
import { journalNotes, type CreateJournalNoteInput } from '../../../services/journalNotes'

export interface CreateJournalNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Preselected journal date (YYYY-MM-DD); defaults to today. */
  defaultDate?: string
  /** Preselected mode; defaults to 'blank'. */
  defaultMode?: StartMode
   /** Called with the created entry after a successful create. */
   onCreated?: (entry: HistoryEntry) => void
 }

type StartMode = 'blank' | 'template' | 'source'

const START_MODES: { value: StartMode; label: string }[] = [
  { value: 'blank', label: 'Blank' },
  { value: 'template', label: 'Template' },
  { value: 'source', label: 'Source' },
]

interface SourceState {
  collections: ScriptCollection[]
  feeds: ScriptFeed[]
  /** Exact Note.sourcePath → note id, from raw storage rows. */
  sourceIdByPath: Record<string, string>
}

const fieldClass =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CreateJournalNoteDialog({
  open,
   onOpenChange,
   defaultDate,
  defaultMode = 'blank',
   onCreated,
 }: CreateJournalNoteDialogProps) {
  const [mode, setMode] = useState<StartMode>(defaultMode)
  const [date, setDate] = useState(() => getTodayDateKey())
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [templates, setTemplates] = useState<HistoryEntry[] | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [sources, setSources] = useState<SourceState | null>(null)
  const [sourcesError, setSourcesError] = useState<string | null>(null)
  const templatesReq = useRef(0)
  const sourcesReq = useRef(0)
  const inFlight = useRef(false)

  const [templateId, setTemplateId] = useState('')
  const [sourceGroupId, setSourceGroupId] = useState('')
  const [sourceItemPath, setSourceItemPath] = useState('')

  // Fresh form (and invalidated lists) on every open.
  useEffect(() => {
    if (!open) return
    templatesReq.current++
    sourcesReq.current++
    setMode(defaultMode)
    setDate(defaultDate && parseJournalDate(defaultDate) ? defaultDate : getTodayDateKey())
    setCreating(false)
    setSubmitError(null)
    setTemplateId('')
    setSourceGroupId('')
    setSourceItemPath('')
    setTemplates(null)
    setTemplatesError(null)
    setSources(null)
    setSourcesError(null)
  }, [open, defaultDate])

  const loadTemplates = () => {
    const token = ++templatesReq.current
    setTemplates(null)
    setTemplatesError(null)
    notePersistence
      .listNotes({ kind: 'template' })
      .then(rows => {
        if (templatesReq.current === token) setTemplates(rows)
      })
      .catch(() => {
        if (templatesReq.current === token) setTemplatesError('Could not load templates.')
      })
  }

  const loadSources = () => {
    const token = ++sourcesReq.current
    setSources(null)
    setSourcesError(null)
    // ponytail: corpus adapters return full markdown per item; lazy per-item load if size demands.
    Promise.all([getScriptCollections(), getScriptFeeds(), storageService.getAllNotes()])
      .then(([collections, feeds, notes]) => {
        if (sourcesReq.current !== token) return
        const sourceIdByPath: Record<string, string> = {}
        for (const note of notes) {
          if (note.sourcePath) sourceIdByPath[note.sourcePath] = note.id
        }
        setSources({ collections, feeds, sourceIdByPath })
      })
      .catch(() => {
        if (sourcesReq.current === token) setSourcesError('Could not load collections and feeds.')
      })
  }

  useEffect(() => {
    if (!open) return
    if (mode === 'template' && templates === null && !templatesError) loadTemplates()
    if (mode === 'source' && sources === null && !sourcesError) loadSources()
  }, [open, mode, templates, templatesError, sources, sourcesError])

  const template = useMemo(
    () => templates?.find(t => t.id === templateId) ?? null,
    [templates, templateId],
  )

  const activeGroup = useMemo<{ kind: 'collection' | 'feed'; group: ScriptCollection | ScriptFeed } | null>(() => {
    if (!sources || !sourceGroupId) return null
    const sep = sourceGroupId.indexOf(':')
    if (sep < 0) return null
    const kind = sourceGroupId.slice(0, sep)
    const id = sourceGroupId.slice(sep + 1)
    if (kind === 'collection') {
      const group = sources.collections.find(c => c.id === id)
      return group ? { kind: 'collection', group } : null
    }
    if (kind === 'feed') {
      const group = sources.feeds.find(f => f.id === id)
      return group ? { kind: 'feed', group } : null
    }
    return null
  }, [sources, sourceGroupId])

  // path is the stable unique key (feed filenames repeat across dates).
  const activeItem = activeGroup
    ? activeGroup.group.items.find(i => i.path === sourceItemPath) ?? null
    : null

  const dateParsed = parseJournalDate(date)
  const dateInvalid = date !== '' && !dateParsed
  const fallbackTitle = `Journal — ${formatDateHeader(dateParsed?.dateKey ?? getTodayDateKey())}`
  const needsSelection = mode === 'template' ? template === null : mode === 'source' ? activeItem === null : false

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = parseJournalDate(date)
    if (!parsed || inFlight.current || needsSelection) return

    let input: CreateJournalNoteInput
    if (mode === 'template' && template) {
      input = {
        journalDate: parsed.dateKey,
        title: title.trim() || template.title || fallbackTitle,
        rawContent: template.rawContent,
        tags: template.tags,
        sourceId: template.id,
        type: 'journal',
      }
    } else if (mode === 'source' && activeItem && activeGroup && sources) {
      const sourceId = sources.sourceIdByPath[activeItem.path]
      if (!sourceId) {
        setSubmitError('No stored source note matches this item. Your input is kept — pick another item or use Blank.')
        return
      }
      input = {
        journalDate: parsed.dateKey,
        title: title.trim() || activeItem.name,
        rawContent: activeItem.content,
        tags: [],
        sourceId,
        type: 'journal',
      }
    } else {
      input = {
        journalDate: parsed.dateKey,
        title: title.trim() || fallbackTitle,
        rawContent: '',
        tags: [],
        type: 'journal',
      }
    }

    inFlight.current = true
    setCreating(true)
    setSubmitError(null)
    try {
      const entry = await journalNotes.create(input)
      onCreated?.(entry)
      onOpenChange(false)
    } catch {
      setSubmitError('Could not create the note. Your input is kept — try again.')
    } finally {
      inFlight.current = false
      setCreating(false)
    }
  }

  return (
    <EditorDialog
      open={open}
      onClose={() => {
        if (!inFlight.current) onOpenChange(false)
      }}
      title="New journal note"
      description="Add a note to a day in your journal."
      presentation="sheet"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" form="create-journal-note-form" size="lg" disabled={!dateParsed || needsSelection || creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      }
    >
      <form id="create-journal-note-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div role="group" aria-label="Start from" className="grid grid-cols-3 gap-1.5">
          {START_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mode === m.value}
              onClick={() => setMode(m.value)}
              disabled={creating}
              className={
                'min-h-11 rounded-md border px-2 text-sm font-medium transition-colors ' +
                (mode === m.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/60')
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'template' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="journal-create-template" className="text-sm font-medium">
              Template
            </label>
            {templatesError ? (
              <div className="flex min-h-11 items-center justify-between gap-2">
                <p className="text-sm text-destructive">{templatesError}</p>
                <Button type="button" variant="ghost" size="sm" onClick={loadTemplates}>
                  Retry
                </Button>
              </div>
            ) : templates === null ? (
              <p className="flex min-h-11 items-center text-sm text-muted-foreground">Loading templates…</p>
            ) : templates.length === 0 ? (
              <p className="flex min-h-11 items-center text-sm text-muted-foreground">
                No templates available. Choose Blank or Source.
              </p>
            ) : (
              <select
                id="journal-create-template"
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                disabled={creating}
                className={fieldClass}
              >
                <option value="">Choose a template…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title || t.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === 'source' && (
          <div className="flex flex-col gap-3">
            {sourcesError ? (
              <div className="flex min-h-11 items-center justify-between gap-2">
                <p className="text-sm text-destructive">{sourcesError}</p>
                <Button type="button" variant="ghost" size="sm" onClick={loadSources}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="journal-create-source-group" className="text-sm font-medium">
                    Feed
                  </label>
                  <select
                    id="journal-create-source-group"
                    value={sourceGroupId}
                    onChange={e => {
                      setSourceGroupId(e.target.value)
                      setSourceItemPath('')
                    }}
                    disabled={sources === null || creating}
                    className={fieldClass}
                  >
                    <option value="">
                      {sources === null ? 'Loading…' : 'Choose a feed…'}
                    </option>
                    {sources && sources.collections.length > 0 && (
                      <optgroup label="Feeds">
                        {sources.collections.map(c => (
                          <option key={c.id} value={`collection:${c.id}`}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {sources && sources.feeds.length > 0 && (
                      <optgroup label="Feeds">
                        {sources.feeds.map(f => (
                          <option key={f.id} value={`feed:${f.id}`}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="journal-create-source-item" className="text-sm font-medium">
                    Item
                  </label>
                  <select
                    id="journal-create-source-item"
                    value={sourceItemPath}
                    onChange={e => setSourceItemPath(e.target.value)}
                    disabled={!activeGroup || creating}
                    className={fieldClass}
                  >
                    <option value="">
                      {activeGroup ? 'Choose an item…' : 'Choose a feed first'}
                    </option>
                    {activeGroup?.group.items.map(item => (
                      <option key={item.path} value={item.path}>
                        {'feedDate' in item ? `${item.name} — ${item.feedDate}` : item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="journal-create-date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="journal-create-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={creating}
            aria-invalid={dateInvalid || undefined}
            className={fieldClass}
          />
          {dateInvalid && <p className="text-sm text-destructive">Enter a valid date (YYYY-MM-DD).</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="journal-create-title" className="text-sm font-medium">
            Title <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="journal-create-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={fallbackTitle}
            disabled={creating}
            className={fieldClass}
          />
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
      </form>
    </EditorDialog>
  )
}
