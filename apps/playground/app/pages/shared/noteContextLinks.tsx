/**
 * noteContextLinks — shared source-aware contextual links for note views.
 *
 * One place for the per-view interlinking from docs/note-pages-inventory.html:
 *   - noteOwnership  — the note's source family → L1 zone id, owning-list "Up"
 *     link, and the sourceNote stamps journal copies carry in `sourceId`.
 *   - provenanceLink — resolve a stamped sourceId to a routable link.
 *   - effort / related-block / backlink lookups over the existing IDB indexes
 *     (block_efforts, block_index by-note/by-content/by-effort, notes.sourceId).
 *
 * Pure functions are exported for tests; `useNoteContextLinks` + the
 * `NoteContextLinks` row are the view surface every note page composes.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { storageService } from '@/services/storage'
import type { BlockEffort, BlockIndexRow, Note } from '@/types/storage'
import type { HistoryEntry } from '@/types/history'
import { parseNoteId } from '@/lib/noteIdentity'
import { noteRefToPath } from '../../lib/noteIdentity'
import { canGoBack } from './pageUtils'
import {
  collectionPath,
  effortPath,
  feedDetailPath,
  journalDatePath,
  noteByIdPath,
  pagePath,
  playgroundsPath,
  workoutPath,
} from '../../lib/routes'
import { playgroundRouteName } from '../../lib/entryMapper'

/**
 * Routable path for a STORED note id. Composite ids keep their family route
 * (cat/name → /c/…, effort/<slug> → /e/…, journal/<date> → /journal/…);
 * bare ids (UUIDs — journal copies, V8 playground notes) have no family
 * route and open in the canonical editor /notes/:id, never the `/` fallback.
 */
export function noteLinkPath(noteId: string): string {
  const ref = parseNoteId(noteId)
  if (ref.kind === 'workout' && !ref.category) return noteByIdPath(noteId)
  return noteRefToPath(ref)
}

export interface ContextNoteLink {
  id: string
  title: string
  to: string
}

export interface NoteContextData {
  /** Efforts referenced by this note's scripts (`block_efforts` by-note). */
  efforts: ContextNoteLink[]
  /** Other notes sharing a workout-block content id (same script shape). */
  related: ContextNoteLink[]
  /** Notes whose sourceNote stamp (`sourceId`) points at this note. */
  backlinks: ContextNoteLink[]
}

const EMPTY_CONTEXT: NoteContextData = { efforts: [], related: [], backlinks: [] }
/** ponytail: cap chips so benchmark blocks (cloned everywhere) stay one row; raise when a page wants full lists. */
const MAX_RELATED = 8

// ── Source-aware ownership ───────────────────────────────────────────────────

export type NoteZone = 'journal' | 'collections' | 'playgrounds' | 'efforts' | null

export interface NoteOwnership {
  /** L1 zone id to light on the canonical /notes route (guarded against the tree). */
  zone: NoteZone
  /** Owning-list link ("Up") derived from the note's source; null when unknown. */
  up: ContextNoteLink | null
  /** sourceNote stamps journal copies may carry for this note (paths or ids). */
  stamps: string[]
}

/**
 * Source-aware ownership for a loaded entry. Kind resolution follows the
 * stored conventions (entryMapper): `type` when present, then the composite-id
 * grammar (journal/:date, playground/:name, effort/:slug, feeds/…, cat/name).
 */
export function noteOwnership(entry: Pick<HistoryEntry, 'id' | 'type' | 'sourceId' | 'journalDate' | 'slug' | 'pageId'>): NoteOwnership {
  const id = entry.id
  const isPlayground = entry.type === 'playground' || entry.sourceId === 'playground' || id.startsWith('playground/')
  const ref = parseNoteId(id)

  if (entry.type === 'journal' || entry.journalDate || (!isPlayground && ref.kind === 'journal')) {
    const date = entry.journalDate ?? (ref.kind === 'journal' ? ref.id : undefined)
    return {
      zone: 'journal',
      up: date ? { id: date, title: 'Journal', to: journalDatePath(date) } : null,
      stamps: [id],
    }
  }
  if (isPlayground || ref.kind === 'playground') {
    const name = playgroundRouteName({ id })
    return {
      zone: 'playgrounds',
      up: { id: 'playgrounds', title: 'Playgrounds', to: playgroundsPath() },
      stamps: [`/playground/${name}`],
    }
  }
  if (ref.kind === 'workout') {
    if (ref.category === 'effort') {
      return {
        zone: 'efforts',
        up: { id: ref.id, title: 'Efforts', to: effortPath(ref.id) },
        stamps: [effortPath(ref.id)],
      }
    }
    if (ref.category === 'feeds') {
      // Feed runs stamp the ITEM path (`/feeds/<slug>/<date>/<item>`) going
      // forward (feed-level `/feeds/<slug>` stamps predate item attribution
      // and only ever match the feed listing page, never this item).
      const [, feedSlug, feedDate, feedItem] = id.split('/')
      return {
        zone: 'collections',
        up: feedSlug ? { id: feedSlug, title: feedSlug, to: feedDetailPath(feedSlug) } : null,
        stamps: feedSlug && feedDate && feedItem ? [`/feeds/${feedSlug}/${feedDate}/${feedItem}`] : [],
      }
    }
    if (ref.category) {
      return {
        zone: 'collections',
        up: { id: ref.category, title: ref.category, to: collectionPath(ref.category) },
        stamps: [workoutPath(ref.category, ref.id)],
      }
    }
  }
  if (entry.type === 'page' && (entry.pageId ?? entry.slug)) {
    const slug = entry.pageId ?? entry.slug!
    return { zone: null, up: { id: slug, title: `/p/${slug}`, to: pagePath(slug) }, stamps: [] }
  }
  return { zone: null, up: null, stamps: [] }
}

