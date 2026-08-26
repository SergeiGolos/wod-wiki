import { describe, expect, it } from 'bun:test'

import { resolveContentOwners, sectionOwnsContent } from './canvasUtils'
import type { CanvasSection } from './parseCanvasMarkdown'

function makeSection(id: string, overrides: Partial<CanvasSection> = {}): CanvasSection {
  return {
    id,
    heading: id,
    level: 2,
    attrs: [],
    proseChunks: [],
    commands: [],
    buttons: [],
    ...overrides,
  }
}

describe('sectionOwnsContent', () => {
  it('is true for a section with examples', () => {
    expect(sectionOwnsContent(makeSection('a', { examples: [{ label: 'x', source: 'x.md' }] }))).toBe(true)
  })

  it('is true for a section with a command that has steps', () => {
    expect(sectionOwnsContent(makeSection('a', {
      commands: [{ target: 't', pipeline: [{ action: 'set-source', value: 'x.md' }] }],
    }))).toBe(true)
  })

  it('is false for a section with an empty command pipeline', () => {
    expect(sectionOwnsContent(makeSection('a', { commands: [{ target: 't', pipeline: [] }] }))).toBe(false)
  })

  it('is false for a plain narration section', () => {
    expect(sectionOwnsContent(makeSection('a'))).toBe(false)
  })
})

describe('resolveContentOwners', () => {
  it('maps narration-only sections to the nearest preceding owner — in document order', () => {
    // statement (no owner) -> plan/run/analytics (narrate statement) ->
    // metrics (owns) -> groups (narrates metrics)
    const statement = makeSection('statement')
    const plan = makeSection('plan')
    const run = makeSection('run')
    const analytics = makeSection('analytics')
    const metrics = makeSection('metrics', { examples: [{ label: 'Reps only', source: 'reps.md' }] })
    const groups = makeSection('groups')

    const owners = resolveContentOwners([statement, plan, run, analytics, metrics, groups])

    expect(owners.get('statement')).toBeNull()
    expect(owners.get('plan')).toBeNull()
    expect(owners.get('run')).toBeNull()
    expect(owners.get('analytics')).toBeNull()
    expect(owners.get('metrics')).toBe(metrics)
    expect(owners.get('groups')).toBe(metrics)
  })

  it('resolves the same owner regardless of which direction the sections are visited', () => {
    // This is the scroll-up regression: the owner for a given section id is a
    // pure function of the whole section list, not of visit order/history —
    // so walking the ids forward or backward must yield identical results.
    const timers = makeSection('timers', {
      commands: [{ target: 'demo', pipeline: [{ action: 'set-source', value: 'timer-1.md' }] }],
    })
    const groups = makeSection('groups', {
      commands: [{ target: 'demo', pipeline: [{ action: 'set-source', value: 'groups-1.md' }] }],
    })
    const protocols = makeSection('protocols', {
      commands: [{ target: 'demo', pipeline: [{ action: 'set-source', value: 'protocols-1.md' }] }],
    })
    const ownYourData = makeSection('own-your-data')

    const sections = [timers, groups, protocols, ownYourData]
    const owners = resolveContentOwners(sections)

    // Scrolling down: protocols owns itself, "own your data" narrates protocols.
    expect(owners.get('protocols')).toBe(protocols)
    expect(owners.get('own-your-data')).toBe(protocols)

    // Scrolling back up from "own your data" through protocols to groups to
    // timers must land on each section's own true owner — not get stuck on
    // whatever was previously applied while scrolling down.
    expect(owners.get('groups')).toBe(groups)
    expect(owners.get('timers')).toBe(timers)
  })

  it('returns null for every section when none of them own content', () => {
    const a = makeSection('a')
    const b = makeSection('b')
    const owners = resolveContentOwners([a, b])
    expect(owners.get('a')).toBeNull()
    expect(owners.get('b')).toBeNull()
  })
})
