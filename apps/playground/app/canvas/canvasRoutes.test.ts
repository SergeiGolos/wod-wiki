import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'

import { ROUTE_PATTERNS } from '../lib/routes'
import { canvasRoutes, findCanvasPage, normalizePathname } from './canvasRoutes'
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

describe('findCanvasPage route normalization', () => {
  it('normalizes pathnames correctly', () => {
    expect(normalizePathname('/guide/syntax/basics/')).toBe('/guide/syntax/basics')
    expect(normalizePathname('/guide/syntax/basics')).toBe('/guide/syntax/basics')
    expect(normalizePathname(' //guide/syntax/basics// ')).toBe('/guide/syntax/basics')
    expect(normalizePathname('/')).toBe('/')
    expect(normalizePathname('')).toBe('/')
  })

  it('resolves trailing-slash guide routes to the lesson page', () => {
    const basicsPageWithSlash = findCanvasPage('/guide/syntax/basics/')
    const basicsPageNoSlash = findCanvasPage('/guide/syntax/basics')
    expect(basicsPageWithSlash).not.toBeNull()
    expect(basicsPageWithSlash?.route).toBe('/guide/syntax/basics')
    expect(basicsPageWithSlash).toEqual(basicsPageNoSlash)

    const behaviorsPage = findCanvasPage('/guide/behaviors/')
    expect(behaviorsPage).not.toBeNull()
    expect(behaviorsPage?.route).toBe('/guide/behaviors')
  })
})