/**
 * Resolve a stamped `sourceId` for the provenance chip: app paths link
 * directly (that's what journal-copy stamping writes); bare values are note
 * ids the caller resolves through the content provider. Stamps are
 * user-editable storage data — decoding is throw-safe on malformed input.
 */
export function provenanceLink(sourceId: string): ContextNoteLink | null {
  if (!sourceId.startsWith('/')) return null
  const to = sourceId.split('#')[0]
  const segs = to.replace(/\/+$/, '').split('/').filter(Boolean)
  const rawLabel = segs[segs.length - 1]
  let label = rawLabel
  if (label) {
    try {
      label = decodeURIComponent(label)
    } catch {
      // Malformed percent-encoding in a stored stamp — keep the raw segment.
    }
  }
  return { id: to, title: label || to, to }
}

// ── Index-derived link builders (pure) ───────────────────────────────────────

/** Efforts referenced by a note, from its block_efforts rows (de-duped, in order). */
export function effortLinks(rows: BlockEffort[]): ContextNoteLink[] {
  const seen = new Set<string>()
  const out: ContextNoteLink[] = []
  for (const row of rows) {
    if (!row.effortSlug || seen.has(row.effortSlug)) continue
    seen.add(row.effortSlug)
    out.push({ id: row.effortSlug, title: row.effortSlug, to: effortPath(row.effortSlug) })
  }
  return out
}

/** Other notes sharing any of this note's workout-block content ids — "same
 * block ideas". Reads the full row set (this note's rows + sibling rows
 * fetched by-content by the hook), de-dupes by noteId, caps the list. Only
 * `wod` rows count: a frontmatter row sharing a content id is not a workout. */
export function relatedBlockLinks(rows: BlockIndexRow[], noteId: string, cap = MAX_RELATED): ContextNoteLink[] {
  const own = new Set(
    rows.filter(r => r.noteId === noteId && r.dataType === 'wod' && r.blockContentId)
      .map(r => r.blockContentId as string),
  )
  if (own.size === 0) return []
  const byNote = new Map<string, ContextNoteLink>()
  for (const row of rows) {
    if (row.dataType !== 'wod') continue
    if (!row.blockContentId || !own.has(row.blockContentId) || row.noteId === noteId) continue
    if (byNote.has(row.noteId)) continue
    byNote.set(row.noteId, {
      id: row.noteId,
      title: row.noteTitle || row.noteId,
      to: noteLinkPath(row.noteId),
    })
    if (byNote.size >= cap) break
  }
  return [...byNote.values()]
}

/**
 * Journal copies stamped with one of these sourceNote stamps. Matches exact
 * stamps and their `#segment` variants (entryOpenHref appends block anchors).
 */
export function backlinkNotes(notes: Note[], stamps: string[], excludeNoteId?: string): ContextNoteLink[] {
  if (stamps.length === 0) return []
  const matched = notes.filter(n =>
    n.id !== excludeNoteId && !!n.sourceId &&
    stamps.some(s => n.sourceId === s || n.sourceId.startsWith(`${s}#`)),
  )
  matched.sort((a, b) => b.createdAt - a.createdAt)
  return matched.map(n => ({
    id: n.id,
    title: n.title || n.id,
    to: noteLinkPath(n.id),
  }))
}

