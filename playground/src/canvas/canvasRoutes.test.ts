import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'

import { ROUTE_PATTERNS } from '../lib/routes'
import { parseCanvasMarkdown } from './parseCanvasMarkdown'

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const homeMarkdown = readFileSync(new URL('../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const homePage = parseCanvasMarkdown(homeMarkdown)

describe('home route governance', () => {
  it('keeps / owned by the playground redirect route', () => {
    expect(ROUTE_PATTERNS.home).toBe('/')
    expect(appSource).toMatch(
      /<Route\s+path=\{ROUTE_PATTERNS\.home\}[\s\S]*?<PlaygroundRedirect template="home"\s*\/>/,
    )
  })

  it('moves the editorial home canvas off the root route onto /tour', () => {
    expect(homePage).not.toBeNull()
    expect(homePage?.route).toBe('/tour')
    expect(homePage?.route).not.toBe(ROUTE_PATTERNS.home)
  })
})
