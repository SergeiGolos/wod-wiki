/**
 * SecondaryNav properties — the L3 right rail surfaces the SAME facet model
 * as the L2 conditions panel on stream routes:
 *   1. a "Properties" block renders the facet accordion for the current
 *      route's profile (recent-* WQL listing menus are gone);
 *   2. clicking a value edits the routed ?q= (WQL change on the current
 *      view) — the consumer-visible contract of the L3 properties.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { NuqsAdapter } from 'nuqs/adapters/react-router'
import { parseQuery, isFindQuery, type AnyParsedQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-wql'

import { storageService } from '@/services/storage'
import { staticNoteStore } from '@/services/content/staticBlockIndex'

import { publishStreamResults } from '../../views/stream/streamResults'
import { COLLECTIONS_STREAM_PROFILE } from '../../views/stream/streamProfile'
import type { Entry } from '../../lib/entryMapper'

import { NavContext, initialNavState } from '../NavContext'
import { SecondaryNav } from '../SecondaryNav'

const entry = (over: Partial<Entry> & { id: string; title: string }): Entry => ({
  kind: 'note',
  sourceCatalog: 'journal',
  sourceItem: over.id,
  date: null,
  ...over,
})

const ENTRIES: Entry[] = [
  entry({ id: 'n1', noteId: 'n1', noteType: 'note', title: 'Alpha' }),
  entry({ id: 'c/one', noteId: 'collection:x/one', sourceId: 'collection:x', noteType: 'note', title: 'Beta' }),
]

const MEMBERSHIP = new Map<string, Array<{ label: string; type?: string }>>([
  ['n1', [{ label: 'strength' }]],
  ['collection:x/one', [{ label: 'barbell', type: 'equipment' }]],
])

const EFFORT_MEMBERSHIP = new Map<string, string[]>([['n1', ['fran']]])

const DEFAULT_Q = COLLECTIONS_STREAM_PROFILE.defaultWql

function findOf(parsed: AnyParsedQuery): ParsedFindQuery | null {
  return !parsed.error && isFindQuery(parsed) ? parsed : null
}

function tagsValues(parsed: ParsedFindQuery): string[] {
  return parsed.filters
    .filter(f => f.key === 'tags' && !f.negate)
    .flatMap(f => f.values.map(v => v.value))
}

let lastLocation: Location | null = null
function PathTracker() {
  lastLocation = useLocation()
  return null
}

function navValue() {
  return {
    tree: [],
    navState: initialNavState,
    dispatch: () => {},
    l3Items: [],
    setL3Items: () => {},
    secondarySpec: undefined,
    setSecondarySpec: () => {},
    streamControls: undefined,
    setStreamControls: () => {},
    scrollToSection: () => {},
    registerScrollFn: () => {},
    openCreateJournal: () => {},
    registerCreateJournal: () => () => {},
  }
}

function renderRail(at = '/collections') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <NuqsAdapter>
        <PathTracker />
        <NavContext.Provider value={navValue()}>
          <SecondaryNav />
        </NavContext.Provider>
      </NuqsAdapter>
    </MemoryRouter>,
  )
}

const originalGetNoteTagLabelsBatch = storageService.getNoteTagLabelsBatch
const originalGetEffortSlugsByNoteBatch = storageService.getEffortSlugsByNoteBatch
const originalStaticGetAllNotes = staticNoteStore.getAllNotes

beforeEach(() => {
  lastLocation = null
  storageService.getNoteTagLabelsBatch = async () => MEMBERSHIP
  storageService.getEffortSlugsByNoteBatch = async () => EFFORT_MEMBERSHIP
  staticNoteStore.getAllNotes = async () => []
})

afterEach(() => {
  cleanup()
  storageService.getNoteTagLabelsBatch = originalGetNoteTagLabelsBatch
  storageService.getEffortSlugsByNoteBatch = originalGetEffortSlugsByNoteBatch
  staticNoteStore.getAllNotes = originalStaticGetAllNotes
})

describe('SecondaryNav properties on stream routes', () => {
  it('renders the facet accordion in L3 — no recent-* listing menus', () => {
    renderRail()
    publishStreamResults({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })
    expect(screen.getByTestId('l3-properties')).toBeTruthy()
    expect(screen.getByText('Properties')).toBeTruthy()
    expect(screen.queryByText('Recent entries')).toBeNull()
    expect(screen.queryByText('Recent sessions')).toBeNull()
    expect(screen.queryByText('Recent playground pages')).toBeNull()
  })

  it('edits the routed WQL when a facet value is cycled', async () => {
    renderRail()
    publishStreamResults({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })
    fireEvent.click(await waitFor(() => screen.getByText('Tag')))
    const stateButton = () => screen.getByTestId('conditions-state-tags:strength') as HTMLButtonElement
    await waitFor(() => expect(stateButton().disabled).toBe(false))
    fireEvent.click(stateButton())
    await waitFor(() =>
      expect(tagsValues(findOf(parseQuery(new URLSearchParams(lastLocation!.search).get('q') ?? ''))!)).toEqual([
        'strength',
      ]),
    )
    await waitFor(() => expect(stateButton().dataset.state).toBe('include'))
  })

  it('renders nothing L3-specific on non-stream routes', () => {
    renderRail('/settings/system')
    expect(screen.queryByTestId('l3-properties')).toBeNull()
    expect(screen.queryByText('Properties')).toBeNull()
  })
})
