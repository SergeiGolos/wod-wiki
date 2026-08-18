/**
 * useExplorerQueryState — URL ↔ composer clause state with run-on-submit
 * (issue #839).
 *
 * Asserts:
 *   1. No params → explorer defaults (metrics plane, seeded agg and metric —
 *      a valid `sum:totalVolume` draft, issue #897), nothing submitted, weeks 16.
 *   2. `?q=<wql>` hydrates clauses and the submitted snapshot on mount.
 *   3. setClauses serializes the composed WQL into `q` (history push).
 *   4. Draft edits never touch `submitted` (run-on-submit); submit() snaps
 *      the draft without moving the URL.
 *   5. Browser back/forward restores the exact composer state and re-submits
 *      what it restored (legacy behavior).
 *   6. setWeeks writes `?weeks=` with history replace (no phantom back entry)
 *      and preserves `q`; invalid weeks values fall back to 16.
 *   7. A still-empty clause survives setClauses (no URL push, no clobber).
 */
import { afterEach, describe, expect, it } from 'bun:test'

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../tests/helpers/repair-react-router-dom'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import {
  useExplorerQueryState,
  defaultExplorerClauses,
  type ExplorerQueryState,
} from './useExplorerQueryState'
import type { QueryClause } from '@bitcobblers/wod-wiki-ui'

afterEach(cleanup)

let captured: ExplorerQueryState
let capturedNavigate: ReturnType<typeof useNavigate>

function Probe() {
  captured = useExplorerQueryState()
  capturedNavigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <output data-testid="clauses">
        {captured.clauses.map(c => `${c.type}=${c.value}`).join('|')}
      </output>
      <output data-testid="search">{location.search}</output>
      <output data-testid="pathname">{location.pathname}</output>
      <output data-testid="draft">{captured.draft}</output>
      <output data-testid="submitted">{captured.submitted}</output>
      <output data-testid="weeks">{captured.weeks}</output>
    </div>
  )
}

function renderAt(entries: string[], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <Probe />
    </MemoryRouter>,
  )
}

const summary = () => screen.getByTestId('clauses').textContent
const search = () => screen.getByTestId('search').textContent ?? ''
const qParam = () => new URLSearchParams(search()).get('q') ?? ''
const submitted = () => screen.getByTestId('submitted').textContent ?? ''
const weeks = () => screen.getByTestId('weeks').textContent ?? ''

const AGG = 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)'

const withMetric = (metric: string): QueryClause[] =>
  defaultExplorerClauses().map(c => (c.type === 'metric' ? { ...c, value: metric } : c))

describe('useExplorerQueryState', () => {
  it('falls back to explorer defaults when no params are present', () => {
    renderAt(['/analytics/explorer'])
    expect(summary()).toBe('source=metrics|agg=sum|metric=totalVolume')
    expect(submitted()).toBe('')
    expect(weeks()).toBe('16')
  })

  it('hydrates clauses and the submitted snapshot from the q parameter on mount', () => {
    renderAt([`/analytics/explorer?q=${encodeURIComponent(AGG)}`])
    expect(summary()).toBe('source=metrics|agg=sum|metric=totalVolume|discipline=strength|groupby=week|rollup=1w')
    expect(submitted()).toBe(AGG)
  })

  it('serializes clause changes into the q parameter', async () => {
    renderAt(['/analytics/explorer'])
    act(() => captured.setClauses(withMetric('tis')))
    await waitFor(() => expect(qParam()).toBe('sum:tis'))
  })

  it('keeps submitted untouched while editing; submit() snaps the current draft', async () => {
    renderAt(['/analytics/explorer'])
    act(() => captured.setClauses(withMetric('tis')))
    await waitFor(() => expect(qParam()).toBe('sum:tis'))
    // Editing the draft must not run anything.
    expect(submitted()).toBe('')

    const searchBefore = search()
    act(() => captured.submit())
    expect(submitted()).toBe('sum:tis')
    // Submitting is not a navigation.
    expect(search()).toBe(searchBefore)
  })

  it('submit(wql) snaps an explicit query (sidebar / examples path)', async () => {
    renderAt(['/analytics/explorer'])
    const next = withMetric('sessionLoad')
    act(() => {
      captured.setClauses(next)
      captured.submit('sum:sessionLoad')
    })
    await waitFor(() => expect(qParam()).toBe('sum:sessionLoad'))
    expect(submitted()).toBe('sum:sessionLoad')
  })

  it('restores the exact composer state on browser back/forward and re-submits it', async () => {
    renderAt(['/analytics/explorer'])

    // State A must differ from the seeded default (`sum:totalVolume`) — an
    // edit to the default's own WQL is a no-op and pushes no history entry.
    act(() => {
      captured.setClauses(withMetric('sessionLoad'))
      captured.submit('sum:sessionLoad')
    })
    await waitFor(() => expect(qParam()).toBe('sum:sessionLoad'))
    const stateA = 'source=metrics|agg=sum|metric=sessionLoad'

    act(() => captured.setClauses(withMetric('tis')))
    await waitFor(() => expect(qParam()).toBe('sum:tis'))
    const stateB = 'source=metrics|agg=sum|metric=tis'
    expect(summary()).toBe(stateB)
    // The edit did not submit: the run snapshot is still A.
    expect(submitted()).toBe('sum:sessionLoad')

    act(() => capturedNavigate(-1))
    await waitFor(() => expect(summary()).toBe(stateA))
    // Popstate re-submits the restored query (legacy behavior).
    await waitFor(() => expect(submitted()).toBe('sum:sessionLoad'))

    act(() => capturedNavigate(1))
    await waitFor(() => expect(summary()).toBe(stateB))
    await waitFor(() => expect(submitted()).toBe('sum:tis'))
  })

  it('setWeeks writes ?weeks= with history replace, preserving q', async () => {
    renderAt(['/elsewhere', `/analytics/explorer?q=${encodeURIComponent(AGG)}`], 1)

    act(() => captured.setWeeks(8))
    await waitFor(() => expect(weeks()).toBe('8'))
    expect(qParam()).toBe(AGG)

    // Replace semantics: back leaves the page instead of undoing the range change.
    act(() => capturedNavigate(-1))
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/elsewhere'))
  })

  it('parses weeks from the URL and falls back to 16 for invalid values', () => {
    renderAt(['/analytics/explorer?weeks=4'])
    expect(weeks()).toBe('4')
    cleanup()
    renderAt(['/analytics/explorer?weeks=7'])
    expect(weeks()).toBe('16')
  })

  it('keeps a still-empty clause without pushing a history entry', async () => {
    renderAt(['/analytics/explorer'])
    const searchBefore = search()

    act(() =>
      captured.setClauses([
        ...defaultExplorerClauses(),
        { id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: '' },
      ]),
    )

    expect(summary()).toBe('source=metrics|agg=sum|metric=totalVolume|tag=')
    await act(async () => {})
    expect(search()).toBe(searchBefore)
  })
})
