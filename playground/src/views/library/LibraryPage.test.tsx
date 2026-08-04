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
import { afterAll, afterEach, describe, expect, it, mock, type Mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { parseQuery } from '@/services/analytics/query/wql'
import type { FindQueryResult } from '@/services/analytics/query/QueryService'
import type { Note } from '@/types/storage'
import { formatDateHeader } from '../../lib/dateFormat'

// IntersectionObserver is absent in the test env; the library's progressive
// rendering (#861) observes a sentinel. Controllable mock.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  private readonly callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}
const realIO = globalThis.IntersectionObserver
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

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
import { journalNotes } from '../../services/journalNotes'
import type { CreateJournalNoteInput } from '../../services/journalNotes'

const createMock = journalNotes.create as Mock<(input: CreateJournalNoteInput) => Promise<unknown>>

afterEach(() => {
  cleanup()
  MockIntersectionObserver.instances = []
})

afterAll(() => {
  globalThis.IntersectionObserver = realIO
})

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

const BLOCK_ROW = {
  id: 'static:feeds/stronglifts/2026-07-01/5x5:sec-3:1',
  noteId: 'feeds/stronglifts/2026-07-01/5x5',
  segmentId: 'sec-3',
  segmentVersion: 1,
  position: 1,
  dataType: 'wod',
  rawContent: '21-15-9\nDeadlift\nHandstand push-ups',
  noteTitle: 'StrongLifts 5×5',
  createdAt: Date.parse('2026-07-01T10:00:00Z'),
  isStatic: true,
  sourceId: 'feed:feeds/stronglifts/2026-07-01/5x5',
} as FindQueryResult['blocks'][number]

describe('LibraryPage', () => {
  /** The scope radio's checked state, keyed by scope id. */
  const scopeChecked = (scope: string) =>
    (screen.getByTestId(`library-scope-${scope}`).querySelector('input') as HTMLInputElement).checked

  it('renders the shared WqlComposer instead of the old composer panel', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    renderPage('/library')

    expect(screen.getByTestId('wql-composer')).toBeDefined()
    expect(screen.queryByTestId('wql-composer-panel')).toBeNull()
    // The source head clause is owned by the scope radio — the composer
    // keeps it in the query model but hides the pill.
    expect(screen.queryByTestId('token-slot-source')).toBeNull()
    expect(scopeChecked('all')).toBe(true)
    expect(screen.getByTestId('token-slot-time').textContent).toContain('last 2w')
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
  })

  it('switches the search scope via the radio, preserving the other clauses', async () => {
    const raws: string[] = []
    runFindImpl = async parsed => {
      raws.push(parsed.raw ?? '')
      return emptyResult(parsed.raw ?? '')
    }
    renderPage('/library')
    await waitFor(() => expect(raws.some(r => r.includes('find:note in all'))).toBe(true))

    fireEvent.click(screen.getByRole('radio', { name: 'Feeds' }))

    // The query re-bases on the feeds source and the search re-runs…
    await waitFor(() => expect(raws.some(r => r.includes('find:note in feeds'))).toBe(true))
    // …the scope radio follows…
    expect(scopeChecked('feeds')).toBe(true)
    // …the subtitle identifies the content (#802)…
    expect(screen.getByTestId('library-heading').textContent).toBe('Feeds')
    // …and the time window survives the switch (no pivot between content sources).
    expect(screen.getByTestId('token-slot-time').textContent).toContain('last 2w')
    expect(raws.find(r => r.includes('in feeds'))).toContain('last 2w')
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
    // A journal-scoped deep link selects the Notes scope.
    expect(scopeChecked('notes')).toBe(true)
    fireEvent.click(screen.getByTestId('empty-remedy-all-sources'))
    await waitFor(() => expect(scopeChecked('all')).toBe(true))
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

  it('renders block-level cards for find:block — type badge, preview, parent (#855)', async () => {
    runFindImpl = async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      if ((parsed.raw ?? '').startsWith('find:block')) result.blocks = [BLOCK_ROW]
      return result
    }
    renderPage(`/library?q=${encodeURIComponent('find:block in all')}`)

    await waitFor(() => expect(screen.getByTestId('library-row-block-type')).toBeDefined())
    expect(screen.getByTestId('library-row-block-type').textContent).toBe('wod')
    expect(screen.getByTestId('library-row-block-preview').textContent).toContain('21-15-9')
    // The card keeps the parent note's identity, not a synthetic note card.
    expect(screen.getByTestId('library-row-post').textContent).toContain('StrongLifts 5×5')
    // Per-card date (#861): survives scrolled-away group headers.
    expect(screen.getByTestId('library-row-date').textContent).toBe(formatDateHeader('2026-07-01'))
    // Group header carries the matched count (#861).
    expect(screen.getByTestId('library-group-count').textContent).toBe('1')
  })

  it('batches oversized block results — sentinel grows the rendered set (#861)', async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      ...BLOCK_ROW,
      id: `b-${i}`,
      segmentId: `seg-${i}`,
      noteId: 'feeds/stronglifts/2026-07-01/5x5',
      createdAt: i,
    }))
    runFindImpl = async parsed => {
      const result = emptyResult(parsed.raw ?? '')
      if ((parsed.raw ?? '').startsWith('find:block')) result.blocks = many
      return result
    }
    renderPage(`/library?q=${encodeURIComponent('find:block in all')}`)

    // First batch only — never the full 250 rows in the DOM.
    await waitFor(() => expect(screen.getAllByTestId('library-row-post')).toHaveLength(200))
    expect(screen.getByTestId('library-load-more').textContent).toContain('50 remaining')
    // Group counts reflect the FULL result set, not the rendered batch.
    expect(screen.getByTestId('library-group-count').textContent).toBe('250')

    // Sentinel approaches → the rest render.
    act(() => MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1]!.trigger())
    await waitFor(() => expect(screen.getAllByTestId('library-row-post')).toHaveLength(250))
    expect(screen.queryByTestId('library-load-more')).toBeNull()
  })

  it('reassembles a static seed into a valid dashboard note (#903, #906)', async () => {
    // Mirror the real block-index shape: the frontmatter row stores the
    // YAML body WITHOUT `---` fences (dataType 'frontmatter'), blank-line
    // spacers carry empty rawContent, and rows arrive out of position order.
    const seedBlocks = [
      { ...BLOCK_ROW, id: 'b-0', position: 0, dataType: 'frontmatter', rawContent: 'dashboard: true\ntitle: Seeded' },
      { ...BLOCK_ROW, id: 'sp', position: 1, rawContent: '' },
      { ...BLOCK_ROW, id: 'b-2', position: 3, rawContent: '```query:value\nsum:totalVolume{}\n```' },
      { ...BLOCK_ROW, id: 'b-1', position: 2, rawContent: '## Total Volume\nWhat is my volume?' },
    ]
    runFindImpl = async parsed => {
      const raw = parsed.raw ?? ''
      const result = emptyResult(raw)
      if (raw.startsWith('find:block')) {
        result.blocks = seedBlocks
      } else {
        result.notes = [FEED_NOTE]
        result.stages = { selected: 1, matched: 1 }
      }
      return result
    }
    createMock.mockClear()
    renderPage('/library')

    await waitFor(() => expect(screen.getByTestId('action-add')).toBeDefined())
    fireEvent.click(screen.getByTestId('action-add'))

    await waitFor(() => expect(createMock.mock.calls).toHaveLength(1))
    const raw = (createMock.mock.calls[0] as [CreateJournalNoteInput])[0].rawContent
    // Frontmatter is re-fenced so the clone parses as a dashboard note.
    expect(raw.startsWith('---\ndashboard: true\n')).toBe(true)
    expect(raw).toContain('```query:value')
    // Empty spacer rows dropped; position order preserved.
    expect(raw.indexOf('dashboard: true')).toBeLessThan(raw.indexOf('## Total Volume'))
    expect(raw.indexOf('## Total Volume')).toBeLessThan(raw.indexOf('```query:value'))
  })

  it('offers jump-to-top once the list scrolls away (#861)', async () => {
    runFindImpl = async parsed => emptyResult(parsed.raw ?? '')
    const scrollToMock = mock(() => {})
    const realScrollTo = window.scrollTo
    window.scrollTo = scrollToMock as typeof window.scrollTo

    renderPage('/library')
    await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull())
    expect(screen.queryByTestId('library-jump-top')).toBeNull()

    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true })
    fireEvent.scroll(window)
    expect(screen.getByTestId('library-jump-top')).toBeDefined()

    fireEvent.click(screen.getByTestId('library-jump-top'))
    expect(scrollToMock).toHaveBeenCalled()

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    window.scrollTo = realScrollTo
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
