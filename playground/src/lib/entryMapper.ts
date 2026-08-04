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

export type EntryKind = 'note' | 'session' | 'post'

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
  /** YYYY-MM-DD for Post, null for Note (page resolves) and Session (undated). */
  date: string | null
  subtitle?: string
  detail?: string
  blockContentId?: string
  /** Set when the Entry represents one block (find:block), not a whole note. */
  block?: EntryBlock
}

function isCollection(sourceId: string | undefined): boolean {
  return !!sourceId?.startsWith('collection:')
}

function isFeed(sourceId: string | undefined): boolean {
  return !!sourceId?.startsWith('feed:')
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
