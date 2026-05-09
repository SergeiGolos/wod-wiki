/**
 * openInPlayground — WOD block actions that use the zip-load mechanism.
 *
 * Both "Open in Playground" and "Share" encode the block's content as a
 * gzip+base64 URL (/load?zip=<encoded>). useZipProcessor (GlobalState) picks
 * up the param, creates a new playground page in IndexedDB, and redirects.
 *
 * - openBlockInPlayground  → navigate to /load?zip=... in the same tab
 * - shareBlock             → copy that URL to the clipboard + show toast
 */

import type { NavigateFunction } from 'react-router-dom'
import type { WodBlock } from '@/components/Editor/types'
import { encodeZip } from './encodeZip'
import { toast } from '@/hooks/use-toast'

/** Build the /load?zip= URL for a WOD block. */
async function buildZipUrl(block: WodBlock): Promise<string> {
  const dialect = block.dialect || 'wod'
  const markdown = `\`\`\`${dialect}\n${block.content.trimEnd()}\n\`\`\`\n`
  const encoded = await encodeZip(markdown)
  return `${window.location.origin}/load?zip=${encoded}`
}

/**
 * Navigate directly to a new playground page pre-loaded with the WOD block's
 * content. Uses the same /load?zip= mechanism as WodPlaygroundButton.
 */
export async function openBlockInPlayground(
  block: WodBlock,
  navigate: NavigateFunction,
): Promise<void> {
  const url = await buildZipUrl(block)
  // Extract just the path+query so we navigate within the SPA router
  const { pathname, search } = new URL(url)
  navigate(`${pathname}${search}`)
}

/**
 * Copy the /load?zip= URL for the WOD block to the clipboard and show a
 * toast confirmation. The recipient can paste this URL into any browser to
 * open the workout in their own playground.
 */
export function shareBlock(block: WodBlock): void {
  buildZipUrl(block).then(url => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard.',
      })
    }).catch(() => {
      toast({
        title: 'Could not copy',
        description: url,
        variant: 'destructive',
      })
    })
  })
}
