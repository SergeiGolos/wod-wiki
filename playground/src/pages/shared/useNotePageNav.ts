/**
 * useNotePageNav — Shared L3-nav + page-index plumbing for note pages.
 *
 * Every note-style page (Journal, Playground, WorkoutEditor) does the same
 * thing:
 *   1. Run `extractPageIndex(content)` to produce `PageNavLink[]`.
 *   2. For each `wod` link, look up the matching `WodBlock` by start-line and
 *      attach an `onRun` callback (and optional result-count badging).
 *   3. Mirror that index into the L3 nav via `setL3Items` and clear it on
 *      unmount.
 *
 * That ~40-line block was duplicated verbatim across three pages; this hook
 * collapses it into a single call.
 */

import { useEffect, useMemo } from 'react'
import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { WodBlock } from '@/components/Editor/types'
import type { WorkoutResult } from '@/types/storage'
import { useNav } from '../../nav/NavContext'
import { extractPageIndex, mapIndexToL3 } from './pageUtils'

export interface UseNotePageNavOptions {
  /** Current editor content. */
  content: string
  /** Parsed wod blocks (from `<NoteEditor onBlocksChange>`). */
  wodBlocks: WodBlock[]
  /** Callback invoked when the user runs a wod link. */
  onStartWorkout: (block: WodBlock) => void
  /**
   * Optional results to badge each wod link with `hasResult` / `resultCount`.
   * Only the JournalPage uses this today.
   */
  results?: WorkoutResult[]
}

/**
 * Build the page index, wire each wod link's `onRun`, and publish to L3 nav.
 * Returns the resolved `PageNavLink[]` so the page can pass it to its shell.
 */
export function useNotePageNav({
  content,
  wodBlocks,
  onStartWorkout,
  results,
}: UseNotePageNavOptions): PageNavLink[] {
  const index = useMemo((): PageNavLink[] => {
    const base = extractPageIndex(content)
    return base.map(link => {
      if (link.type !== 'wod') return link
      const lineNum = parseInt(link.id.replace('wod-line-', ''), 10)
      const block = wodBlocks.find(b => b.startLine + 1 === lineNum)

      let badge: { hasResult?: boolean; resultCount?: number } = {}
      if (results) {
        const sectionResults = results.filter(
          r => r.sectionId === link.id || r.segmentId === link.id,
        )
        badge = {
          hasResult: sectionResults.length > 0,
          resultCount: sectionResults.length,
        }
      }

      return {
        ...link,
        ...badge,
        onRun: () => {
          // Re-resolve at click time in case `wodBlocks` changed.
          const b = block || wodBlocks.find(b => b.startLine + 1 === lineNum) || wodBlocks[0]
          if (b) onStartWorkout(b)
        },
      }
    })
  }, [content, wodBlocks, onStartWorkout, results])

  const { setL3Items } = useNav()
  useEffect(() => {
    setL3Items(mapIndexToL3(index))
    return () => setL3Items([])
  }, [index, setL3Items])

  return index
}
