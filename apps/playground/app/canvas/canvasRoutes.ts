/**
 * Canvas Routes — loads markdown canvas and collection files at build time
 * via import.meta.glob and parses them into typed CanvasRoute objects.
 *
 * Vite resolves the glob at compile time so the final bundle contains the
 * markdown content as inlined strings — no runtime file I/O is required.
 *
 * @updated WOD-712 home page content fix
 */

import { parseCanvasMarkdown, type ParsedCanvasPage } from './parseCanvasMarkdown'
export { getSectionProse } from './parseCanvasMarkdown'

// Routes from markdown/canvas/**/*.md (explicit routes)
let routeFiles: Record<string, string> = {}
let collectionFiles: Record<string, string> = {}

if (typeof import.meta !== 'undefined' && typeof (import.meta as any).glob === 'function') {
  routeFiles = (import.meta as any).glob('../../../../markdown/canvas/**/*.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  })
  collectionFiles = (import.meta as any).glob('../../../../markdown/collections/**/README.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  })
} else {
  // Fallback for node / bun test runner where Vite import.meta.glob is not executed
  try {
    const fs = require('fs')
    const path = require('path')
    const rootDir = path.resolve(__dirname, '../../../../markdown')

    const findMdFiles = (dir: string): string[] => {
      let results: string[] = []
      const list = fs.readdirSync(dir)
      list.forEach((file: string) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat && stat.isDirectory()) {
          results = results.concat(findMdFiles(fullPath))
        } else if (fullPath.endsWith('.md')) {
          results.push(fullPath)
        }
      })
      return results
    }

    const canvasDir = path.join(rootDir, 'canvas')
    if (fs.existsSync(canvasDir)) {
      findMdFiles(canvasDir).forEach((filePath: string) => {
        routeFiles[filePath] = fs.readFileSync(filePath, 'utf8')
      })
    }

    const collectionsDir = path.join(rootDir, 'collections')
    if (fs.existsSync(collectionsDir)) {
      findMdFiles(collectionsDir).filter((p: string) => p.endsWith('README.md')).forEach((filePath: string) => {
        routeFiles[filePath] = fs.readFileSync(filePath, 'utf8')
      })
    }
  } catch (_e) {
    // Ignore fallback errors if running in browser without glob
  }
}

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

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/'
  let normalized = pathname.trim()
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  normalized = normalized.replace(/\/+/g, '/')
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

/** Fast O(1)-ish lookup used in AppContent on every render. */
const routeMap = new Map<string, ParsedCanvasPage>(
  canvasRoutes.map(r => [normalizePathname(r.route), r.page])
)

export function findCanvasPage(pathname: string): ParsedCanvasPage | null {
  return routeMap.get(normalizePathname(pathname)) ?? null
}
