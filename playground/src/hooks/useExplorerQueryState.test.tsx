/**
 * useExplorerQueryState — URL ↔ WQL string state for the Analytics Explorer
 * route (string-state rework, wayfinder ticket 013).
 *
 * Asserts: defaults land, q hydrates draft + submitted, edits push q,
 * submit() is not navigation, back/forward restores and re-submits, weeks
 * round-trips with replace semantics, no-op edits never touch the URL.
 */

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../../tests/helpers/repair-react-router-dom'

import { afterEach, describe, expect, it } from 'bun:test'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import {
  useExplorerQueryState,
  DEFAULT_EXPLORER_QUERY,
  type ExplorerQueryState,
} from './useExplorerQueryState'

afterEach(cleanup)

let captured: ExplorerQueryState
let capturedNavigate: ReturnType<typeof useNavigate>

function Probe() {
  captured = useExplorerQueryState()
  capturedNavigate = useNavigate()
  const location = useLocation()
  return (
    <div>
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

const draft = () => screen.getByTestId('draft').textContent
const search = () => screen.getByTestId('search').textContent ?? ''
const qParam = () => new URLSearchParams(search()).get('q') ?? ''
const submitted = () => screen.getByTestId('submitted').textContent ?? ''
const weeks = () => screen.getByTestId('weeks').textContent ?? ''

const AGG = 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)'

describe('useExplorerQueryState', () => {
  it('falls back to explorer defaults when no params are present', () => {
    renderAt(['/analytics/explorer'])
    expect(draft()).toBe(DEFAULT_EXPLORER_QUERY)
    expect(submitted()).toBe('')
    expect(weeks()).toBe('16')
  })

  it('hydrates the draft and the submitted snapshot from the q parameter on mount', () => {
    renderAt([`/analytics/explorer?q=${encodeURIComponent(AGG)}`])
    expect(draft()).toBe(AGG)
    expect(submitted()).toBe(AGG)
  })

  it('serializes draft edits into the q parameter', async () => {
    renderAt(['/analytics/explorer'])
    act(() => captured.setDraft('sum:tis{}'))
    await waitFor(() => expect(qParam()).toBe('sum:tis{}'))
  })

  it('keeps submitted untouched while editing; submit() snaps the current draft', async () => {
    renderAt(['/analytics/explorer'])
    act(() => captured.setDraft('sum:tis{}'))
    await waitFor(() => expect(qParam()).toBe('sum:tis{}'))
    // Editing the draft must not run anything.
    expect(submitted()).toBe('')

    const searchBefore = search()
    act(() => captured.submit())
    expect(submitted()).toBe('sum:tis{}')
    // Submitting is not a navigation.
    expect(search()).toBe(searchBefore)
  })

  it('submit(wql) snaps an explicit query (sidebar / examples path)', async () => {
    renderAt(['/analytics/explorer'])
    act(() => {
      captured.setDraft('sum:sessionLoad{}')
      captured.submit('sum:sessionLoad{}')
    })
    await waitFor(() => expect(qParam()).toBe('sum:sessionLoad{}'))
    expect(submitted()).toBe('sum:sessionLoad{}')
  })

  it('restores the exact query state on browser back/forward and re-submits it', async () => {
    renderAt(['/analytics/explorer'])

    // State A must differ from the seeded default — an edit to the default's
    // own WQL is a no-op and pushes no history entry.
    act(() => {
      captured.setDraft('sum:sessionLoad{}')
      captured.submit('sum:sessionLoad{}')
    })
    await waitFor(() => expect(qParam()).toBe('sum:sessionLoad{}'))

    act(() => captured.setDraft('sum:tis{}'))
    await waitFor(() => expect(qParam()).toBe('sum:tis{}'))
    expect(draft()).toBe('sum:tis{}')
    // The edit did not submit: the run snapshot is still A.
    expect(submitted()).toBe('sum:sessionLoad{}')

    act(() => capturedNavigate(-1))
    await waitFor(() => expect(draft()).toBe('sum:sessionLoad{}'))
    // Popstate re-submits the restored query (legacy behavior).
    await waitFor(() => expect(submitted()).toBe('sum:sessionLoad{}'))

    act(() => capturedNavigate(1))
    await waitFor(() => expect(draft()).toBe('sum:tis{}'))
    await waitFor(() => expect(submitted()).toBe('sum:tis{}'))
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

  it('keeps a no-op edit without pushing a history entry', async () => {
    renderAt(['/analytics/explorer'])
    const searchBefore = search()

    act(() => captured.setDraft(DEFAULT_EXPLORER_QUERY))

    expect(draft()).toBe(DEFAULT_EXPLORER_QUERY)
    await act(async () => {})
    expect(search()).toBe(searchBefore)
  })

  it('an unparseable q still lands in submitted (the composer owns the draft fallback)', () => {
    renderAt([`/analytics/explorer?q=${encodeURIComponent('sum:tis{} )))garbage((((')}`])
    expect(draft()).toBe(DEFAULT_EXPLORER_QUERY)
    expect(submitted()).toBe('sum:tis{} )))garbage((((')
  })
})
