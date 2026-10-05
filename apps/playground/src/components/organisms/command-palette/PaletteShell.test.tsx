/**
 * PaletteShell — WQL mode (issue #834, decision #828).
 *
 * Asserts:
 *   1. WQL mode embeds the shared WqlComposer and sources receive the
 *      composed draft (palette slot configuration flows through the
 *      composer's public API).
 *   2. Non-WQL requests keep the plain text input (other palette flows
 *      untouched).
 *   3. One draft authority: the composer's synchronous onQueryChange — Apply
 *      consumes the exact visible draft immediately, without waiting for the
 *      execution debounce.
 *   4. Popover option selection does NOT activate a palette result and does
 *      not dismiss the palette (composer keyboard events stay inside the
 *      composer).
 *   5. Results are a separate labelled focus region: editing keys never
 *      activate a result; explicit ArrowDown moves keyboard ownership into
 *      Results, Enter there activates.
 *   6. An invalid draft keeps the previous results marked stale and can
 *      neither execute nor apply.
 *   7. Escape dismisses and resolves { dismissed: true }; Cancel closes
 *      without changing the page URL.
 *   8. Back navigation (popstate) dismisses instead of leaving the page.
 */
import { beforeAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, useLocation } from 'react-router-dom'
import { usePaletteStore } from './palette-store'
import type { PaletteItem, PaletteRequest, PaletteResponse } from './palette-types'
import type { WqlExecutor } from '@bitcobblers/wod-wiki-ui'
import { isFindQuery } from '@bitcobblers/wod-wiki-engine'
import type { FindQueryResult, QueryResult } from '@bitcobblers/wod-wiki-engine'

import { PaletteShell } from './PaletteShell'

// ── jsdom Event realm alignment ─────────────────────────────────────────────
// bun ships native Event classes; the unit-setup installs jsdom's window but
// keeps them, so jsdom's dispatchEvent rejects events Radix constructs (e.g.
// FocusScope's CustomEvent). Re-point the event globals at jsdom's classes.
// Deliberately NOT restored after the run: Radix dispatches focus events on
// deferred timers that can fire after this file's tests complete, and the
// jsdom classes are the consistent match for the jsdom document every
// component test uses.
const EVENT_GLOBALS = [
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'PointerEvent',
  'InputEvent',
  'UIEvent',
] as const

beforeAll(() => {
  const w = (globalThis as { window?: Record<string, unknown> }).window
  for (const key of EVENT_GLOBALS) {
    if (w?.[key]) (globalThis as Record<string, unknown>)[key] = w[key]
  }
  // Test boundary: bun's jsdom window has no matchMedia; the shell's
  // desktop-viewport hook (and anything else) gets a static non-matching
  // matcher. Production code paths are untouched.
  if (w && !w.matchMedia) {
    w.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }
  // Test boundary: jsdom does not implement scrollIntoView.
  if (w?.HTMLElement && !w.HTMLElement.prototype.scrollIntoView) {
    ;(w.HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView = () => {}
  }
})

const execute: WqlExecutor = async ast => {
  if (isFindQuery(ast)) {
    return { parsed: ast, notes: [], blocks: [], stages: { selected: 0, matched: 0 } } as FindQueryResult
  }
  return { parsed: ast, series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 } } as unknown as QueryResult
}

/** Palette-style defaults: all note sources, no time window. */
const paletteQuery = ':note'

/** The dialog composer's free-text input (distinct placeholder keeps it
 *  unambiguous against any background page composer). */
function findDraftInput() {
  return screen.getByPlaceholderText('Search or edit WQL…')
}

function renderShell() {
  return render(
    <MemoryRouter>
      <PaletteShell />
    </MemoryRouter>,
  )
}

/** open() outside React's batching — returns the response promise. */
function openPalette(request: PaletteRequest) {
  let response: Promise<PaletteResponse> | undefined
  act(() => {
    response = usePaletteStore.getState().open(request)
  })
  return response!
}

beforeEach(() => {
  usePaletteStore.setState({ isOpen: false, request: null, _resolve: null })
})

afterEach(cleanup)

