/**
 * Canvas Routes — derived from the seeded corpus
 * (docs/prototypes/seed-data-unification.md § Module 3).
 *
 * Canvas pages (markdown/canvas/**) and collection READMEs (one level deep,
 * markdown/collections/<dir>/README.md) are parsed from the seed-content file
 * map into typed CanvasRoute objects. The derivation is pure; the
 * `useCanvasRoutes()` hook binds it to the reactive seed-content snapshot,
 * so routes appear once the seed lands and refresh when a newer seed is
 * imported (BroadcastChannel('wodwiki.seed')).
 */

import { useMemo } from 'react'
import { parseCanvasMarkdown, type ParsedCanvasPage } from './parseCanvasMarkdown'
import { normalizePathname } from './canvasRouteLookup'
import { useSeedContent, type SeedContentFiles } from '@/services/content/seedContent'
export { getSectionProse } from './parseCanvasMarkdown'
export { normalizePathname } from './canvasRouteLookup'

export interface CanvasRoute {
  route: string
  page: ParsedCanvasPage
}

/** Pure derivation over the seeded corpus (canvas pages + collection READMEs). */
export function buildCanvasRoutes(files: SeedContentFiles): CanvasRoute[] {
  const canvas: CanvasRoute[] = []
  const collectionReadmes: CanvasRoute[] = []
  for (const [path, raw] of Object.entries(files)) {
    const canvasMatch = path.match(/^markdown\/canvas\/(.+\.md)$/)
    if (canvasMatch) {
      const page = parseCanvasMarkdown(raw)
      if (page) canvas.push({ route: page.route, page })
      continue
    }
    const readmeMatch = path.match(/^markdown\/collections\/([^/]+)\/README\.md$/)
    if (readmeMatch) {
      // markdown/collections/dan-john/README.md -> /collections/dan-john
      const page = parseCanvasMarkdown(raw, `/collections/${readmeMatch[1]}`)
      if (page) collectionReadmes.push({ route: page.route, page })
    }
  }
  return [...canvas, ...collectionReadmes]
}

/** Pure lookup over a route list — normalized keys (#1005). */
export function findCanvasPageIn(routes: CanvasRoute[], pathname: string): ParsedCanvasPage | null {
  for (const r of routes) {
    if (normalizePathname(r.route) === normalizePathname(pathname)) return r.page
  }
  return null
}

/** Reactive route table — empty until the seeded corpus lands. */
export function useCanvasRoutes(): CanvasRoute[] {
  const files = useSeedContent()
  return useMemo(() => (files ? buildCanvasRoutes(files) : []), [files])
}

/** Reactive page lookup for a pathname — null until the corpus lands. */
export function useFindCanvasPage(pathname: string): ParsedCanvasPage | null {
  const routes = useCanvasRoutes()
  return useMemo(() => findCanvasPageIn(routes, pathname), [routes, pathname])
}
