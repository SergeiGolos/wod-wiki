import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Entry } from '../../lib/entryMapper'
import { StreamQueryEngine } from '../../lib/entrySearch'
import { writeViewSettings } from '../../lib/viewSettingsStorage'
import type { ParsedFindQuery, ParsedRowsQuery } from '@bitcobblers/wod-wiki-engine'
import { QueriableStreamView } from './QueriableStreamView'
import type { Note, BlockIndexRow } from '@/types/storage'
import { pendingRuntimes } from '../../runtimeStore'
import {
  EFFORTS_STREAM_PROFILE,
  JOURNAL_STREAM_PROFILE,
  LIBRARY_STREAM_PROFILE,
  RESULTS_STREAM_PROFILE,
  createResultDetailProfile,
} from './streamProfile'
import { journalNotes } from '../../services/journalNotes'
import { NavContext, initialNavState } from '../../nav/NavContext'
import type { NavItemL3 } from '../../nav/navTypes'
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('QueriableStreamView component', () => {
  const sampleEffortEntries: Entry[] = [
    {
      id: 'back-squat',
      kind: 'effort',
      sourceCatalog: 'canonical',
      sourceItem: 'back-squat',
      title: 'Back Squat',
      date: null,
      effort: {
        slug: 'back-squat',
        label: 'Back Squat',
        discipline: 'strength',
        met: 6.0,
        intensityTier: 'heavy',
      },
    },
    {
      id: 'pull-up',
      kind: 'effort',
      sourceCatalog: 'canonical',
      sourceItem: 'pull-up',
      title: 'Pull-up',
      date: null,
      effort: {
        slug: 'pull-up',
        label: 'Pull-up',
        discipline: 'gymnastics',
        met: 5.0,
        intensityTier: 'moderate',
      },
    },
  ]

  function createMockEngine(entries: Entry[] = []) {
    const engine = new StreamQueryEngine({
      runFind: mock(async () => ({ parsed: { raw: '', target: 'note', filters: [] } as unknown as ParsedFindQuery, notes: [], blocks: [], stages: { selected: 0, matched: 0 } })),
      runFindEffort: mock(async () => ({ parsed: { raw: '', target: 'effort', filters: [] } as unknown as ParsedFindQuery, notes: [], blocks: [], efforts: [], stages: { selected: 0, matched: 0 } })),
      runRows: mock(async () => ({ parsed: { raw: '', outputType: 'all', filters: [] } as unknown as ParsedRowsQuery, runs: [] })),
    })
    engine.query = mock(async () => entries)
    return engine
  }

  it('renders the sticky header without a page title — the query bar fills the row', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('queriable-stream-view')).toBeDefined()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByTestId('stream-query-bar')).toBeDefined()
  })
  it('renders entries in card stream layout by default', async () => {
    const engine = createMockEngine(sampleEffortEntries)

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Back Squat')).toBeDefined()
      expect(screen.getByText('Pull-up')).toBeDefined()
    })
    // In stream layout, rows are rendered as LibraryRows
    expect(screen.getAllByTestId('library-row-effort').length).toBe(2)
    expect(screen.queryByTestId('property-table')).toBeNull()
  })

  it('renders entries in property table layout when settings.layout is rows', async () => {
    writeViewSettings('/efforts', {
      level: 'effort',
      layout: 'rows',
      visibleFields: ['label', 'canonicalSlug', 'discipline'],
    })

    const engine = createMockEngine(sampleEffortEntries)

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('property-table')).toBeDefined()
      expect(screen.getByTestId('property-table-header-label')).toBeDefined()
      expect(screen.getByTestId('property-table-header-discipline')).toBeDefined()
    })
  })

  it('opens ViewSettingsDialog when settings trigger button is clicked', async () => {
    const engine = createMockEngine([])
    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    const trigger = screen.getByTestId('stream-view-settings-trigger')
    expect(trigger).toBeDefined()

    fireEvent.click(trigger)

    expect(screen.getByTestId('view-settings-dialog')).toBeDefined()
    expect(screen.getByText('View Settings')).toBeDefined()
  })
  it('renders custom actions in the header action slot', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView
          profile={EFFORTS_STREAM_PROFILE}
          queryEngine={engine}
          actions={<button data-testid="custom-action-btn">New Effort</button>}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('custom-action-btn')).toBeDefined()
  })

  it('enforces scope lock by hiding scope radio for locked profiles', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('source-scope-radio')).toBeNull()
  })

  it('hides scope radio on library stream profile since selection moved to nav menu', async () => {
    const engine = createMockEngine()
    render(
      <MemoryRouter initialEntries={['/library']}>
        <QueriableStreamView profile={LIBRARY_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('library-source-scope')).toBeNull()
    })
  })

  it('migrates legacy query parameters on mount to canonical WQL query', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/journal?text=snatch']}>
        <QueriableStreamView profile={JOURNAL_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(engine.query).toHaveBeenCalledWith('find:note{source:journal,text:snatch} last 2w')
    })
  })

  it('renders Results stream cleanly without error banner on default query', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/results']}>
        <QueriableStreamView profile={RESULTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('stream-query-bar')).toBeDefined()
    await waitFor(() => {
      expect(screen.getByText('No completed session results recorded in this period.')).toBeDefined()
    })
    expect(screen.queryByTestId('stream-query-error')).toBeNull()
  })

  it('renders result detail stream profile at /results/:resultId with segment rows', async () => {
    const sampleSegmentEntries: Entry[] = [
      {
        id: 'res-42:0',
        kind: 'segment',
        sourceCatalog: 'results',
        sourceItem: 'res-42',
        title: 'Session Result',
        date: '2026-06-01',
        segment: {
          resultId: 'res-42',
          segmentIndex: 0,
          splitDurationMs: 120000,
          workReps: 21,
          roundIndex: 1,
        },
      },
    ]
    const engine = createMockEngine(sampleSegmentEntries)
    const profile = createResultDetailProfile('res-42')

    render(
      <MemoryRouter initialEntries={['/results/res-42']}>
        <QueriableStreamView profile={profile} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Session Result')).toBeDefined()
    })
    expect(screen.queryByTestId('stream-query-error')).toBeNull()
  })

  it('passes onAddToToday handler to result and segment cards with noteId', async () => {
    const handleAdd = mock(() => {})
    const sampleResultEntries: Entry[] = [
      {
        id: 'res-42',
        kind: 'result',
        sourceCatalog: 'results',
        sourceItem: 'res-42',
        title: 'Fran Workout',
        date: '2026-06-01',
        execution: {
          resultId: 'res-42',
          noteId: 'crossfit-girls/fran',
          timestamp: 1700000000000,
          outputType: 'all',
        },
      },
    ]
    const engine = createMockEngine(sampleResultEntries)

    render(
      <MemoryRouter initialEntries={['/results']}>
        <QueriableStreamView
          profile={RESULTS_STREAM_PROFILE}
          queryEngine={engine}
          onAddToToday={handleAdd}
        />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Fran Workout')).toBeDefined()
    })

    const addButton = screen.getByTestId('action-add')
    fireEvent.click(addButton)
    expect(handleAdd).toHaveBeenCalledTimes(1)
    expect(handleAdd.mock.calls[0][0].id).toBe('res-42')
  })

  it('defaultAddToToday resolves parent note and creates journal note', async () => {
    const originalGetById = journalNotes.getById
    const originalCreate = journalNotes.create
    try {
      journalNotes.getById = mock(async () => ({
        id: 'crossfit-girls/fran',
        title: 'Fran',
        rawContent: '21-15-9\nThrusters\nPull-ups',
        type: 'journal',
      } as any))
      journalNotes.create = mock(async () => ({} as any))

      const sampleResultEntries: Entry[] = [
        {
          id: 'res-42',
          kind: 'result',
          sourceCatalog: 'results',
          sourceItem: 'res-42',
          title: 'Fran Workout',
          date: '2026-06-01',
          execution: {
            resultId: 'res-42',
            noteId: 'crossfit-girls/fran',
            timestamp: 1700000000000,
            outputType: 'all',
          },
        },
      ]
      const engine = createMockEngine(sampleResultEntries)

      render(
        <MemoryRouter initialEntries={['/results']}>
          <QueriableStreamView profile={RESULTS_STREAM_PROFILE} queryEngine={engine} />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText('Fran Workout')).toBeDefined()
      })

      const addButton = screen.getByTestId('action-add')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(journalNotes.create).toHaveBeenCalledTimes(1)
      })
      const createCall = (journalNotes.create as any).mock.calls[0][0]
      expect(createCall.title).toBe('Fran Workout')
      expect(createCall.rawContent).toContain('Thrusters')
    } finally {
      journalNotes.getById = originalGetById
      journalNotes.create = originalCreate
    }
  })

  it('publishes dynamic section links to NavContext and updates them when WQL grouping changes', async () => {
    const datedEntries: Entry[] = [
      {
        id: 'note-1',
        kind: 'note',
        sourceCatalog: 'canonical',
        sourceItem: 'item-1',
        title: 'Workout 1',
        date: '2026-09-04',
        effort: { slug: 'fran', label: 'Fran', discipline: 'gymnastics' },
      },
      {
        id: 'note-2',
        kind: 'note',
        sourceCatalog: 'canonical',
        sourceItem: 'item-2',
        title: 'Workout 2',
        date: '2026-08-15',
        effort: { slug: 'grace', label: 'Grace', discipline: 'strength' },
      },
    ]

    let capturedLinks: NavItemL3[] = []
    const setL3Items = mock((items: NavItemL3[]) => {
      capturedLinks = items
    })

    const engine = createMockEngine(datedEntries)

    const { unmount } = render(
      <MemoryRouter initialEntries={['/journal']}>
        <NavContext.Provider
          value={{
            tree: [],
            navState: initialNavState,
            dispatch: () => {},
            l3Items: [],
            setL3Items,
            scrollToSection: () => {},
            registerScrollFn: () => {},
          }}
        >
          <QueriableStreamView profile={JOURNAL_STREAM_PROFILE} queryEngine={engine} />
        </NavContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(capturedLinks.length).toBeGreaterThan(0)
    })
    // Default date grouping
    expect(capturedLinks.some(l => l.id.includes('2026-09-04'))).toBe(true)
    expect(capturedLinks.some(l => l.id.includes('2026-08-15'))).toBe(true)

    unmount()
    cleanup()

    // When WQL has `by {discipline}`, grouping updates to discipline
    let disciplineLinks: NavItemL3[] = []
    const setL3Discipline = mock((items: NavItemL3[]) => {
      disciplineLinks = items
    })

    render(
      <MemoryRouter initialEntries={['/journal']}>
        <NavContext.Provider
          value={{
            tree: [],
            navState: initialNavState,
            dispatch: () => {},
            l3Items: [],
            setL3Items: setL3Discipline,
            scrollToSection: () => {},
            registerScrollFn: () => {},
          }}
        >
          <QueriableStreamView
            profile={{ ...JOURNAL_STREAM_PROFILE, defaultWql: 'find:note in journal by {discipline}' }}
            queryEngine={engine}
          />
        </NavContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(disciplineLinks.some(l => l.label === 'Gymnastics')).toBe(true)
      expect(disciplineLinks.some(l => l.label === 'Strength')).toBe(true)
    })
  })

  it('renders the feed layout with rich previews and working actions for playground entries', async () => {
    writeViewSettings('/library', {
      level: 'note',
      layout: 'feed',
      visibleFields: ['title', 'excerpt', 'date'],
    })

    const note: Note = {
      id: 'uuid-1',
      title: 'Fran Experiment',
      createdAt: 1_700_000_000_000,
      type: 'playground',
      sourceId: 'playground',
      slug: 'playground/fran-experiment',
    }
    const wodBlock: BlockIndexRow = {
      id: 'b:uuid-1',
      noteId: 'uuid-1',
      segmentId: 's1',
      segmentVersion: 1,
      position: 0,
      dataType: 'wod',
      rawContent: '21-15-9\nThrusters\nPull-ups',
      noteTitle: 'Fran Experiment',
      createdAt: 1_700_000_000_000,
      blockContentId: 'wod-hash-1',
    }
    const engine = new StreamQueryEngine({
      service: {
        runFind: mock(async () => ({
          parsed: { raw: '', target: 'note', filters: [] } as unknown as ParsedFindQuery,
          notes: [note],
          blocks: [wodBlock],
          stages: { selected: 1, matched: 1 },
        })),
      },
    })

    render(
      <MemoryRouter initialEntries={[`/library?q=${encodeURIComponent('find:note{source:playground}')}`]}>
        <QueriableStreamView profile={LIBRARY_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(
      () => {
        expect(screen.getByTestId('stream-feed')).toBeDefined()
      },
      { timeout: 5000 },
    )

    // Rich preview: real block content, readable, no editor mounted.
    expect(screen.getByTestId('stream-feed-preview')).toBeDefined()
    expect(screen.getByText(/21-15-9/)).toBeDefined()
    expect(screen.queryByTestId('stream-feed-playground')).toBeNull()

    // Actions function on the actual entry kind: Open → /playground/:name.
    const openLink = screen.getByTestId('stream-feed-open') as HTMLAnchorElement
    expect(openLink.getAttribute('href')).toBe('/playground/fran-experiment')

    // Playground scope: undated entries are labeled Undated, never shelved
    // as "Catalog Sessions". Asserted BEFORE the Run click — Run navigates
    // to /run/:id, which drops ?q and resets the composer to the profile
    // default (in-app the view unmounts on that navigation).
    expect(screen.getByText('Undated')).toBeDefined()
    expect(screen.queryByText('Catalog Sessions')).toBeNull()

    // Run stages a pending runtime (what WallClockPage consumes) — retaining
    // the entry's Note UUID with playground origin/returnTo — then navigates.
    fireEvent.click(screen.getByTestId('stream-feed-run'))

    await waitFor(() => {
      expect(pendingRuntimes.size).toBe(1)
    })
    const [runtimeId, pending] = [...pendingRuntimes.entries()][0]!
    expect(runtimeId).not.toBe('wod-hash-1')
    expect(pending?.noteId).toBe('uuid-1')
    expect(pending?.origin).toBe('playground')
    expect(pending?.returnTo).toBe('/playground/fran-experiment')
    expect(pending?.block.content).toContain('21-15-9')
    pendingRuntimes.clear()
  })

  it('keeps grouping when switching layouts — groupBy survives mode changes', async () => {
    writeViewSettings('/library', {
      level: 'note',
      layout: 'feed',
      visibleFields: ['title', 'date'],
      groupBy: 'discipline',
    })

    const datedEntries: Entry[] = [
      {
        id: 'note-1',
        kind: 'note',
        sourceCatalog: 'canonical',
        sourceItem: 'item-1',
        title: 'Workout 1',
        date: '2026-09-04',
        tags: ['strength'],
        createdAt: 1_700_000_000_000,
      },
    ]
    const engine = createMockEngine(datedEntries)

    render(
      <MemoryRouter initialEntries={['/library']}>
        <QueriableStreamView profile={LIBRARY_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    await waitFor(
      () => {
        expect(screen.getByTestId('stream-feed')).toBeDefined()
      },
      { timeout: 5000 },
    )
    // Feed renders the shared grouped sections — discipline, not date.
    expect(screen.getByTestId('stream-feed-group-Strength')).toBeDefined()
    expect(screen.queryByTestId('stream-feed-group-2026-09-04')).toBeNull()
  })

  it('feed Playground action persists via the intake helper before navigating', async () => {
    writeViewSettings('/library', {
      level: 'note',
      layout: 'feed',
      visibleFields: ['title', 'date'],
    })

    const ensureMock = mock(() => Promise.resolve({ noteId: 'uuid-9', routeId: 'playground/grace-copy' }))
    mock.module('../../services/createPlaygroundPage', () => ({
      ensurePlaygroundEntry: ensureMock,
      createPlaygroundPage: mock(() => Promise.resolve('x')),
      movePlaygroundToJournal: mock(() => Promise.resolve({})),
    }))

    const originalResolve = journalNotes.resolve
    journalNotes.resolve = mock(async () => ({ id: 'n1', rawContent: '30 Clean & Jerks' }) as any)
    try {
      const catalogEntry: Entry = {
        id: 'crossfit-girls/grace',
        kind: 'session',
        sourceCatalog: 'crossfit-girls',
        sourceItem: 'grace',
        title: 'Grace',
        date: null,
        sourceId: 'collection:crossfit-girls',
      }
      const engine = createMockEngine([catalogEntry])

      render(
        <MemoryRouter initialEntries={['/library']}>
          <QueriableStreamView profile={LIBRARY_STREAM_PROFILE} queryEngine={engine} />
        </MemoryRouter>,
      )

      await waitFor(
        () => {
          expect(screen.getByTestId('stream-feed-playground')).toBeDefined()
        },
        { timeout: 5000 },
      )

      fireEvent.click(screen.getByTestId('stream-feed-playground'))

      await waitFor(() => {
        expect(ensureMock).toHaveBeenCalledWith('30 Clean & Jerks', { title: 'Grace' })
      })
    } finally {
      journalNotes.resolve = originalResolve
    }
  })
})
