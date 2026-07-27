import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'

import { ROUTE_PATTERNS } from '../lib/routes'
import { parseCanvasMarkdown } from './parseCanvasMarkdown'

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const homeMarkdown = readFileSync(new URL('../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
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
