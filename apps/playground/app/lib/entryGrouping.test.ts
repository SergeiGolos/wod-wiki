/**
 * entryGrouping — the `source` dimension (#playground-buckets).
 *
 * The WQL `by {source}` grouping buckets entries by their source plane
 * (journal / playground / feeds / collections) so mixed-content listings
 * can group by where a note lives, not just when it is dated.
 */
import { describe, expect, it } from 'bun:test'
import type { Entry } from './entryMapper'
import { groupEntriesByDimension } from './entryGrouping'

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
