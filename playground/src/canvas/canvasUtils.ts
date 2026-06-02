import { stripFrontmatter } from '@/utils/frontmatter'

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
