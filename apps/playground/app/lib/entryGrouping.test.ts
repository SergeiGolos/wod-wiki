/**
 * entryGrouping — the `source` dimension (#playground-buckets).
 *
 * The WQL `by {source}` grouping buckets entries by their source plane
 * (journal / playground / feeds / collections) so mixed-content listings
 * can group by where a note lives, not just when it is dated.
 */
import { describe, expect, it } from 'bun:test'
import { parseQuery } from '@bitcobblers/wod-wiki-engine'
import type { Entry } from './entryMapper'
import { groupEntriesByDimension, parseGroupingDimensions } from './entryGrouping'
import { formatDateHeader } from './dateFormat'

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    kind: 'note',
    sourceCatalog: 'journal',
    sourceItem: id,
    title: id,
    date: null,
    ...overrides,
  } as Entry
}

describe('groupEntriesByDimension — source', () => {
  it('buckets entries by source plane with capitalized labels', () => {
    const groups = groupEntriesByDimension([
      entry('a', { sourceCatalog: 'journal' }),
      entry('b', { sourceCatalog: 'playground' }),
      entry('c', { sourceCatalog: 'playground' }),
      entry('d', { sourceCatalog: 'crossfit-girls' }),
    ], 'source')

    expect(groups.map(g => g.label)).toEqual(['Crossfit-girls', 'Journal', 'Playground'])
    const playground = groups.find(g => g.label === 'Playground')!
    expect(playground.entries.map(e => e.id)).toEqual(['b', 'c'])
    expect(playground.id).toBe('group-source-playground')
  })

  it('falls back to Other when an entry carries no source catalog', () => {
    const groups = groupEntriesByDimension([entry('x', { sourceCatalog: undefined })], 'source')
    expect(groups).toHaveLength(1)
    expect(groups[0]!.label).toBe('Other')
  })
})

describe('groupEntriesByDimension — ordered dimensions', () => {
  const dated = [
    entry('a', { date: '2026-09-04', sourceCatalog: 'journal' }),
    entry('b', { date: '2026-09-04', sourceCatalog: 'playground' }),
    entry('c', { date: '2026-08-15', sourceCatalog: 'journal' }),
  ]

  it('sub-divides each parent group by the following dimension, in order', () => {
    const groups = groupEntriesByDimension(dated, ['source', 'date'])
    // Parent label (source) / child label (localized date header); children
    // inherit the date dimension's descending order.
    expect(groups.map(g => g.label)).toEqual([
      `Journal / ${formatDateHeader('2026-09-04')}`,
      `Journal / ${formatDateHeader('2026-08-15')}`,
      `Playground / ${formatDateHeader('2026-09-04')}`,
    ])
    const composite = groups.find(g => g.label === `Journal / ${formatDateHeader('2026-09-04')}`)!
    expect(composite.entries.map(e => e.id)).toEqual(['a'])
    // Composite keys stay unique and stable for DOM ids and scroll links.
    expect(composite.id).toBe('group-source-journal--date-group-2026-09-04')
  })

  it('keeps a single dimension flat and falls back to the tag bucket off-vocabulary', () => {
    expect(groupEntriesByDimension(dated, ['date']).map(g => g.key)).toEqual([
      '2026-09-04',
      '2026-08-15',
    ])
    // Dimensions outside CONTENT_GROUPING_DIMENSIONS execute as the tag
    // bucket — these entries carry no tags, so all land in Untagged.
    const unknown = groupEntriesByDimension(dated, ['resistance'])
    expect(unknown.map(g => g.label)).toEqual(['Untagged'])
  })
})

describe('parseGroupingDimensions — ordered', () => {
  it('reads every ordered dimension from the AST, lowercased in order', () => {
    expect(
      parseGroupingDimensions('', parseQuery(':note{tags:pr} by {Discipline, week}')),
    ).toEqual(['discipline', 'week'])
  })

  it('parses the query string through the shared engine parser', () => {
    expect(parseGroupingDimensions(':note by {source, week}')).toEqual(['source', 'week'])
    expect(parseGroupingDimensions(':note by {tag}')).toEqual(['tag'])
  })

  it('is null for invalid queries and without grouping', () => {
    expect(parseGroupingDimensions(':note last 2w')).toBeNull()
    expect(parseGroupingDimensions('not a query')).toBeNull()
  })
})
