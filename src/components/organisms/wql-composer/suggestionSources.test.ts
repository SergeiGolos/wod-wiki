/**
 * Suggestion sources — dynamic typeahead bindings for composer slots (#831).
 *
 * Asserts:
 *   1. Pure derivations over block-index rows: frontmatter tags, catalog ids
 *      (feeds/ wrapper stripped, static rows only), and distinct dataTypes.
 *   2. The discipline binding emits lowercase canonical values with
 *      title-cased labels (prototype's capitalized-emission bug fixed).
 *   3. Cache policies: 'static' loads once; { ttlMs } reloads only after
 *      invalidation/expiry; in-flight loads are shared.
 *   4. setSuggestionBinding overrides a slot's source (tests, page-provided
 *      data); unknown slot types load as empty.
 *   5. Tag binding merges user tags (IndexedDB) with static-corpus tags,
 *      deduplicated case-insensitively.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { BlockIndexRow } from '@/types/storage'
import { EFFORT_DISCIPLINES } from '@/effort-registry/disciplines'

import {
  SUGGESTION_BINDINGS,
  blockTypesFromBlocks,
  catalogIdsFromBlocks,
  invalidateSuggestions,
  loadSuggestions,
  mergeTagSuggestions,
  setSuggestionBinding,
  tagsFromStaticBlocks,
  type SuggestionBinding,
  type SuggestionItem,
} from './suggestionSources'

function blockRow(patch: Partial<BlockIndexRow>): BlockIndexRow {
  return {
    id: 'x',
    noteId: 'catalog/note',
    segmentId: 's',
    segmentVersion: 1,
    dataType: 'markdown',
    rawContent: '',
    noteTitle: 'Note',
    createdAt: 0,
    isStatic: true,
    ...patch,
  }
}

afterEach(() => {
  invalidateSuggestions()
})

describe('pure block-index derivations', () => {
  it('extracts tags from frontmatter rows, deduplicated and sorted', () => {
    const blocks = [
      blockRow({ dataType: 'frontmatter', rawContent: 'tags:\n  - swimming\n  - endurance' }),
      blockRow({ dataType: 'frontmatter', rawContent: 'tags: [swimming, PR]' }),
      blockRow({ dataType: 'frontmatter', rawContent: 'met: 7.0' }),
      blockRow({ dataType: 'markdown', rawContent: 'tags: not-frontmatter' }),
    ]
    expect(tagsFromStaticBlocks(blocks)).toEqual(['PR', 'endurance', 'swimming'])
  })

  it('derives catalog ids from the first path segment, stripping the feeds/ wrapper', () => {
    const blocks = [
      blockRow({ noteId: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran' }),
      blockRow({ noteId: 'feeds/crossfit-programming/2024-01-01/wod', sourceId: 'feed:crossfit-programming/x' }),
      blockRow({ noteId: 'crossfit-girls/annie', sourceId: 'collection:crossfit-girls/annie' }),
    ]
    expect(catalogIdsFromBlocks(blocks)).toEqual(['crossfit-girls', 'crossfit-programming'])
  })

  it('skips non-static rows when deriving catalogs (user notes carry no catalog)', () => {
    const blocks = [
      blockRow({ noteId: 'user-uuid-1234', isStatic: false, sourceId: undefined }),
      blockRow({ noteId: 'dan-john-40-day/day-1', sourceId: 'collection:dan-john-40-day/day-1' }),
    ]
    expect(catalogIdsFromBlocks(blocks)).toEqual(['dan-john-40-day'])
  })

  it('derives block types from distinct dataTypes across indexes', () => {
    const blocks = [
      blockRow({ dataType: 'wod' }),
      blockRow({ dataType: 'frontmatter' }),
      blockRow({ dataType: 'wod' }),
      blockRow({ dataType: 'h2' }),
    ]
    expect(blockTypesFromBlocks(blocks)).toEqual(['frontmatter', 'h2', 'wod'])
  })
})

describe('discipline binding', () => {
  it('emits lowercase canonical values with title-cased labels', async () => {
    invalidateSuggestions('discipline')
    const items = await loadSuggestions('discipline')
    expect(items.map(i => i.value)).toEqual([...EFFORT_DISCIPLINES])
    for (const item of items) {
      expect(item.value).toBe(item.value.toLowerCase())
      expect(item.label).toBe(item.value[0]!.toUpperCase() + item.value.slice(1))
    }
  })
})

describe('cache policies', () => {
  it('static bindings load exactly once', async () => {
    const load = mock(async (): Promise<SuggestionItem[]> => [{ value: 'a' }])
    setSuggestionBinding('cache-static', { load, cache: 'static', open: false, emptyText: 'none' })
    await loadSuggestions('cache-static')
    await loadSuggestions('cache-static')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('ttl bindings serve from cache until invalidated', async () => {
    let n = 0
    setSuggestionBinding('cache-ttl', {
      load: async () => [{ value: `v${++n}` }],
      cache: { ttlMs: 60_000 },
      open: false,
      emptyText: 'none',
    })
    const first = await loadSuggestions('cache-ttl')
    const second = await loadSuggestions('cache-ttl')
    expect(second).toBe(first)
    invalidateSuggestions('cache-ttl')
    const third = await loadSuggestions('cache-ttl')
    expect(third[0]!.value).toBe('v2')
  })

  it('shares an in-flight load across concurrent callers', async () => {
    let resolveLoad!: (items: SuggestionItem[]) => void
    const load = mock(() => new Promise<SuggestionItem[]>(res => { resolveLoad = res }))
    setSuggestionBinding('cache-inflight', { load, cache: 'static', open: false, emptyText: 'none' })
    const a = loadSuggestions('cache-inflight')
    const b = loadSuggestions('cache-inflight')
    resolveLoad([{ value: 'x' }])
    expect(await a).toEqual(await b)
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('binding registry', () => {
  it('loads an empty list for unknown slot types', async () => {
    expect(await loadSuggestions('no-such-slot')).toEqual([])
  })

  it('overrides a built-in binding via setSuggestionBinding', async () => {
    const custom: SuggestionBinding = {
      load: async () => [{ value: 'custom-tag', label: 'Custom Tag' }],
      cache: 'static',
      open: true,
      emptyText: 'nothing',
    }
    setSuggestionBinding('tag', custom)
    const items = await loadSuggestions('tag')
    expect(items).toEqual([{ value: 'custom-tag', label: 'Custom Tag' }])
    setSuggestionBinding('tag', undefined)
    expect(SUGGESTION_BINDINGS.tag).toBeDefined()
  })

  it('declares every dynamic slot with an open flag and empty-state copy', () => {
    for (const type of ['tag', 'effort', 'discipline', 'catalog', 'type', 'has']) {
      const binding = SUGGESTION_BINDINGS[type]
      expect(binding, `binding for ${type}`).toBeDefined()
      expect(typeof binding.open).toBe('boolean')
      expect(binding.emptyText.length).toBeGreaterThan(0)
    }
  })

  it('merges user tags with static-corpus tags, deduplicated case-insensitively (user wins)', () => {
    expect(mergeTagSuggestions(['PR', 'Mobility'], ['pr', 'swimming'])).toEqual(['Mobility', 'PR', 'swimming'])
  })
})
