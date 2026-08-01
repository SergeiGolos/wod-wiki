/**
 * LibraryPage — /library on the shared WqlComposer (issue #833).
 *
 * Asserts:
 *   1. The shared WqlComposer renders; the old composer panel is gone.
 *   2. The entry list reflects the query from the URL (scope feeds → feed note).
 *   3. Invalid WQL surfaces a visible error banner and does NOT silently
 *      clear the entries loaded from the last valid query.
 *   4. The static catalog shelf renders for scope all/collections only.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseQuery } from '@/services/analytics/query/wql'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'
import type { Note } from '@/types/storage'

// ── Service mocks ────────────────────────────────────────────────────────────
// Mocks spread the real modules (imported statically above, before the
// mock.module calls) so unlisted exports stay real for every file sharing
// this bun process — partial mocks leak process-wide (the same failure mode
// tests/helpers/repair-react-router-dom.ts repairs for react-router-dom).

import * as realQuery from '@/services/analytics/query'
import * as realJournalNotes from '../../services/journalNotes'

const FEED_NOTE: Note = {
  id: 'feeds/stronglifts/2026-07-01--5x5',
  title: 'StrongLifts 5×5',
  createdAt: Date.parse('2026-07-01T10:00:00Z'),
  type: 'note',
  sourceId: 'feed:stronglifts',
  catalog: 'stronglifts',
} as Note

let runFindImpl: (parsed: { raw?: string }) => Promise<FindQueryResult>

mock.module('@/services/analytics/query', () => ({
  ...realQuery,
  queryService: {
    runFind: mock((parsed: { raw?: string }) => runFindImpl(parsed)),
  },
}))

mock.module('../../services/journalNotes', () => ({
  ...realJournalNotes,
  journalNotes: {
    getById: mock(async () => null),
    create: mock(async () => ({})),
  },
}))

import { LibraryPage } from './LibraryPage'

afterEach(cleanup)

function renderPage(initialUrl: string) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <LibraryPage />
    </MemoryRouter>,
  )
}

const emptyResult = (raw: string): FindQueryResult => ({
  parsed: parseQuery(raw) as FindQueryResult['parsed'],
  notes: [],
  blocks: [],
  stages: { selected: 0, matched: 0 },
})

describe('LibraryPage', () => {
  it('renders the shared WqlComposer instead of the old composer panel', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage('/library')

    expect(screen.getByTestId('wql-composer')).toBeDefined()
    expect(screen.queryByTestId('wql-composer-panel')).toBeNull()
    // Library defaults: all note sources, past two weeks.
    expect(screen.getByTestId('token-slot-source').textContent).toContain('notes')
    expect(screen.getByTestId('token-slot-time').textContent).toContain('last 2w')
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
  })

  it('lists entries matching the query from the URL', async () => {
    runFindImpl = async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      if ((parsed.raw ?? '').includes('in feeds')) result.notes = [FEED_NOTE]
      result.stages = { selected: 1, matched: result.notes.length }
      return result
    }
    renderPage(`/library?q=${encodeURIComponent('find:note in feeds last 52w')}`)

    await waitFor(() => expect(screen.queryByText('StrongLifts 5×5')).not.toBeNull())
  })

  it('surfaces invalid WQL visibly without clearing existing entries', async () => {
    runFindImpl = async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      result.notes = [FEED_NOTE]
      return result
    }
    // `text:hello world` is a reachable composer state that fails the Lezer
    // grammar — it must be flagged, not silently swallowed.
    renderPage(`/library?q=${encodeURIComponent('find:note{text:hello world} in feeds')}`)

    await waitFor(() => expect(screen.getByTestId('library-query-error')).toBeDefined())
    expect(screen.getByTestId('library-query-error').textContent).toContain('Invalid WQL')
    // The composer keeps the offending clause so diagnostics can flag it.
    expect(screen.getByTestId('token-slot-text').textContent).toContain('hello world')
    // No silent empty-state either.
    expect(screen.queryByText('No entries match this query.')).toBeNull()
  })

  it('offers one-click fixes in the empty state (#857) and applies them', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')

    // Default landing (source notes + last 2w): only the window remedy.
    const first = renderPage('/library')
    await waitFor(() => expect(screen.getByTestId('library-empty-state')).toBeDefined())
    expect(screen.getByTestId('empty-remedy-remove-window').textContent).toContain('last 2w')
    expect(screen.queryByTestId('empty-remedy-clear-filters')).toBeNull()
    expect(screen.queryByTestId('empty-remedy-all-sources')).toBeNull()

    // Applying it removes the time clause from the composer.
    fireEvent.click(screen.getByTestId('empty-remedy-remove-window'))
    await waitFor(() => expect(screen.queryByTestId('token-slot-time')).toBeNull())
    first.unmount()

    // Tag filter + window: both remedies; clearing filters keeps the window.
    renderPage(`/library?q=${encodeURIComponent('find:note{tags:strength} in all last 2w')}`)
    await waitFor(() => expect(screen.getByTestId('empty-remedy-clear-filters')).toBeDefined())
    fireEvent.click(screen.getByTestId('empty-remedy-clear-filters'))
    await waitFor(() => expect(screen.queryByTestId('token-slot-tag')).toBeNull())
    expect(screen.getByTestId('token-slot-time')).toBeDefined()
  })

  it('offers "Search all sources" when a narrowed source matches nothing (#857)', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage(`/library?q=${encodeURIComponent('find:note in journal')}`)

    await waitFor(() => expect(screen.getByTestId('empty-remedy-all-sources')).toBeDefined())
    fireEvent.click(screen.getByTestId('empty-remedy-all-sources'))
    await waitFor(() => expect(screen.getByTestId('token-slot-source').textContent).toContain('notes'))
  })

  it('banners a rejected URL query instead of silently resetting (#854)', async () => {
    runFindImpl = async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      result.notes = [FEED_NOTE]
      return result
    }
    renderPage(`/library?q=${encodeURIComponent('find:note )))garbage((( ')}`)

    await waitFor(() => expect(screen.getByTestId('library-query-error')).toBeDefined())
    expect(screen.getByTestId('library-query-error').textContent).toContain('Invalid URL query')
    // The default fallback query still runs — entries under the banner.
    await waitFor(() => expect(screen.queryByText('StrongLifts 5×5')).not.toBeNull())
  })

  it('banners a plain-word q with the parser detail (#854)', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage(`/library?q=squat`)

    await waitFor(() => expect(screen.getByTestId('library-query-error')).toBeDefined())
    expect(screen.getByTestId('library-query-error').textContent).toContain('squat')
  })

  it('hides the static catalog shelf when the source excludes collections', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    const { unmount } = renderPage(`/library?q=${encodeURIComponent('find:note in journal last 1w')}`)
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
    expect(screen.queryByTestId('static-shelf')).toBeNull()
    unmount()

    renderPage(`/library?q=${encodeURIComponent('find:note in all last 1w')}`)
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
    expect(screen.getByTestId('static-shelf')).toBeDefined()
  })

  it('identifies the displayed content type in the page heading (#802)', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')

    // Default library surface.
    const first = renderPage('/library')
    expect(screen.getByTestId('library-heading').textContent).toBe('Library')
    first.unmount()

    // Each retired route's source carries its old page's identity.
    for (const [source, title] of [
      ['journal', 'Journal'],
      ['collections', 'Collections'],
      ['feeds', 'Feeds'],
    ] as const) {
      const { unmount } = renderPage(`/library?q=${encodeURIComponent(`find:note in ${source} last 1w`)}`)
      expect(screen.getByTestId('library-heading').textContent).toBe(title)
      unmount()
    }
  })
})
