/**
 * Canvas Routes — loads all wods/routes/**\/*.md files at build time via
 * import.meta.glob and parses them into typed `CanvasRoute` objects.
 *
 * Vite resolves the glob at compile time so the final bundle contains the
 * markdown content as inlined strings — no runtime file I/O is required.
 */

import { parseCanvasMarkdown, type ParsedCanvasPage } from './parseCanvasMarkdown'

// Path is relative to this file (playground/src/canvas/).
// ../../../wods/routes/ resolves to <repo-root>/wods/routes/
const routeFiles = import.meta.glob('../../../wods/routes/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export interface CanvasRoute {
  route: string
  page: ParsedCanvasPage
}

export const canvasRoutes: CanvasRoute[] = Object.values(routeFiles)
  .map(raw => parseCanvasMarkdown(raw))
  .filter((p): p is ParsedCanvasPage => p !== null)
  .map(page => ({ route: page.route, page }))

/** Fast O(1)-ish lookup used in AppContent on every render. */
const routeMap = new Map<string, ParsedCanvasPage>(
  canvasRoutes.map(r => [r.route, r.page])
)

export function findCanvasPage(pathname: string): ParsedCanvasPage | null {
  return routeMap.get(pathname) ?? null
}
