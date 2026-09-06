/**
 * toEntry — the pure mapper from the engine's `Note[]` to the Library's
 * `Entry[]`. This is the single place that touches `sourceId` discrimination
 * (per the spec); the rest of the Library never inspects `Note.sourceId`.
 *
 * Entry shape is locked by #807: identity = `{ sourceCatalog, sourceItem }`,
 * kind = `Note | Session | Post`. Notes carry a journal-date (resolved
 * elsewhere from `Page.date`); Sessions are undated by design; Posts carry
 * a `YYYY-MM-DD` recovered from the file path.
 */
import type { BlockIndexRow, Note } from '@/types/storage'
import type { IEffort, RowsRun, RowsQueryResult } from '@bitcobblers/wod-wiki-wql'
import type { UnifiedEventRecord, StoredOutputStatement } from '@bitcobblers/wod-wiki-core'
import { formatDateKey } from '../services/dateUtils'
import { parseNoteId } from '@/lib/noteIdentity'

export type EntryKind = 'note' | 'session' | 'post' | 'result' | 'segment' | 'effort' | 'event'

/** Block-level payload on an Entry produced from a find:block hit (#855):
 *  the card shows the parent note's identity plus the block's own type and
 *  a content preview, so count and presentation describe the same entity. */
export interface EntryBlock {
  /** Section id of the block within its note — the open-at-block anchor. */
  segmentId: string
  dataType: string
  /** Up to 3 non-empty preview lines from the block's raw content. */
  preview: string[]
}

/** Payload carried when an Entry represents an executed session or segment */
export interface EntryExecutionData {
  resultId: string
  noteId: string
  timestamp: number
  outputType: string
  effortSlug?: string
  elapsedMs?: number
  reps?: number
  loadLbs?: number
  distanceMeters?: number
  tis?: number
  segmentCount?: number
  events?: UnifiedEventRecord[]
  metrics?: StoredOutputStatement['metrics']
}

/** Payload carried when an Entry represents a registered effort */
export interface EntryEffortData {
  slug: string
  label: string
  discipline?: string
  met?: number
  intensityTier?: string
  aliases?: string[]
  registrySource?: string
}

export interface Entry {
  id: string
  kind: EntryKind
  sourceCatalog: string
  sourceItem: string
  /** Original Note.sourceId (undefined for journal notes). Carried on the
   *  Entry so the Library can pass it through to derived records (e.g. the
   *  `sourceId` of a cloned "Add to today" journal note). The Library never
   *  inspects this for kind classification; that's the mapper's job. */
  sourceId?: string
  title: string
  /** YYYY-MM-DD for date-grouped stream; null for undated shelf sessions & efforts. */
  date: string | null
  /** Creation instant — the chronological tiebreaker for undated entries (feed). */
  createdAt?: number
  subtitle?: string
  detail?: string
  tags?: string[]
  /** Rich-preview lines for whole-note entries (feed mode's engine companion
   *  query) — up to 3 non-empty lines from the note's blocks. */
  excerpt?: string[]
  /** The note's first wod block (feed companion query): full script content
   *  powers the rich reading preview and the feed's Run action — the runtime
   *  parses this content, so it is carried verbatim. */
  wodBlock?: { blockContentId: string; content: string }
  blockContentId?: string
  /** Set when the Entry represents one block (find:block), not a whole note. */
  block?: EntryBlock
  execution?: EntryExecutionData
  effort?: EntryEffortData
}

function isCollection(sourceId: string | undefined): boolean {
  return !!sourceId?.startsWith('collection:')
}

function isFeed(sourceId: string | undefined): boolean {
  return !!sourceId?.startsWith('feed:')
}

/** Playground entries: the intake convention is sourceId 'playground'; legacy
 *  playground pages carry type 'playground' (or a `playground/` composite id)
 *  with no sourceId. */
function isPlaygroundNote(note: Note): boolean {
  return note.sourceId === 'playground' || note.type === 'playground' || note.id.startsWith('playground/')
}

/** Route-visible name of a playground note — the `/playground/:id` segment
 *  (slug's name half for UUID-keyed notes, the id itself for legacy pages). */
export function playgroundRouteName(note: Pick<Note, 'id' | 'slug'>): string {
  const routeId = note.slug ?? note.id
  return routeId.startsWith('playground/') ? routeId.slice('playground/'.length) : routeId
}

/** For feeds, drop the `feeds/` wrapper and return the second segment as the catalog. */
function feedCatalog(noteId: string): string {
  return noteId.startsWith('feeds/') ? noteId.split('/')[1]! : noteId.split('/')[0]!
}

