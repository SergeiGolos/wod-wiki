/**
 * wqlSearchSource — WQL-driven sources for the global Search Palette
 * (issue #834, decision #828).
 *
 * Asserts:
 *   1. Invalid (mid-edit) WQL yields no rows and never executes a query.
 *   2. find:note results map to entry palette items (kind → category).
 *   3. A text filter also runs a find:block body search, deduped by note.
 *   4. find:block hits map to entries via the synthesized note.
 *   5. paletteTextFromWql extracts text terms (valid + salvaged invalid).
 *   6. withWqlText delegates with the extracted text, never raw WQL.
 *   7. searchPaletteClauses compiles to the unbounded global default.
 */
import { describe, expect, it, mock } from 'bun:test'

import * as realQuery from '@/services/analytics/query'
import { parseQuery } from '@/services/analytics/query/wql'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'
import type { BlockIndexRow, Note } from '@/types/storage'
import type { Entry } from '../lib/entryMapper'

// ── Service mock (spread real module so unlisted exports stay real) ─────────

let runFindCalls: Array<{ raw?: string; target?: string }>
let runFindImpl: (parsed: { raw?: string; target?: string }) => Promise<FindQueryResult>

mock.module('@/services/analytics/query', () => ({
  ...realQuery,
  queryService: {
    runFind: mock((parsed: { raw?: string; target?: string }) => {
      runFindCalls.push(parsed)
      return runFindImpl(parsed)
    }),
  },
}))

import { clausesToWql } from '@/components/organisms/wql-composer'
import {
  wqlSearchSource,
  paletteTextFromWql,
  withWqlText,
  searchPaletteClauses,
  navigatePaletteResult,
} from './wqlSearchSource'
import type { PaletteDataSource } from '@/components/organisms/command-palette/palette-types'

const JOURNAL_NOTE: Note = {
  id: 'journal/2026-07-30',
  title: 'Heavy Fran',
  createdAt: Date.parse('2026-07-30T10:00:00Z'),
  type: 'note',
} as Note

const STATIC_BLOCK: BlockIndexRow = {
  id: 'girl-wods/fran:s1:1',
  noteId: 'girl-wods/fran',
  segmentId: 's1',
  segmentVersion: 1,
  dataType: 'wod',
  rawContent: '21-15-9 Thrusters and Pull-ups',
  noteTitle: 'Fran',
  createdAt: Date.parse('2026-01-01T00:00:00Z'),
  isStatic: true,
  sourceId: 'collection:girl-wods',
}

const emptyResult = (raw: string): FindQueryResult => ({
  parsed: parseQuery(raw) as FindQueryResult['parsed'],
  notes: [],
  blocks: [],
  stages: { selected: 0, matched: 0 },
})

function setup(impl: (parsed: { raw?: string; target?: string }) => Promise<FindQueryResult>) {
  runFindCalls = []
  runFindImpl = impl
}

