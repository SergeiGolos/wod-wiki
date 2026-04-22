/**
 * Shared utilities for playground page components.
 *
 * Extracted from App.tsx so individual page components can be imported in
 * isolation (e.g. from Storybook stories) without pulling in the entire app.
 */

import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import type { NavItemL3 } from '../../nav/navTypes'
import { ArrowTopRightOnSquareIcon, PlayIcon } from '@heroicons/react/20/solid'

// ── Runtime-category constants ───────────────────────────────────────────────

/** Syntax and documentation pages use in-page popup; collections use route navigation. */
export const INLINE_RUNTIME_CATEGORIES = new Set(['syntax'])

/** Categories that are standard "library" collections (not journal/playground/canvas/syntax). */
export const NON_COLLECTION_CATEGORIES = new Set(['journal', 'playground', 'canvas', 'syntax'])

// ── Playground template helpers ──────────────────────────────────────────────

const CURSOR_TOKEN = '$CURSOR'

/** Strip the $CURSOR token and return { content, cursorOffset }. */
export function applyTemplate(raw: string): { content: string; cursorOffset: number } {
  const idx = raw.indexOf(CURSOR_TOKEN)
  if (idx === -1) return { content: raw, cursorOffset: raw.length }
  return {
    content: raw.slice(0, idx) + raw.slice(idx + CURSOR_TOKEN.length),
    cursorOffset: idx,
  }
}

// ── Page index helpers ───────────────────────────────────────────────────────

/** Extract headings and wod-fence positions from markdown content. */
export function extractPageIndex(content: string): PageNavLink[] {
  const lines = content.split('\n')
  const links: PageNavLink[] = []
  let wodCount = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (match) {
      let label = match[2].trim()
      let timestamp: string | undefined

      const timeMatch = label.match(/(\d{1,2}:\d{2})/)
      if (timeMatch) {
        timestamp = timeMatch[1]
        label = label.replace(timestamp, '').replace(/\s+/g, ' ').trim()
        if (!label) label = timestamp
      }

      const id = label.toLowerCase().replace(/[^\w]+/g, '-')
      links.push({ id, label, type: 'heading', timestamp })
      continue
    }
    if (/^```(wod|log|plan)/.test(line.trim())) {
      wodCount++
      links.push({ id: `wod-line-${i + 1}`, label: `Workout ${wodCount}`, type: 'wod' })
    }
  }
  return links
}

/** Map PageNavLink[] to NavItemL3[] for use with NavContext / sidebar. */
export function mapIndexToL3(index: PageNavLink[]): NavItemL3[] {
  return index.map(link => ({
    id: link.id,
    label: link.label,
    level: 3 as const,
    action: { type: 'scroll' as const, sectionId: link.id },
    secondaryAction: link.onRun
      ? {
          id: link.id + '-run',
          label: 'Run',
          icon: link.runIcon === 'link' ? ArrowTopRightOnSquareIcon : PlayIcon,
          action: { type: 'call' as const, handler: link.onRun },
        }
      : undefined,
  }))
}