describe('PaletteShell WQL mode', () => {
  it('keeps the plain text input for non-WQL requests', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({ placeholder: 'Pick one…', sources: [{ id: 'plain', search }] })

    const input = await screen.findByPlaceholderText('Pick one…')
    expect(screen.queryByTestId('wql-composer')).toBeNull()

    fireEvent.change(input, { target: { value: 'abc' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith('abc'))
  })

  it('narrows results live while typing — resolved draft reaches sources after the execution debounce (#1010)', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    const input = findDraftInput()
    await waitFor(() => expect(search).toHaveBeenCalledWith(':note'))

    // Typing re-runs the search with the pending text resolved as the same
    // text filter Enter commits — bare concatenation is invalid WQL and
    // would blank the results instead of narrowing them.
    fireEvent.change(input, { target: { value: 'fran' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith(':note{text:fran}'), { timeout: 1_000 })
  })

  it('applies the exact visible draft immediately — no debounce wait on the action', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    const onApply = mock((_wql: string) => {})
    renderShell()
    openPalette({
      wql: { initialQuery: paletteQuery, execute, onApply },
      sources: [{ id: 'wql-search', search }],
    })

    const input = findDraftInput()
    await screen.findByTestId('wql-composer')
    search.mockClear()

    // Type and click Apply synchronously — the action must receive the
    // current draft, not the seeded one.
    fireEvent.change(input, { target: { value: 'tags:crossfit' } })
    fireEvent.click(screen.getByTestId('palette-apply-query'))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0]).toContain('tags:crossfit')
    expect(usePaletteStore.getState().isOpen).toBe(false)
  })

  it('keeps previous results marked stale for an invalid draft and blocks execution and Apply', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [
      { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    ])
    const onApply = mock((_wql: string) => {})
    renderShell()
    openPalette({
      wql: { initialQuery: paletteQuery, execute, onApply },
      sources: [{ id: 'wql-search', search }],
    })

    await screen.findByText('Fran')
    search.mockClear()

    // An invalid draft never executes: sources keep the previous results.
    fireEvent.change(findDraftInput(), { target: { value: ':note{oops' } })
    await act(async () => {})
    expect(search).not.toHaveBeenCalled()
    expect(screen.getByText('Fran')).toBeDefined()
    expect(screen.getByTestId('palette-stale')).toBeDefined()

    const apply = screen.getByTestId('palette-apply-query') as HTMLButtonElement
    expect(apply.disabled).toBe(true)
    fireEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
    expect(usePaletteStore.getState().isOpen).toBe(true)
  })

  it('keeps popover option selection inside the composer', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [
      { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    ])
    renderShell()
    let resolved = false
    const response = openPalette({
      // A source pill seeds the Where-stored value picker without Add condition.
      wql: { initialQuery: ':note{source:journal}', execute },
      sources: [{ id: 'wql-search', search }],
    })
    void response.then(() => { resolved = true })

    await screen.findByText('Fran')

    // The Where-stored pill opens its value picker directly.
    fireEvent.click(screen.getByTestId('token-slot-source'))

    // Narrow the picker's own search input and choose a row with the
    // keyboard — composer picker keys never leak to the results list (#834).
    const pickerInput = screen.getByRole('combobox', { name: 'Search Where stored' })
    fireEvent.change(pickerInput, { target: { value: 'gui' } })
    fireEvent.keyDown(pickerInput, { key: 'ArrowDown' })
    fireEvent.keyDown(pickerInput, { key: 'Enter' })

    // The scope clause landed in the draft (multi-select ORs the scope
    // values) and re-searched…
    await waitFor(() => expect(search).toHaveBeenCalledWith(':note{source:journal|guides}'))
    // …but the Enter did NOT activate the palette result…
    await act(async () => {})
    expect(resolved).toBe(false)
    // …and the palette is still open.
    expect(usePaletteStore.getState().isOpen).toBe(true)
  })

  it('owns result activation in the labelled Results region only', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [
      { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    ])
    renderShell()
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    const input = findDraftInput()
    // Compose: free text + Enter commits a text clause (no result activation).
    fireEvent.change(input, { target: { value: 'fran' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTestId('token-slot-text').textContent).toContain('fran')
    await waitFor(() => expect(search).toHaveBeenCalledWith(':note{text:fran}'))

    await screen.findByText('Fran')

    // Editing keys alone never activate a result…
    fireEvent.keyDown(input, { key: 'Enter' })
    await act(async () => {})
    expect(usePaletteStore.getState().isOpen).toBe(true)

    // …explicit ArrowDown moves keyboard ownership into Results…
    const results = screen.getByRole('listbox', { name: 'Results' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await act(async () => {})
    expect(document.activeElement).toBe(results)

    // …and Enter inside Results activates the active item.
    fireEvent.keyDown(results, { key: 'Enter' })
    const result = await response
    expect(result).toEqual({
      dismissed: false,
      item: { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    })
  })

  it('resolves dismissed on Escape', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    fireEvent.keyDown(findDraftInput(), { key: 'Escape' })

    const result = await response
    expect(result).toEqual({ dismissed: true })
  })

  it('closes via the footer Cancel in WQL mode and leaves the page URL unchanged', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    function LocationProbe() {
      const location = useLocation()
      return <span data-testid="location-probe">{location.pathname + location.search}</span>
    }
    // The sentinel-history machinery talks to window.history directly, so
    // this contract needs a real BrowserRouter (MemoryRouter keeps history
    // in memory and never writes history.state).
    window.history.pushState(null, '', '/library?q=%3Anote')
    try {
      render(
        <BrowserRouter>
          <LocationProbe />
          <PaletteShell />
        </BrowserRouter>,
      )
      const response = openPalette({
        wql: { initialQuery: paletteQuery, execute },
        sources: [{ id: 'wql-search', search }],
      })

      fireEvent.click(await screen.findByTestId('palette-cancel'))

      const result = await response
      expect(result).toEqual({ dismissed: true })
      expect(usePaletteStore.getState().isOpen).toBe(false)
      // The sentinel entry is consumed — the visible URL is exactly the page's.
      await waitFor(() =>
        expect(screen.getByTestId('location-probe').textContent).toBe('/library?q=%3Anote'),
      )
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('closes via the touch close button in non-WQL mode', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({ placeholder: 'Pick one…', sources: [{ id: 'plain', search }] })

    fireEvent.click(await screen.findByTestId('palette-cancel'))

    expect(usePaletteStore.getState().isOpen).toBe(false)
  })

  it('dismisses on back navigation (popstate) instead of leaving the page', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })
    await screen.findByTestId('wql-composer')

    act(() => {
      fireEvent.popState(window)
    })

    const result = await response
    expect(result).toEqual({ dismissed: true })
    expect(usePaletteStore.getState().isOpen).toBe(false)
  })
})
