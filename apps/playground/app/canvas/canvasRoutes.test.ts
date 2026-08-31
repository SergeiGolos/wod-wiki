import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'

import { ROUTE_PATTERNS } from '../lib/routes'
import { findRouteIn, normalizePathname } from './canvasRouteLookup'
import { parseCanvasMarkdown } from './parseCanvasMarkdown'

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const homeMarkdown = readFileSync(new URL('../../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const homePage = parseCanvasMarkdown(homeMarkdown)

describe('home route governance', () => {
  it('keeps / owned by the canvas home page', () => {
    expect(ROUTE_PATTERNS.home).toBe('/')
    // The root route should NOT have a hardcoded React component —
    // it flows through the dynamic canvasRoutes generated from markdown.
    expect(appSource).not.toMatch(
      /<Route\s+path=\{ROUTE_PATTERNS\.home\}[\s\S]*?Concept3LandingPage/,
    )
  })

  it('places the editorial home canvas on the root route', () => {
    expect(homePage).not.toBeNull()
    expect(homePage?.route).toBe('/')
    expect(homePage?.route).toBe(ROUTE_PATTERNS.home)
  })
})

describe('canvas route normalization (#1005)', () => {
  it('normalizes pathnames correctly', () => {
    expect(normalizePathname('/guide/syntax/basics/')).toBe('/guide/syntax/basics')
    expect(normalizePathname('/guide/syntax/basics')).toBe('/guide/syntax/basics')
    expect(normalizePathname(' //guide/syntax/basics// ')).toBe('/guide/syntax/basics')
    expect(normalizePathname('/')).toBe('/')
    expect(normalizePathname('')).toBe('/')
  })

  it('resolves trailing-slash guide routes to the lesson page', () => {
    const basics = { route: '/guide/syntax/basics', page: { route: '/guide/syntax/basics' } }
    const behaviors = { route: '/guide/behaviors', page: { route: '/guide/behaviors' } }
    const routes = [basics, behaviors]

    const withSlash = findRouteIn(routes, '/guide/syntax/basics/')
    const withoutSlash = findRouteIn(routes, '/guide/syntax/basics')
    expect(withSlash).not.toBeNull()
    expect(withSlash).toBe(basics.page)
    expect(withSlash).toBe(withoutSlash)

    expect(findRouteIn(routes, '/guide/behaviors/')).toBe(behaviors.page)
    expect(findRouteIn(routes, '/guide/missing')).toBeNull()
  })
})