/** Extract `YYYY-MM-DD` from a feed file path like `feeds/<dir>/<date>/<file>`. */
function feedDate(noteId: string): string | null {
  if (!noteId.startsWith('feeds/')) return null
  const parts = noteId.split('/')
  // ['feeds', '<dir>', '<date>', '<file>']
  return parts[2] && /^\d{4}-\d{2}-\d{2}$/.test(parts[2]) ? parts[2]! : null
}

export function toEntry(note: Note): Entry {
  const id = note.id
  const title = note.title

  if (isPlaygroundNote(note)) {
    return {
      id,
      kind: 'note',
      sourceCatalog: 'playground',
      sourceItem: playgroundRouteName(note),
      sourceId: note.sourceId,
      title,
      date: null,
      createdAt: note.createdAt,
    }
  }

  if (isCollection(note.sourceId)) {
    const [catalog, ...rest] = id.split('/')
    return {
      id,
      kind: 'session',
      sourceCatalog: catalog!,
      sourceItem: rest.join('/'),
      sourceId: note.sourceId,
      title,
      date: null,
      createdAt: note.createdAt,
      subtitle: (note as Note & { catalog?: string }).catalog ?? catalog,
    }
  }

  if (isFeed(note.sourceId)) {
    return {
      id,
      kind: 'post',
      sourceCatalog: feedCatalog(id),
      sourceItem: id.split('/').slice(3).join('/') || id.split('/').pop()!,
      sourceId: note.sourceId,
      title,
      date: feedDate(id),
      createdAt: note.createdAt,
      subtitle: (note as Note & { catalog?: string }).catalog ?? id.split('/')[1]!,
    }
  }

  // Journal note
  return {
    id,
    kind: 'note',
    sourceCatalog: 'journal',
    sourceItem: id,
    sourceId: note.sourceId,
    title,
    date: null,
    createdAt: note.createdAt,
  }
}

/** Synthesize a minimal Note for a block hit — the input to {@link toEntry}
 *  for block-level results. Lives here so entryMapper stays the single place
 *  that touches sourceId classification. */
export function noteFromBlock(block: {
  noteId: string
  noteTitle: string
  createdAt: number
  sourceId?: string
}): Note {
  return {
    id: block.noteId,
    title: block.noteTitle,
    createdAt: block.createdAt,
    type: 'note',
    sourceId: block.sourceId,
    catalog: (block.noteId.startsWith('feeds/') ? block.noteId.slice('feeds/'.length) : block.noteId).split('/')[0],
  } as Note
}

const PREVIEW_LINE_CAP = 3
const PREVIEW_CHAR_CAP = 120

/** First non-empty lines of a block's raw content, each truncated — the
 *  card preview that makes a block hit inspectable without opening it. */
export function blockPreview(rawContent: string): string[] {
  return rawContent
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, PREVIEW_LINE_CAP)
    .map(line => (line.length > PREVIEW_CHAR_CAP ? `${line.slice(0, PREVIEW_CHAR_CAP - 1)}…` : line))
}

/**
 * Map one find:block hit to an Entry (#855). The Entry keeps the PARENT
 * note's identity (id, kind, catalog, date — Open/Add-to-today act on the
 * parent) and carries the block's own type/preview/anchor on `entry.block`.
 */
export function blockToEntry(block: BlockIndexRow): Entry {
  const base = toEntry(noteFromBlock(block))
  return {
    ...base,
    blockContentId: block.blockContentId ?? base.blockContentId,
    block: {
      segmentId: block.segmentId,
      dataType: block.dataType,
      preview: blockPreview(block.rawContent),
    },
  }
}

