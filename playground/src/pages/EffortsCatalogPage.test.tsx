/**
 * EffortsCatalogPage — /efforts behind the shared WqlComposer over the WQL
 * engine's effort plane.
 *
 * Asserts:
 *   1. The composer renders with the `source` head hidden (fixed at efforts);
 *      the listing comes from queryService.runFind's `efforts` result.
 *   2. Clause edits re-run the query and re-filter the visible listing.
 *   3. The empty state shows when nothing matches.
 *   4. Legacy params migrate: plain-text `?q=` becomes a text clause, and
 *      `?origin=&discipline=` become filter clauses (URL rewritten to WQL).
 */
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'
import { parseQuery } from '@/services/analytics/query/wql'
import type { IEffort } from '@/effort-registry'

// Mocks spread the real modules (imported statically above, before the
// mock.module calls) so unlisted exports stay real for every file sharing
// this bun process — partial mocks leak process-wide.

import * as realQuery from '@/services/analytics/query'

function makeEffort(overrides: Partial<IEffort> = {}): IEffort {
  return {
    id: 'e-1',
    slug: 'push-up',
    label: 'Push-Up',
    aliases: [],
    baseAttributes: { met: 3.8, discipline: 'strength', intensityTier: 'moderate' },
    registrySource: 'bundled',
    ...overrides,
  } as IEffort
}

const PUSH_UP = makeEffort()
const FRAN = makeEffort({ id: 'e-2', slug: 'fran', label: 'Fran', baseAttributes: { met: 11.5, discipline: 'gymnastics', intensityTier: 'high' } })

let runFindImpl: (parsed: { raw?: string }) => Promise<FindQueryResult>

mock.module('@/services/analytics/query', () => ({
  ...realQuery,
  queryService: {
    runFind: mock((parsed: { raw?: string }) => runFindImpl(parsed)),
    runQuery: mock(async () => ({ series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 }, matched: [] })),
  },
}))

import { EffortsCatalogPage } from './EffortsCatalogPage'

afterEach(cleanup)

const emptyResult = (raw: string): FindQueryResult => ({
  parsed: parseQuery(raw) as FindQueryResult['parsed'],
  notes: [],
  blocks: [],
  efforts: [],
  stages: { selected: 0, matched: 0 },
})

function renderPage(initialUrl: string) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <EffortsCatalogPage />
    </MemoryRouter>,
  )
}

describe('EffortsCatalogPage', () => {
  it('renders the composer with the source head hidden and lists registry efforts', async () => {
    runFindImpl = async parsed => ({ ...emptyResult(parsed.raw ?? ''), efforts: [PUSH_UP, FRAN] })
    renderPage('/efforts')

    expect(screen.getByTestId('wql-composer')).toBeDefined()
    expect(screen.queryByTestId('token-slot-source')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('effort-row-push-up')).toBeDefined())
    expect(screen.getByTestId('effort-row-fran')).toBeDefined()
    // The query runs against the effort plane.
    await waitFor(() => expect(screen.getByTestId('wql-summary-target').textContent).toContain('effort'))
  })

  it('re-filters the listing when a discipline clause is added', async () => {
    runFindImpl = async parsed => {
      const raw = parsed.raw ?? ''
      const rows = raw.includes('discipline:strength') ? [PUSH_UP] : [PUSH_UP, FRAN]
      return { ...emptyResult(raw), efforts: rows, stages: { selected: 2, matched: rows.length } }
    }
    renderPage('/efforts')
    await waitFor(() => expect(screen.getByTestId('effort-row-fran')).toBeDefined())

    // Type a full filter query into the free-text input and commit it.
    const input = screen.getByTestId('wql-composer-input')
    fireEvent.change(input, { target: { value: 'find:effort{discipline:strength} in all' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.queryByTestId('effort-row-fran')).toBeNull())
    expect(screen.getByTestId('effort-row-push-up')).toBeDefined()
  })

  it('shows the empty state when nothing matches', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage('/efforts')
    await waitFor(() => expect(screen.getByTestId('efforts-catalog-empty-state')).toBeDefined())
  })

  it('migrates a legacy plain-text q to a text clause', async () => {
    runFindImpl = async parsed => ({ ...emptyResult(parsed.raw ?? ''), efforts: [FRAN] })
    renderPage('/efforts?q=fran')

    await waitFor(() => expect(screen.getByTestId('token-slot-text').textContent).toContain('fran'))
    // …and the query re-runs with the text filter.
    await waitFor(() => expect(screen.getByTestId('effort-row-fran')).toBeDefined())
    // No rejection banner for a legacy text query.
    expect(screen.queryByTestId('efforts-query-error')).toBeNull()
  })

  it('migrates legacy origin/discipline params to filter clauses', async () => {
    const raws: string[] = []
    runFindImpl = async parsed => {
      raws.push(parsed.raw ?? '')
      return emptyResult(parsed.raw ?? '')
    }
    renderPage('/efforts?origin=user&discipline=strength')

    await waitFor(() => expect(screen.getByTestId('token-slot-origin').textContent).toContain('user'))
    expect(screen.getByTestId('token-slot-discipline').textContent).toContain('strength')
    // The URL was rewritten to composed WQL (history replace, legacy keys gone).
    await waitFor(() => expect(raws.some(r => r.includes('origin:user') && r.includes('discipline:strength'))).toBe(true))
  })

  it('banners a malformed WQL q instead of treating it as legacy text', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage(`/efforts?q=${encodeURIComponent('find:effort )))garbage((( ')}`)
    await waitFor(() => expect(screen.getByTestId('efforts-query-error')).toBeDefined())
  })
})
