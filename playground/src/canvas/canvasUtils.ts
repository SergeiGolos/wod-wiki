import { stripFrontmatter } from '@/utils/frontmatter'
import type { ScriptBlock } from '@/components/Editor/types'
import type { CanvasSection } from './parseCanvasMarkdown'

export const STICKY_NAV_HEIGHT = 104
export const MOBILE_STICKY_TOP = 65
export const MOBILE_BREAKPOINT_PX = 1023
export const INITIAL_SOURCE_KEY = '__initial__'

export function getPageStickyOffset(fallback: number): number {
  if (typeof document === 'undefined') return fallback

  const stickyElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-page-sticky-boundary="true"]'),
  )

  const visibleBottom = stickyElements.reduce((maxBottom, element) => {
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0) return maxBottom
    return Math.max(maxBottom, rect.bottom)
  }, 0)

  return visibleBottom > 0 ? visibleBottom + 24 : fallback
}

export function getCanvasNoteId(route: string): string {
  return route === '/' ? 'canvas:home' : `canvas:${route.replace(/^\//, '')}`
}

export function resolveSource(dslPath: string, wodFiles: Record<string, string>): string {
  if (dslPath.startsWith('markdown/')) {
    const key = '../../' + dslPath
    if (key in wodFiles) return stripFrontmatter(wodFiles[key])
  }

  let key = dslPath
  if (dslPath.startsWith('wods/examples/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^wods\/examples\//, '')
  } else if (dslPath.startsWith('wods/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^wods\//, '')
  } else if (dslPath.startsWith('collections/')) {
    key = '../../markdown/collections/' + dslPath.replace(/^collections\//, '')
  } else if (dslPath.startsWith('canvas/')) {
    key = '../../markdown/canvas/' + dslPath.replace(/^canvas\//, '')
  } else {
    const canvasKey = '../../markdown/canvas/' + dslPath
    if (canvasKey in wodFiles) return stripFrontmatter(wodFiles[canvasKey])

    const collectionsKey = '../../markdown/collections/' + dslPath
    if (collectionsKey in wodFiles) return stripFrontmatter(wodFiles[collectionsKey])

    key = '../../markdown/' + dslPath
  }
  return key in wodFiles ? stripFrontmatter(wodFiles[key]) : `# Source not found\n\nPath: \`${dslPath}\`\nResolved: \`${key}\``
}
/** True when a section declares its own example(s) or a command with at least one step. */
export function sectionOwnsContent(section: CanvasSection): boolean {
  return (section.examples ?? []).length > 0 || section.commands.some((cmd) => cmd.pipeline.length > 0)
}

/**
 * Maps every content section (in document order) to whichever section
 * *owns* the code sample it should be showing: itself, if it declares an
 * example/command with real steps, otherwise the nearest earlier section
 * that does — or `null` if none precede it (meaning the panel's original
 * `view` source applies).
 *
 * Resolving ownership from document position — rather than "whichever
 * section's side effect last fired" — is what lets scrolling back UP
 * correctly restore earlier content instead of leaving it stuck on
 * whatever a later section set on the way down.
 */
export function resolveContentOwners(contentSections: CanvasSection[]): Map<string, CanvasSection | null> {
  const map = new Map<string, CanvasSection | null>()
  let owner: CanvasSection | null = null
  for (const section of contentSections) {
    if (sectionOwnsContent(section)) owner = section
    map.set(section.id, owner)
  }
  return map
}
