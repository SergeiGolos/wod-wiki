import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueriableStreamView } from './QueriableStreamView'
import { EFFORTS_STREAM_PROFILE, JOURNAL_STREAM_PROFILE } from './streamProfile'
import { StreamQueryEngine } from '../../lib/entrySearch'
import { writeViewSettings } from '../../lib/viewSettingsStorage'
import type { Entry } from '../../lib/entryMapper'

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

  it('renders sticky header with profile title and subtitle', async () => {
    const engine = createMockEngine([])

    render(
      <MemoryRouter initialEntries={['/efforts']}>
        <QueriableStreamView profile={EFFORTS_STREAM_PROFILE} queryEngine={engine} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('queriable-stream-view')).toBeDefined()
    expect(screen.getByText('Efforts')).toBeDefined()
    expect(screen.getByText('Catalog of registered movements, benchmarks, and standards.')).toBeDefined()
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

  it('renders entries in property table layout when settings.layout is table', async () => {
    writeViewSettings('/efforts', {
      level: 'effort',
      layout: 'table',
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
})
