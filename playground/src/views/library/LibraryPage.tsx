/**
 * LibraryPage — the unified content library (`/library`). Replaces the three
 * legacy list pages (`/journal`, `/collections`, `/feeds`) and reads its
 * panel state from the URL via `useLibraryQueryState`.
 *
 * Pipeline per state change:
 *   1. panel state → WQL string via `composeWql`
 *   2. WQL → `ParsedFindQuery` via `parseQuery`
 *   3. `queryService.runFind(parsed, { range })` → `Note[]`
 *   4. `Note[]` → `Entry[]` via `toEntry` (the only place that touches sourceId)
 *   5. Render Dated Stream (Notes + Posts grouped by date) + CataloguesShelf (Sessions)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon } from 'lucide-react'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import type { Note } from '@/types/storage'
import { toEntry, type Entry } from '../../lib/entryMapper'
import { addEntryToTodayInput } from '../../lib/addToToday'
import { useLibraryQueryState, type LibraryQueryState } from '../../hooks/useLibraryQueryState'
import { LibraryRow } from './LibraryRow'
import { WqlComposerPanel, composeWql } from './WqlComposerPanel'
import { journalNotes } from '../../services/journalNotes'
import { listCatalogs } from '../../lib/listCatalogs'
import { todayKey, formatDateHeader } from '../../lib/dateFormat'
import staticBlockIndex from '@/generated/static-block-index.json'

/** Compute the { start, end } range from the panel's timePreset + customStart/End. */
function computeRange(state: LibraryQueryState['state']): { start: number; end: number } | undefined {
  if (state.timePreset === 'all' || state.timePreset === 'custom') return undefined
  // TypeScript can't narrow `state.timePreset` past the `!==` checks; use a
  // switch so each branch knows exactly which keys apply.
  const days: Record<Exclude<typeof state.timePreset, 'all' | 'custom'>, number> = {
    '1d': 1, '3d': 3, '1w': 7, '2w': 14, '4w': 28, '12w': 84, '26w': 182, '52w': 365,
  }
  const d = days[state.timePreset as Exclude<typeof state.timePreset, 'all' | 'custom'>]
  if (!d) return undefined
  const end = Date.now()
  const start = end - d * 86_400_000
  return { start, end }
}