describe('wqlSearchSource', () => {
  it('returns no rows for invalid WQL and never executes', async () => {
    setup(async parsed => emptyResult(parsed.raw ?? ''))
    // Multi-word text is a reachable composer state that fails the grammar.
    const results = await wqlSearchSource().search('find:note{text:hello world} in all')
    expect(results).toEqual([])
    expect(runFindCalls).toEqual([])
  })

  it('maps find:note results to journal entry items', async () => {
    setup(async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      result.notes = [JOURNAL_NOTE]
      return result
    })
    const results = await wqlSearchSource().search('find:note in journal')

    expect(results).toHaveLength(1)
    const item = results[0]!
    expect(item.id).toBe('entry:journal/2026-07-30')
    expect(item.label).toBe('Heavy Fran')
    expect(item.category).toBe('Journal')
    expect(item.type).toBe('entry')
    const entry = item.payload as Entry
    expect(entry.kind).toBe('note')
    expect(entry.sourceItem).toBe('journal/2026-07-30')
  })

  it('runs a secondary find:block body search for text filters, deduped by note', async () => {
    setup(async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      if ((parsed.raw ?? '').startsWith('find:block')) {
        // Body-text hit for the note the primary query already returned.
        result.blocks = [{ ...STATIC_BLOCK, noteId: JOURNAL_NOTE.id, noteTitle: JOURNAL_NOTE.title, sourceId: undefined }]
      } else {
        result.notes = [JOURNAL_NOTE]
      }
      return result
    })
    const results = await wqlSearchSource().search('find:note{text:fran} in all')

    expect(runFindCalls.map(c => c.raw)).toEqual([
      'find:note{text:fran} in all',
      'find:block{text:fran} in all',
    ])
    // The block hit dedupes into the note the primary query returned.
    expect(results.map(r => r.id)).toEqual(['entry:journal/2026-07-30'])
  })

  it('maps find:block hits to session entries via the synthesized note', async () => {
    setup(async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      result.blocks = [STATIC_BLOCK]
      return result
    })
    const results = await wqlSearchSource().search('find:block{type:wod} in collections')

    expect(results).toHaveLength(1)
    const item = results[0]!
    expect(item.id).toBe('entry:girl-wods/fran')
    expect(item.label).toBe('Fran')
    expect(item.category).toBe('Collections')
    const entry = item.payload as Entry
    expect(entry.kind).toBe('session')
    expect(entry.sourceCatalog).toBe('girl-wods')
  })
})

describe('paletteTextFromWql', () => {
  it('extracts text filter values from valid queries', () => {
    expect(paletteTextFromWql('find:note{text:fran, tags:girl} in all')).toBe('fran')
  })

  it('returns an empty string when the query has no text filter', () => {
    expect(paletteTextFromWql('find:note in all')).toBe('')
  })

  it('salvages typed words from invalid (mid-edit) WQL', () => {
    expect(paletteTextFromWql('find:note{text:hello world} in all')).toBe('hello world')
  })
})

describe('withWqlText', () => {
  it('delegates with the extracted text, never raw WQL', async () => {
    const seen: string[] = []
    const inner: PaletteDataSource = {
      id: 'inner',
      search: (q) => {
        seen.push(q)
        return [{ id: 'x', label: 'X' }]
      },
    }
    const adapted = withWqlText(inner)
    const results = await adapted.search('find:note{text:fran} in all')

    expect(seen).toEqual(['fran'])
    expect(results).toHaveLength(1)
    expect(adapted.label).toBe(inner.label)
  })
})

describe('navigatePaletteResult', () => {
  it('navigates route items to their route', () => {
    const visited: string[] = []
    navigatePaletteResult(
      { id: 'construct:amrap', label: 'AMRAP', type: 'route', payload: { route: '/reference/amrap' } },
      to => visited.push(to),
    )
    expect(visited).toEqual(['/reference/amrap'])
  })

  it('navigates entry items to the entry deep-link', () => {
    const visited: string[] = []
    const entry = {
      id: 'girl-wods/fran',
      kind: 'session',
      sourceCatalog: 'girl-wods',
      sourceItem: 'fran',
      title: 'Fran',
      date: null,
    } satisfies Entry
    navigatePaletteResult(
      { id: 'entry:girl-wods/fran', label: 'Fran', type: 'entry', payload: entry },
      to => visited.push(to),
    )
    expect(visited).toEqual(['/collections/girl-wods/fran'])
  })

  it('ignores item types the global palette does not produce', () => {
    const visited: string[] = []
    navigatePaletteResult({ id: 'x', label: 'X', type: 'action' }, to => visited.push(to))
    expect(visited).toEqual([])
  })
})

describe('searchPaletteClauses', () => {
  it('compiles to the unbounded global default (source notes / all / no time window)', () => {
    const clauses = searchPaletteClauses()
    expect(clauses.map(c => [c.type, c.value])).toEqual([
      ['source', 'notes'],
      ['time', 'all'],
    ])
    expect(clausesToWql(clauses)).toBe('find:note in all')
  })
})
