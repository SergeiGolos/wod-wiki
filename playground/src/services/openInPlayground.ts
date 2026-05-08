/**
 * openInPlayground — leaf handler for the "Open in Playground" WOD block action.
 *
 * Creates a new playground page pre-populated with the WOD block's content
 * and navigates to it.
 */

import type { NavigateFunction } from 'react-router-dom'
import type { WodBlock } from '@/components/Editor/types'
import { createPlaygroundPage } from './createPlaygroundPage'

export async function openBlockInPlayground(
  block: WodBlock,
  navigate: NavigateFunction,
): Promise<void> {
  const id = await createPlaygroundPage(block.content)
  navigate(`/playground/${encodeURIComponent(id)}`)
}

/**
 * shareBlock — copy a deep-link URL to this WOD block's section to the clipboard.
 *
 * Uses block.startLine to reconstruct the `wod-line-N` section ID used by
 * extractPageIndex / the ?s= query param convention.
 */
export function shareBlock(block: WodBlock): void {
  const sectionId = `wod-line-${block.startLine + 1}`
  const url = new URL(window.location.href)
  url.searchParams.set('s', sectionId)
  navigator.clipboard.writeText(url.toString()).catch(() => {})
}
