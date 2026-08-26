/**
 * useLibraryQueryState — URL ↔ WQL string state for the Library route.
 * (String-state rework, wayfinder ticket 013: the composer state IS the
 * query text; no clause model.)
 *
 * Asserts:
 * 1. No params → library defaults (target all, scope all, last 2w).
 * 2. `?q=<wql>` hydrates the query on mount.
 * 3. setQuery serializes into q (replace → history push).
 * 4. Browser back/forward restores the exact query state.
 * 5. Legacy #813 tri-state params migrate to `q` (replace — legacy keys gone).
 * 6. Legacy `text` / `timePreset` map to text / window clauses.
 * 7. A still-empty edit survives setQuery (no URL push, no clobber).
 * 8. Unparseable `q` flags `urlQueryError` instead of silently resetting (#854).
 * 9. Legacy `in <scope>` URLs and modern `source:` URLs both parse to the
 *    same AST (C2 — the engine normalizer owns the fold).
 */
import { afterEach, describe, expect, it } from 'bun:test'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import {
  useLibraryQueryState,
  DEFAULT_LIBRARY_QUERY,
  type LibraryQueryState,
} from './useLibraryQueryState'
import { parseQuery } from '@bitcobblers/wod-wiki-engine'

afterEach(cleanup)

let captured: LibraryQueryState
let capturedNavigate: ReturnType<typeof useNavigate>

function Probe() {
  captured = useLibraryQueryState()
  capturedNavigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <output data-testid="query">{captured.query}</output>
      <output data-testid="search">{location.search}</output>
    </div>
  )
}

function renderAt(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <Probe />
    </MemoryRouter>,
  )
}

const current = () => screen.getByTestId('query').textContent
const search = () => screen.getByTestId('search').textContent ?? ''
const qParam = () => new URLSearchParams(search()).get('q') ?? ''

describe('useLibraryQueryState', () => {
  it('falls back to library defaults when no params are present', () => {
    renderAt(['/library'])
    expect(current()).toBe(DEFAULT_LIBRARY_QUERY)
  })

  it('hydrates the query from the q parameter on mount', () => {
    const wql = 'find:note{tags:pr,source:feeds} last 8w'
    renderAt([`/library?q=${encodeURIComponent(wql)}`])
    expect(current()).toBe(wql)
  })

  it('normalizes legacy in <scope> and modern source: URLs to the same AST (C2)', () => {
    renderAt([`/library?q=${encodeURIComponent('find:note in feeds last 8w')}`])
    const legacy = parseQuery(current()!)
    expect(legacy.error).toBeUndefined()
    expect(legacy.filters.map(f => `${f.key}:${f.values.map(v => v.value).join('|')}`)).toContain('source:feeds')

    cleanup()
    renderAt([`/library?q=${encodeURIComponent('find:note{source:feeds} last 8w')}`])
    const modern = parseQuery(current()!)
    expect(modern.error).toBeUndefined()
    expect(modern.filters).toEqual(legacy.filters)
  })

  it('serializes edits into the q parameter', async () => {
    renderAt(['/library'])
    act(() => captured.setQuery('find:note{tags:pr} last 2w'))
    await waitFor(() => expect(qParam()).toBe('find:note{tags:pr} last 2w'))
  })

  it('restores the exact query state on browser back/forward', async () => {
    renderAt(['/library'])

    act(() => captured.setQuery('find:note{tags:pr} last 2w'))
    await waitFor(() => expect(qParam()).toContain('tags:pr'))

    act(() => captured.setQuery('find:note{tags:pr,text:fran} last 2w'))
    await waitFor(() => expect(qParam()).toContain('text:fran'))
    expect(current()).toBe('find:note{tags:pr,text:fran} last 2w')

    act(() => capturedNavigate(-1))
    await waitFor(() => expect(current()).toBe('find:note{tags:pr} last 2w'))

    act(() => capturedNavigate(1))
    await waitFor(() => expect(current()).toBe('find:note{tags:pr,text:fran} last 2w'))
  })

  it('migrates legacy tri-state redirect params to q (replace, keys removed)', async () => {
    renderAt(['/library?note=hide&session=on&post=hide'])
    // Query state reflects the legacy params immediately (no flash of defaults).
    expect(current()).toBe('find:note{source:collections} last 2w')

    await waitFor(() => expect(search()).toContain('q='))
    expect(qParam()).toBe('find:note{source:collections} last 2w')
    expect(search()).not.toContain('session=')
    expect(search()).not.toContain('note=')
    expect(search()).not.toContain('post=')
  })

  it('migrates legacy text and timePreset params', async () => {
    renderAt(['/library?text=fran&timePreset=1w'])
    expect(current()).toBe('find:note{text:fran} last 1w')
    await waitFor(() => expect(qParam()).toBe('find:note{text:fran} last 1w'))
    expect(search()).not.toContain('timePreset=')
  })

  it('keeps a still-empty edit without pushing a history entry', async () => {
    renderAt(['/library'])
    const searchBefore = search()

    act(() => captured.setQuery(DEFAULT_LIBRARY_QUERY))

    // State is unchanged and no URL churn happens for a WQL-no-op edit.
    expect(current()).toBe(DEFAULT_LIBRARY_QUERY)
    await act(async () => {})
    expect(search()).toBe(searchBefore)
  })

  it('flags an unparseable q instead of silently resetting (#854)', async () => {
    renderAt([`/library?q=${encodeURIComponent('find:note{tags:strength} )))garbage((( ')}`])
    // The default takes over, but the rejection is surfaced…
    expect(current()).toBe(DEFAULT_LIBRARY_QUERY)
    expect(captured.urlQueryError).toContain('find:note{tags:strength}')

    // …and cleared by the next edit.
    act(() => captured.setQuery('find:note{tags:pr} last 2w'))
    await waitFor(() => expect(captured.urlQueryError).toBeNull())
  })

  it('flags a non-WQL q (plain word) with the parser detail', () => {
    renderAt([`/library?q=squat`])
    expect(current()).toBe(DEFAULT_LIBRARY_QUERY)
    expect(captured.urlQueryError).toContain('squat')
  })

  it('clears urlQueryError when navigating to a parseable q', async () => {
    renderAt([`/library?q=squat`])
    expect(captured.urlQueryError).not.toBeNull()

    act(() => captured.setQuery('find:note{tags:pr} last 2w'))
    await waitFor(() => expect(qParam()).toContain('tags:pr'))
    expect(captured.urlQueryError).toBeNull()
  })
})
