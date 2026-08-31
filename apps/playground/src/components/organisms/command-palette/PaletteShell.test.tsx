/**
 * PaletteShell — WQL mode (issue #834, decision #828).
 *
 * Asserts:
 *   1. WQL mode embeds the shared WqlComposer instead of the plain input and
 *      sources receive the composed WQL (palette slot configuration flows
 *      through the composer's public API).
 *   2. Non-WQL requests keep the plain text input (other palette flows
 *      untouched).
 *   3. Keyboard flow works end-to-end: commit a text clause, ArrowDown into
 *      the results, Enter selects — no mouse.
 *   4. Popover option selection does NOT activate a palette result and does
 *      not dismiss the palette (composer keyboard events stay inside the
 *      composer).
 *   5. Escape dismisses and resolves { dismissed: true }.
 */
import { beforeAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { usePaletteStore } from './palette-store'
import type { PaletteItem, PaletteResponse } from './palette-types'
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
  const w = (globalThis as Record<string, any>).window
  for (const key of EVENT_GLOBALS) {
    if (w?.[key]) (globalThis as Record<string, unknown>)[key] = w[key]
  }
})

const execute: WqlExecutor = async ast => {
  if (isFindQuery(ast)) {
    return { parsed: ast, notes: [], blocks: [], stages: { selected: 0, matched: 0 } } as FindQueryResult
  }
  return { parsed: ast, series: [], stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 } } as unknown as QueryResult
}

/** Palette-style defaults: all note sources, no time window. */
const paletteQuery = 'find:note'

function renderShell() {
  return render(
    <MemoryRouter>
      <PaletteShell />
    </MemoryRouter>,
  )
}

/** open() outside React's batching — returns the response promise. */
function openPalette(request: Parameters<ReturnType<typeof usePaletteStore.getState>['open']>[0]) {
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
  it('embeds the WqlComposer and feeds composed WQL to the sources', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    // The composer replaces the plain input; palette defaults flow through.
    await screen.findByTestId('wql-composer')
    expect(screen.queryByTestId('wql-composer-input')).not.toBeNull()
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
    expect(screen.getByTestId('token-slot-source').textContent).toContain('notes')

    await waitFor(() => expect(search).toHaveBeenCalledWith('find:note'))
  })

  it('keeps the plain text input for non-WQL requests', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({ placeholder: 'Pick one…', sources: [{ id: 'plain', search }] })

    const input = await screen.findByPlaceholderText('Pick one…')
    expect(screen.queryByTestId('wql-composer')).toBeNull()

    fireEvent.change(input, { target: { value: 'abc' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith('abc'))
  })

  it('supports the full keyboard flow: compose, ArrowDown, Enter to select', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [
      { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    ])
    renderShell()
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    const input = await screen.findByTestId('wql-composer-input')
    // Compose: free text + Enter commits a text clause (no result activation).
    fireEvent.change(input, { target: { value: 'fran' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTestId('token-slot-text').textContent).toContain('fran')
    await waitFor(() => expect(search).toHaveBeenCalledWith('find:note{text:fran}'))

    // Navigate into the results and activate — all without leaving the input.
    await screen.findByText('Fran')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    const result = await response
    expect(result).toEqual({
      dismissed: false,
      item: { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    })
  })

  it('narrows results live while typing — pending text reaches sources as a text filter (#1010)', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    const input = await screen.findByTestId('wql-composer-input')
    await waitFor(() => expect(search).toHaveBeenCalledWith('find:note'))

    // Typing must re-run the search with the pending text serialized as the
    // same text-filter pill Enter commits — bare concatenation is invalid
    // WQL and would blank the results instead of narrowing them.
    fireEvent.change(input, { target: { value: 'fran' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith('find:note{text:fran}'), { timeout: 1_000 })
  })

  it('keeps popover option selection inside the composer', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [
      { id: 'entry:1', label: 'Fran', type: 'entry', payload: { id: 'entry:1' } },
    ])
    renderShell()
    let resolved = false
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })
    void response.then(() => { resolved = true })

    await screen.findByText('Fran')

    // Open the source pill's popover and pick the next option via keyboard.
    fireEvent.click(screen.getByTestId('token-slot-source'))
    const popover = await screen.findByTestId('clause-popover-source')
    fireEvent.keyDown(popover, { key: 'ArrowDown' })
    fireEvent.keyDown(popover, { key: 'Enter' })

    // The clause changed (journal → collections) and re-searched…
    await waitFor(() => expect(search).toHaveBeenCalledWith('find:note{source:collections}'))
    // …but the Enter did NOT activate the palette result…
    await act(async () => {})
    expect(resolved).toBe(false)
    // …and the palette is still open.
    expect(usePaletteStore.getState().isOpen).toBe(true)
  })

  it('resolves dismissed on Escape', async () => {
    const search = mock(async (_query: string): Promise<PaletteItem[]> => [])
    renderShell()
    const response = openPalette({
      wql: { initialQuery: paletteQuery, execute },
      sources: [{ id: 'wql-search', search }],
    })

    const input = await screen.findByTestId('wql-composer-input')
    fireEvent.keyDown(input, { key: 'Escape' })

    const result = await response
    expect(result).toEqual({ dismissed: true })
  })
})
