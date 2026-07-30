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
import type { Note } from '@/types/storage'

export type EntryKind = 'note' | 'session' | 'post'

export interface Entry {
  id: string
  kind: EntryKind
  sourceCatalog: string
  sourceItem: string
  title: string
  /** YYYY-MM-DD for Post, null for Note (page resolves) and Session (undated). */
  date: string | null
  subtitle?: string
  detail?: string
  blockContentId?: string
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
    title,
    date: null,
  }
}