export function LibraryPage() {
  const { state, setState } = useLibraryQueryState()
  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const handleAddToToday = useCallback(async (entry: Entry) => {
    const today = todayKey()
    let rawContent = ''
    if (entry.kind === 'session' || entry.kind === 'post') {
      // Static content: read the first block's rawContent from the block index.
      const result = await queryService.runFind({
        raw: `find:block{note:${entry.id}}`,
        target: 'block',
        filters: [{ key: 'note', negate: false, values: [{ value: entry.id, wildcard: false }] }],
      } as ParsedFindQuery)
      rawContent = result.blocks[0]?.rawContent ?? ''
    } else {
      // Journal note: read the live note.
      const note = await journalNotes.getById(entry.sourceItem)
      if (note && typeof note === 'object' && 'rawContent' in note && typeof note.rawContent === 'string') {
        rawContent = note.rawContent
      }
    }
    const input = addEntryToTodayInput(entry, rawContent, today)
    await journalNotes.create(input)
  }, [])
  const wql = useMemo(() => composeWql(state), [state])
  const range = useMemo(() => computeRange(state), [state])
  const catalogs = useMemo(
    () => [{ id: 'journal', name: 'Journal' }, ...listCatalogs(staticBlockIndex as never)],
    [],
  )


  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const parsed = parseQuery(wql)
    if (!isFindQuery(parsed) || parsed.error) {
      if (!cancelled) {
        setEntries([])
        setLoading(false)
      }
      return
    }

    const hasText = state.text.trim().length > 0
    const primaryPromise = queryService.runFind(parsed as ParsedFindQuery, { range })

    // When free-text is present, also run find:block to search body text
    const blockWql = hasText
      ? composeWql({ ...state, text: state.text.trim() }).replace(/^find:note/, 'find:block')
      : null
    const blockParsed = blockWql ? parseQuery(blockWql) : null
    const blockPromise = (blockParsed && isFindQuery(blockParsed) && !blockParsed.error)
      ? queryService.runFind(blockParsed as ParsedFindQuery, { range })
      : Promise.resolve(null)

    Promise.all([primaryPromise, blockPromise])
      .then(([primaryResult, blockResult]) => {
        if (cancelled) return
        const noteMap = new Map<string, Note>()

        // 1. Add notes from primary query (find:note or find:block)
        for (const note of primaryResult.notes) {
          noteMap.set(note.id, note)
        }
        for (const block of primaryResult.blocks) {
          if (!noteMap.has(block.noteId)) {
            noteMap.set(block.noteId, {
              id: block.noteId,
              title: block.noteTitle,
              createdAt: block.createdAt,
              type: 'note',
              sourceId: block.sourceId,
              catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
            })
          }
        }

        // 2. Add notes from secondary block body search (if present)
        if (blockResult?.blocks) {
          for (const block of blockResult.blocks) {
            if (!noteMap.has(block.noteId)) {
              noteMap.set(block.noteId, {
                id: block.noteId,
                title: block.noteTitle,
                createdAt: block.createdAt,
              type: 'note',
                sourceId: block.sourceId,
                catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
              })
            }
          }
        }

        setEntries(Array.from(noteMap.values()).map(toEntry))
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [wql, range, state.text])

  const dated = useMemo(
    () => entries.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [entries],
  )
  const sessions = useMemo(() => entries.filter(e => e.kind === 'session'), [entries])

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of dated) {
      const k = e.date ?? '(undated)'
      const arr = map.get(k)
      if (arr) arr.push(e)
      else map.set(k, [e])
    }
    return Array.from(map.entries())
  }, [dated])

  const sessionVisible = state.sources.session !== 'hide'
  const today = todayKey()
  return (
    <div className="bg-card flex flex-col flex-1" data-testid="library-page">
      <WqlComposerPanel
        state={state}
        onChange={setState}
        catalogs={catalogs}
      />

      {loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">Loading…</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">
          No entries match this query.
        </div>
      )}

      {byDate.map(([date, group]) => {
        const isToday = date === today
        return (
          <div key={date} className="flex flex-col">
            <div className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-[104px]">
              <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {date === '(undated)' ? 'Undated' : formatDateHeader(date)}
                {isToday && <span className="ml-2 text-primary">— Today</span>}
              </span>
            </div>
            <div className="flex flex-col gap-0 pb-1">
              {group.map(entry => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  tone={isToday && entry.kind === 'note' ? 'primary' : 'secondary'}
                  onAddToToday={handleAddToToday}
                />
              ))}
            </div>
          </div>
        )
      })}

      {sessionVisible && (
        <div className="flex flex-col border-t-2 border-dashed border-amber-500/30 mt-4" data-testid="static-shelf">
          <button
            type="button"
            onClick={() => setShelfOpen(o => !o)}
            className="sticky z-[5] px-6 py-2 bg-amber-500/[0.06] backdrop-blur-sm flex items-center gap-2 top-[104px] hover:bg-amber-500/[0.1] transition-colors"
          >
            <FolderIcon className="size-3 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Catalogues — Static, undated
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
              {sessions.length}
            </span>
            <span className="ml-auto">
              {shelfOpen ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
            </span>
          </button>
          {shelfOpen && (
            <div className="flex flex-col gap-0 pb-1">
              {sessions.length === 0 && (
                <div className="px-6 py-3 text-xs text-muted-foreground/50">No sessions match.</div>
              )}
              {sessions.map(entry => (
                <LibraryRow key={entry.id} entry={entry} onAddToToday={handleAddToToday} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