/** Notes whose scripts use an effort, from block_efforts by-effort rows. */
export function effortUsageLinks(rows: BlockEffort[], excludeNoteId?: string): ContextNoteLink[] {
  const byNote = new Map<string, ContextNoteLink>()
  for (const row of rows) {
    if (row.noteId === excludeNoteId || byNote.has(row.noteId)) continue
    byNote.set(row.noteId, {
      id: row.noteId,
      title: row.noteId,
      to: noteLinkPath(row.noteId),
    })
  }
  return [...byNote.values()]
}

// ── Data hook ────────────────────────────────────────────────────────────────

export interface UseNoteContextLinksOptions {
  noteId: string
  /** sourceNote stamps journal copies may carry for this note. */
  stamps: string[]
  /** When the page IS an effort, also resolve notes whose scripts use it. */
  effortSlug?: string
}

/** Load the three context datasets over the existing IDB indexes. */
export function useNoteContextLinks({ noteId, stamps, effortSlug }: UseNoteContextLinksOptions): NoteContextData {
  const stampKey = stamps.join('\n')
  const [data, setData] = useState<NoteContextData>(EMPTY_CONTEXT)

  useEffect(() => {
    let cancelled = false
    const stampList = stampKey ? stampKey.split('\n') : []
    Promise.all([
      storageService.getAllFromIndex('block_efforts', 'by-note', noteId) as Promise<BlockEffort[]>,
      storageService.getAllFromIndex('block_index', 'by-note', noteId) as Promise<BlockIndexRow[]>,
      storageService.getAllNotes(),
      effortSlug
        ? (storageService.getAllFromIndex('block_efforts', 'by-effort', effortSlug) as Promise<BlockEffort[]>)
        : Promise.resolve([]),
    ])
      .then(async ([effortRows, blockRows, notes, usageRows]) => {
        if (cancelled) return EMPTY_CONTEXT
        const ownContentIds = [...new Set(
          blockRows.filter(r => r.dataType === 'wod' && r.blockContentId).map(r => r.blockContentId as string),
        )]
        const siblingRows = await Promise.all(
          ownContentIds.map(cid => storageService.getAllFromIndex('block_index', 'by-content', cid) as Promise<BlockIndexRow[]>),
        )
        if (cancelled) return EMPTY_CONTEXT
        const related = relatedBlockLinks([...blockRows, ...siblingRows.flat()], noteId)
        if (effortSlug) {
          const seen = new Set(related.map(r => r.id))
          for (const usage of effortUsageLinks(usageRows, noteId)) {
            if (!seen.has(usage.id)) {
              seen.add(usage.id)
              related.push(usage)
            }
          }
        }
        return {
          efforts: effortLinks(effortRows),
          related,
          backlinks: backlinkNotes(notes, stampList, noteId),
        }
      })
      .then(next => {
        if (!cancelled && next) setData(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [noteId, stampKey, effortSlug])

  return data
}

// ── Presentational row ───────────────────────────────────────────────────────

const chipClass =
  'rounded-pill border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'

const groupLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70'

function ChipGroup({ label, items }: { label: string; items: ContextNoteLink[] }) {
  if (items.length === 0) return null
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={groupLabelClass}>{label}</span>
      {items.map(item => (
        <Link key={`${label}:${item.id}`} to={item.to} className={chipClass}>
          {item.title}
        </Link>
      ))}
    </span>
  )
}

export interface NoteContextLinksProps {
  data: NoteContextData
  /** Owning-list link ("Up") — rendered first when present. */
  up?: ContextNoteLink | null
  /** Extra leading content (e.g. prev/next journal date links). */
  leading?: ReactNode
  /** Label override for the `related` group (e.g. "Used in" on effort pages). */
  relatedLabel?: string
  className?: string
}

/** The contextual chips row every note view renders above its editor. The
 *  Up chip prefers history.back() (returns to the listing with its query,
 *  grouping and scroll state intact) and falls back to the canonical
 *  owning-list link on deep loads. */
export function NoteContextLinks({ data, up, leading, relatedLabel = 'Related workouts', className }: NoteContextLinksProps) {
  const navigate = useNavigate()
  const hasAnything = !!up || !!leading || data.efforts.length > 0 || data.backlinks.length > 0 || data.related.length > 0
  if (!hasAnything) return null
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${className ?? ''}`}>
      {leading}
      {up && (
        <span className="flex items-center gap-x-2">
          <span className={groupLabelClass}>Up</span>
          <button
            type="button"
            onClick={() => (canGoBack() ? navigate(-1) : navigate(up.to))}
            title={up.title}
            className={chipClass}
          >
            {up.title}
          </button>
        </span>
      )}
      <ChipGroup label="Efforts" items={data.efforts} />
      <ChipGroup label="Journal copies" items={data.backlinks} />
      <ChipGroup label={relatedLabel} items={data.related} />
    </div>
  )
}
