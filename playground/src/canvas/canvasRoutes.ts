/**
 * Canvas Routes — loads all markdown/canvas/routes/**/*.md files at build time via
 * import.meta.glob and parses them into typed `CanvasRoute` objects.
 *
 * Vite resolves the glob at compile time so the final bundle contains the
 * markdown content as inlined strings — no runtime file I/O is required.
 */

import { parseCanvasMarkdown, type ParsedCanvasPage } from './parseCanvasMarkdown'

// Routes from markdown/canvas/**/*.md (explicit routes)
const routeFiles = import.meta.glob('../../../markdown/canvas/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

// Collection READMEs from markdown/collections/**/README.md
const collectionFiles = import.meta.glob('../../../markdown/collections/**/README.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export interface CanvasRoute {
  route: string
  page: ParsedCanvasPage
}

const routes1: CanvasRoute[] = Object.values(routeFiles)
  .map(raw => parseCanvasMarkdown(raw))
  .filter((p): p is ParsedCanvasPage => p !== null)
  .map(page => ({ route: page.route, page }))

const routes2: CanvasRoute[] = Object.entries(collectionFiles)
  .map(([path, raw]) => {
    // ../../../markdown/collections/dan-john/README.md -> /collections/dan-john
    const parts = path.split('/')
    const slug = parts[parts.length - 2]
    return parseCanvasMarkdown(raw, `/collections/${slug}`)
  })
  .filter((p): p is ParsedCanvasPage => p !== null)
  .map(page => ({ route: page.route, page }))

export const canvasRoutes: CanvasRoute[] = [...routes1, ...routes2]

/** Fast O(1)-ish lookup used in AppContent on every render. */
const routeMap = new Map<string, ParsedCanvasPage>(
  canvasRoutes.map(r => [r.route, r.page])
)

export function findCanvasPage(pathname: string): ParsedCanvasPage | null {
  return routeMap.get(pathname) ?? null
}
