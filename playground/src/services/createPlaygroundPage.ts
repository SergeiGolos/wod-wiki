import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay'

import { playgroundDB, PlaygroundDBService } from './playgroundDB'

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
  const now = Date.now()
  for (let attempt = 0; attempt <= MAX_TIMESTAMP_ID_RETRIES; attempt++) {
    const name = attempt === 0 ? baseName : `${baseName}-${attempt}`
    const pageId = PlaygroundDBService.pageId('playground', name)
    try {
      await playgroundDB.addPage({
        id: pageId,
        category: 'playground',
        name,
        content,
        updatedAt: now,
      })
      return name
    } catch (err) {
      if (err instanceof DOMException && err.name === 'ConstraintError') continue
      throw err
    }
  }
  throw new Error('Unable to allocate unique playground timestamp ID')
}