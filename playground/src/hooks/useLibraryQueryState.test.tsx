/**
 * useLibraryQueryState — URL ↔ composer clause state (issue #833).
 *
 * Asserts:
 *   1. No params → library defaults (target note, scope all, last 2w).
 *   2. `?q=<wql>` hydrates clauses on mount.
 *   3. setClauses serializes the composed WQL into `q` (history push).
 *   4. Browser back/forward restores the exact composer state.
 *   5. Legacy #813 tri-state params migrate to `q` (replace — legacy keys gone).
 *   6. Legacy `text` / `timePreset` map to text / time clauses.
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
  useLibraryQueryState,
  defaultLibraryClauses,
  type LibraryQueryState,
} from './useLibraryQueryState'
import type { QueryClause } from '@/components/organisms/wql-composer'

afterEach(cleanup)

let captured: LibraryQueryState
let capturedNavigate: ReturnType<typeof useNavigate>

function Probe() {
  captured = useLibraryQueryState()
  capturedNavigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <output data-testid="clauses">
        {captured.clauses.map(c => `${c.type}=${c.value}`).join('|')}
      </output>
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

const summary = () => screen.getByTestId('clauses').textContent
const search = () => screen.getByTestId('search').textContent ?? ''
const qParam = () => new URLSearchParams(search()).get('q') ?? ''

const withClause = (type: string, value: string): QueryClause[] => [
  ...defaultLibraryClauses(),
  { id: `c-${type}`, type, label: type, value, inputType: 'select', placeholder: '' },
]

describe('useLibraryQueryState', () => {
  it('falls back to library defaults when no params are present', () => {
    renderAt(['/library'])
    expect(summary()).toBe('target=note|scope=all|time=last 2w')
  })

  it('hydrates clauses from the q parameter on mount', () => {
    const wql = 'find:note{tags:pr} in feeds last 8w'
    renderAt([`/library?q=${encodeURIComponent(wql)}`])
    expect(summary()).toBe('target=note|scope=feeds|time=last 8w|tag=pr')
  })

  it('serializes clause changes into the q parameter', async () => {
    renderAt(['/library'])
    act(() => captured.setClauses(withClause('tag', 'pr')))
    await waitFor(() => expect(qParam()).toContain('tags:pr'))
    expect(qParam()).toBe('find:note{tags:pr} in all last 2w')
  })

  it('restores the exact composer state on browser back/forward', async () => {
    renderAt(['/library'])

    act(() => captured.setClauses(withClause('tag', 'pr')))
    await waitFor(() => expect(qParam()).toContain('tags:pr'))
    const stateA = 'target=note|scope=all|time=last 2w|tag=pr'

    act(() => captured.setClauses([...withClause('tag', 'pr'), { id: 'c-text', type: 'text', label: 'Contains', value: 'fran', inputType: 'freetext', placeholder: '' }]))
    await waitFor(() => expect(qParam()).toContain('text:fran'))
    const stateB = 'target=note|scope=all|time=last 2w|tag=pr|text=fran'
    expect(summary()).toBe(stateB)

    act(() => capturedNavigate(-1))
    await waitFor(() => expect(summary()).toBe(stateA))

    act(() => capturedNavigate(1))
    await waitFor(() => expect(summary()).toBe(stateB))
  })

  it('migrates legacy tri-state redirect params to q (replace, keys removed)', async () => {
    renderAt(['/library?note=hide&session=on&post=hide'])
    // Clause state reflects the legacy params immediately (no flash of defaults).
    expect(summary()).toBe('target=note|scope=collections|time=last 2w')

    await waitFor(() => expect(search()).toContain('q='))
    expect(qParam()).toBe('find:note in collections last 2w')
    expect(search()).not.toContain('session=')
    expect(search()).not.toContain('note=')
    expect(search()).not.toContain('post=')
  })

  it('migrates legacy text and timePreset params', async () => {
    renderAt(['/library?text=fran&timePreset=1w'])
    expect(summary()).toBe('target=note|scope=all|time=last 1w|text=fran')
    await waitFor(() => expect(qParam()).toBe('find:note{text:fran} in all last 1w'))
    expect(search()).not.toContain('timePreset=')
  })

  it('keeps a still-empty clause without pushing a history entry', async () => {
    renderAt(['/library'])
    const searchBefore = search()

    act(() => captured.setClauses(withClause('tag', '')))

    // The clause is present in state even though it compiles to nothing.
    expect(summary()).toBe('target=note|scope=all|time=last 2w|tag=')
    // No URL churn for a WQL-no-op edit.
    await act(async () => {})
    expect(search()).toBe(searchBefore)
  })
})
