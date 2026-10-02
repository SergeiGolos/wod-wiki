/**
 * useComposerQueryState — URL ↔ WQL string state for stream surfaces
 * (option-A URL contract).
 *
 * Asserts: an editing burst collapses into ONE scratch history entry (never
 * one entry per keystroke), Back restores the pristine landing, a
 * Back/Forward external restore counts as committed so the next edit starts
 * a fresh spell, and no-op edits never touch the URL.
 */

// Must precede the react-router-dom import: repairs the partial
// react-router-dom mock that useJournalZipProcessor.test.ts leaks
// process-wide (see tests/helpers/repair-react-router-dom.ts).
import '../../tests/helpers/repair-react-router-dom'

import { afterEach, describe, expect, it } from 'bun:test'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { useComposerQueryState, type ComposerQueryState } from './useComposerQueryState'

afterEach(cleanup)

const DEFAULT_QUERY = 'find:note'

let captured: ComposerQueryState
let capturedNavigate: ReturnType<typeof useNavigate>

function Probe() {
  captured = useComposerQueryState({ defaultQuery: () => DEFAULT_QUERY })
  capturedNavigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <output data-testid="search">{location.search}</output>
      <output data-testid="pathname">{location.pathname}</output>
      <output data-testid="query">{captured.query}</output>
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

const query = () => screen.getByTestId('query').textContent
const search = () => screen.getByTestId('search').textContent ?? ''
const qParam = () => new URLSearchParams(search()).get('q') ?? ''
const pathname = () => screen.getByTestId('pathname').textContent

describe('useComposerQueryState', () => {
  it('native Back restores the query when the scratch navigation has not rendered', async () => {
    window.history.replaceState(null, '', '/library')
    try {
      render(<BrowserRouter><Probe /></BrowserRouter>)
      act(() => {
        captured.setQuery('find:note{tags:strength}')
        window.history.replaceState(null, '', '/library')
        window.dispatchEvent(new window.PopStateEvent('popstate'))
      })
      await waitFor(() => expect(query()).toBe(DEFAULT_QUERY))
      expect(qParam()).toBe('')
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('collapses an editing burst into one scratch entry — Back restores the landing', async () => {
    renderAt(['/elsewhere', '/library'], 1)

    // Each emission is flushed through a real render before the next — the
    // composer echoes resolved drafts synchronously, and the URL write must
    // reflect each without opening a new history entry.
    act(() => captured.setQuery('find:note{tags:strength}'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:strength}'))
    act(() => captured.setQuery('find:note{tags:strength,text:fran}'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:strength,text:fran}'))

    // The burst is one scratch entry: a single Back reaches the pristine
    // landing, a second leaves the page.
    act(() => capturedNavigate(-1))
    await waitFor(() => expect(query()).toBe(DEFAULT_QUERY))
    expect(qParam()).toBe('')
    act(() => capturedNavigate(-1))
    await waitFor(() => expect(pathname()).toBe('/elsewhere'))
  })

  it('a Back/Forward restore is committed — the next edit pushes a fresh spell', async () => {
    renderAt(['/elsewhere', '/library'], 1)

    act(() => captured.setQuery('find:note{tags:strength}'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:strength}'))
    act(() => capturedNavigate(-1))
    await waitFor(() => expect(query()).toBe(DEFAULT_QUERY))

    // Forward lands on the scratch entry as an external restore.
    act(() => capturedNavigate(1))
    await waitFor(() => expect(query()).toBe('find:note{tags:strength}'))

    // The restored entry is committed: editing pushes a NEW entry, so Back
    // returns to the restored query rather than leaving the page.
    act(() => captured.setQuery('find:note{tags:x}'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:x}'))
    act(() => capturedNavigate(-1))
    await waitFor(() => expect(query()).toBe('find:note{tags:strength}'))
  })

  it('never writes an unparseable draft to the URL', async () => {
    renderAt(['/library'])
    act(() => captured.setQuery('find:note{source:collections} backproof'))
    expect(qParam()).toBe('')
    act(() => captured.setQuery('find:note{tags:strength}'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:strength}'))
  })

  it('keeps a no-op edit from pushing a history entry', async () => {
    renderAt(['/library'])
    const searchBefore = search()

    act(() => captured.setQuery(DEFAULT_QUERY))
    await act(async () => {})

    expect(query()).toBe(DEFAULT_QUERY)
    expect(search()).toBe(searchBefore)
  })
})
