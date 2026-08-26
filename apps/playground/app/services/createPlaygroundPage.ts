import { formatPlaygroundTimestampId } from '@/lib/playgroundDisplay'

import { pageId, playgroundContent } from './playgroundContent'

/**
 * Create a new playground page.
 *
 * Writes the composite page (`playground/<timestamp-name>`) — the identity
 * PlaygroundNotePage actually loads — and returns the route name. Millisecond
 * timestamp precision plus the in-flight guard in PlaygroundRedirect make
 * collisions a non-issue; an upsert on collision is acceptable for a scratch
 * surface.
 */
export async function createPlaygroundPage(content: string): Promise<string> {
  const baseName = formatPlaygroundTimestampId(Date.now())
  await playgroundContent.savePage({
    id: pageId('playground', baseName),
    category: 'playground',
    name: baseName,
    content,
    updatedAt: Date.now(),
  })
  return baseName
}