export function formatEffortName(slug: string): string {
  if (!slug) return ''
  return slug
    .split('-')
    .map(word => {
      const lower = word.toLowerCase()
      if (lower === 'c2b') return 'C2B'
      if (lower === 't2b') return 'T2B'
      if (lower === 'ghd') return 'GHD'
      if (lower === 'hspu') return 'HSPU'
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hours}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function deriveTitleFromNoteId(noteId: string): string {
  if (!noteId) return 'Workout Session'
  const ref = parseNoteId(noteId)
  if (ref.kind === 'journal') {
    return ref.id ? `Journal: ${ref.id}` : 'Journal Entry'
  }
  if (ref.kind === 'workout') {
    return formatEffortName(ref.id) || ref.id
  }
  return ref.id ? formatEffortName(ref.id) : noteId
}

export function effortToEntry(effort: IEffort): Entry {
  const discipline = effort.baseAttributes?.discipline
  const met = effort.baseAttributes?.met != null ? `MET ${effort.baseAttributes.met.toFixed(1)}` : undefined
  const intensity = effort.baseAttributes?.intensityTier
  const subtitleParts = [discipline, met, intensity].filter(Boolean)

  return {
    id: effort.slug,
    kind: 'effort',
    sourceCatalog: effort.registrySource ?? 'effort',
    sourceItem: effort.slug,
    title: effort.label,
    date: null,
    subtitle: subtitleParts.join(' • '),
    detail: effort.aliases && effort.aliases.length > 0 ? `Aliases: ${effort.aliases.join(', ')}` : undefined,
    effort: {
      slug: effort.slug,
      label: effort.label,
      discipline: effort.baseAttributes?.discipline,
      met: effort.baseAttributes?.met,
      intensityTier: effort.baseAttributes?.intensityTier,
      aliases: effort.aliases,
      registrySource: effort.registrySource,
    },
  }
}
interface MetricLike {
  type?: string
  name?: string
  value?: unknown
}

function classifyMetric(m: MetricLike) {
  const type = (m.type ?? '').toLowerCase()
  const name = ('name' in m && typeof m.name === 'string' ? m.name : '').toLowerCase()
  const val = typeof m.value === 'number' ? m.value : Number(m.value)
  if (!Number.isFinite(val)) return null

  if (type === 'rep' || name === 'reps' || name === 'rep') return { kind: 'rep' as const, val }
  if (type === 'weight' || type === 'load' || name === 'load' || name === 'weight' || name === 'volume') return { kind: 'load' as const, val }
  if (type === 'distance' || name === 'distance') return { kind: 'distance' as const, val }
  if (type === 'tis' || name === 'tis') return { kind: 'tis' as const, val }
  if (type === 'duration' || name === 'duration') return { kind: 'duration' as const, val }
  return null
}

function extractRunMetrics(run: RowsRun) {
  let minStart = Infinity
  let maxEnd = -Infinity
  let totalReps = 0
  let totalLoad = 0
  let maxTis = 0
  let segmentCount = 0
  const effortSlugs = new Set<string>()

  for (const event of run.events) {
    if (event.outputType === 'segment') {
      segmentCount++
    }
    if (event.effortSlug) {
      effortSlugs.add(event.effortSlug)
    }
    if (event.timeSpan?.started != null) {
      if (event.timeSpan.started < minStart) minStart = event.timeSpan.started
      if (event.timeSpan.ended != null && event.timeSpan.ended > maxEnd) {
        maxEnd = event.timeSpan.ended
      }
    }
    if (Array.isArray(event.metrics)) {
      for (const m of event.metrics) {
        const classified = classifyMetric(m)
        if (!classified) continue
        if (classified.kind === 'rep') totalReps += classified.val
        else if (classified.kind === 'load') totalLoad += classified.val
        else if (classified.kind === 'tis' && classified.val > maxTis) maxTis = classified.val
      }
    }
  }
  const elapsedMs = (Number.isFinite(minStart) && Number.isFinite(maxEnd) && maxEnd > minStart)
    ? maxEnd - minStart
    : undefined

  return {
    elapsedMs,
    reps: totalReps > 0 ? totalReps : undefined,
    loadLbs: totalLoad > 0 ? totalLoad : undefined,
    tis: maxTis > 0 ? maxTis : undefined,
    segmentCount: segmentCount > 0 ? segmentCount : undefined,
    effortSlugs: Array.from(effortSlugs),
  }
}

export function rowsRunToEntry(run: RowsRun, options?: { noteTitle?: string }): Entry {
  const metrics = extractRunMetrics(run)
  const subtitleParts: string[] = []

  if (metrics.elapsedMs != null) {
    subtitleParts.push(formatDuration(metrics.elapsedMs))
  }
  if (metrics.tis != null) {
    subtitleParts.push(`TIS ${metrics.tis.toFixed(1)}`)
  }
  if (metrics.loadLbs != null) {
    subtitleParts.push(`Volume: ${metrics.loadLbs.toLocaleString()} lbs`)
  }
  if (metrics.reps != null) {
    subtitleParts.push(`${metrics.reps} reps`)
  }
  if (metrics.segmentCount != null) {
    subtitleParts.push(`${metrics.segmentCount} splits`)
  }

  const movements = metrics.effortSlugs.map(formatEffortName)
  const dateStr = formatDateKey(new Date(run.timestamp))
  const blockContentId = run.events.find(e => !!e.blockContentId)?.blockContentId

  return {
    id: run.resultId,
    kind: 'result',
    sourceCatalog: 'results',
    sourceItem: run.resultId,
    title: options?.noteTitle ?? deriveTitleFromNoteId(run.noteId),
    date: dateStr,
    blockContentId,
    subtitle: subtitleParts.join(' • '),
    detail: movements.length > 0 ? movements.join(', ') : undefined,
    execution: {
      resultId: run.resultId,
      noteId: run.noteId,
      timestamp: run.timestamp,
      outputType: 'all',
      elapsedMs: metrics.elapsedMs,
      reps: metrics.reps,
      loadLbs: metrics.loadLbs,
      tis: metrics.tis,
      segmentCount: metrics.segmentCount,
      events: run.events,
    },
  }
}

export function unifiedEventToEntry(
  event: UnifiedEventRecord,
  options?: { index?: number },
): Entry {
  let elapsedMs: number | undefined
  if (event.timeSpan?.started != null && event.timeSpan?.ended != null) {
    elapsedMs = event.timeSpan.ended - event.timeSpan.started
  }
  let reps: number | undefined
  let loadLbs: number | undefined
  let distanceMeters: number | undefined
  let tis: number | undefined

  if (Array.isArray(event.metrics)) {
    for (const m of event.metrics) {
      const classified = classifyMetric(m)
      if (!classified) continue
      if (classified.kind === 'rep') reps = classified.val
      else if (classified.kind === 'load') loadLbs = classified.val
      else if (classified.kind === 'distance') distanceMeters = classified.val
      else if (classified.kind === 'tis') tis = classified.val
      else if (classified.kind === 'duration' && !elapsedMs) elapsedMs = classified.val
    }
  }

  const kind: EntryKind = event.outputType === 'segment' ? 'segment' : 'event'
  const index = options?.index ?? 0
  const title = event.effortSlug
    ? formatEffortName(event.effortSlug)
    : event.outputType === 'segment'
      ? `Round ${index + 1}`
      : `${event.outputType.charAt(0).toUpperCase() + event.outputType.slice(1)} ${index + 1}`

  const subtitleParts: string[] = []
  if (elapsedMs != null) {
    subtitleParts.push(formatDuration(elapsedMs))
  }
  if (reps != null && loadLbs != null) {
    subtitleParts.push(`${reps} reps @ ${loadLbs} lbs`)
  } else if (reps != null) {
    subtitleParts.push(`${reps} reps`)
  } else if (loadLbs != null) {
    subtitleParts.push(`${loadLbs} lbs`)
  }
  if (distanceMeters != null) {
    subtitleParts.push(`${distanceMeters}m`)
  }
  if (tis != null) {
    subtitleParts.push(`TIS ${tis.toFixed(1)}`)
  }

  const dateStr = formatDateKey(new Date(event.timestamp))

  return {
    id: event.id,
    kind,
    sourceCatalog: 'results',
    sourceItem: event.id,
    title,
    date: dateStr,
    blockContentId: event.blockContentId,
    subtitle: subtitleParts.join(' • '),
    detail: event.effortSlug ? formatEffortName(event.effortSlug) : undefined,
    execution: {
      resultId: event.resultId,
      noteId: event.noteId,
      timestamp: event.timestamp,
      outputType: event.outputType,
      effortSlug: event.effortSlug,
      elapsedMs,
      reps,
      loadLbs,
      distanceMeters,
      tis,
      metrics: event.metrics,
    },
  }
}

export function rowsQueryResultToEntries(
  result: RowsQueryResult,
  options?: { noteTitles?: Map<string, string> },
): Entry[] {
  if (!result || result.error || !result.runs) return []

  const target = result.parsed?.outputType

  if (target === 'segment') {
    const entries: Entry[] = []
    for (const run of result.runs) {
      let idx = 0
      for (const event of run.events) {
        if (event.outputType === 'segment') {
          entries.push(unifiedEventToEntry(event, { index: idx++ }))
        }
      }
    }
    return entries
  }

  if (target && target !== 'all') {
    const entries: Entry[] = []
    for (const run of result.runs) {
      let idx = 0
      for (const event of run.events) {
        if (event.outputType === target) {
          entries.push(unifiedEventToEntry(event, { index: idx++ }))
        }
      }
    }
    return entries
  }

  return result.runs.map(run =>
    rowsRunToEntry(run, { noteTitle: options?.noteTitles?.get(run.noteId) }),
  )
}
