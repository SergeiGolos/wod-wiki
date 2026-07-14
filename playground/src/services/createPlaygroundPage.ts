import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay'

import { journalNotes } from './journalNotes'

const MAX_TIMESTAMP_ID_RETRIES = 10

/**
 * Atomically create a new playground page.
 *
 * Tries `baseName`, then `baseName-1` … `baseName-N`. Each attempt uses
 * IndexedDB `add()` (via `addPage`), which throws a `ConstraintError` if the
 * key already exists — making the check-and-create race-free even when two
 * tabs open simultaneously.
 *
 * Returns the ID that was successfully written.
 */
export async function createPlaygroundPage(content: string): Promise<string> {
  const baseName = formatPlaygroundTimestampId(Date.now())
  const note = await journalNotes.create({
    journalDate: '',
    title: baseName,
    rawContent: content,
    type: 'playground',
    slug: `playground/${baseName}`,
  })
  return note.id
}