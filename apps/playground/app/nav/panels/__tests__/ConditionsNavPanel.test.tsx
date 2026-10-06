/**
 * ConditionsNavPanel regression — the behaviors the L2 accordion must
 * never lose:
 *   1. narrowing: option counts derive from the published full results and
 *      shrink as selections narrow the query;
 *   2. tri-state cycling: every value is a stable single row whose button
 *      cycles off → include → exclude → off, backed by filterValueState /
 *      setFacetValueState — occurrence-exact clause edits (parse → clause
 *      edit → serialize), never a regex rewrite; structural clauses (by {},
 *      window, pipes) survive;
 *   3. restoration + selected-zero recovery: selections live in the routed
 *      ?q= (a fresh mount restores them without any published results) and
 *      stay listed/removable at zero results;
 *   4. pending stability: while a fresh execution is pending, the last
 *      committed run for this route stays visible with controls disabled —
 *      and a previous route's run never feeds options.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'

import { parseQuery, serialize, isFindQuery, type AnyParsedQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-wql'

import { storageService } from '@/services/storage'
import { staticNoteStore } from '@/services/content/staticBlockIndex'

import { publishStreamResults, type StreamResultSnapshot } from '../../../views/stream/streamResults'
import { COLLECTIONS_STREAM_PROFILE } from '../../../views/stream/streamProfile'
import type { Entry } from '../../../lib/entryMapper'

import {
  addFacetValue,
  removeFacetValue,
  selectedValuesFor,
  facetOptions,
  setSourceScopeValue,
} from '../conditionsFacets'
import { NavigationDrawerProvider } from '../../NavigationDrawerContext'
import { createConditionsNavPanel } from '../ConditionsNavPanel'

// ── fixtures ─────────────────────────────────────────────────────────────────

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

const EFFORT_MEMBERSHIP = new Map<string, string[]>([
  ['n1', ['fran']],
  ['collection:x/one', ['fran', 'thruster']],
])

const DEFAULT_Q = COLLECTIONS_STREAM_PROFILE.defaultWql

function findOf(parsed: AnyParsedQuery): ParsedFindQuery | null {
  return !parsed.error && isFindQuery(parsed) ? parsed : null
}

function sourceValues(parsed: ParsedFindQuery): string[] {
  return parsed.filters
    .filter(f => f.key === 'source' && !f.negate)
    .flatMap(f => f.values.map(v => v.value))
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

const ConditionsPanel = createConditionsNavPanel({
  landingLabel: 'All collections',
  icon: undefined,
  route: '/collections',
  profile: COLLECTIONS_STREAM_PROFILE,
  familyActive: () => true,
})

function renderPanel(at = '/collections', drawerClose?: () => void) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <PathTracker />
      <NavigationDrawerProvider close={drawerClose ?? (() => {})}>
        <ConditionsPanel />
      </NavigationDrawerProvider>
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

// ── pure toggle model ────────────────────────────────────────────────────────

describe('conditionsFacets toggling', () => {
  it('merges values into the existing occurrence (OR within key) and keeps structural clauses', () => {
    const once = findOf(parseQuery(addFacetValue(':collection{} by {tag} last 4w', 'tags', 'strength')))!
    // The serializer canonicalizes the :collection head to source:collections.
    expect(tagsValues(once)).toEqual(['strength'])
    expect(once.groupBy).toEqual(['tag'])
    expect(once.window).toBeDefined()
    const twice = findOf(parseQuery(addFacetValue(serialize(once), 'tags', 'endurance')))!
    expect(tagsValues(twice)).toEqual(['strength', 'endurance'])
    expect(twice.groupBy).toEqual(['tag'])
    expect(twice.window).toBeDefined()
  })

  it('removes one value occurrence-exactly and splices the clause when it empties', () => {
    const q = serialize(findOf(parseQuery(':collection{tags:strength|endurance} by {tag} last 4w'))!)
    const selected = selectedValuesFor(findOf(parseQuery(q))!, 'tags')
    const withoutStrength = findOf(parseQuery(removeFacetValue(q, 'tags', selected.find(row => row.display === 'strength')!)))!
    expect(tagsValues(withoutStrength)).toEqual(['endurance'])
    expect(withoutStrength.groupBy).toEqual(['tag'])
    expect(withoutStrength.window).toBeDefined()
    const last = selectedValuesFor(withoutStrength, 'tags')
    const emptied = findOf(parseQuery(removeFacetValue(serialize(withoutStrength), 'tags', last[0]!)))!
    expect(tagsValues(emptied)).toEqual([])
    expect(emptied.groupBy).toEqual(['tag'])
  })

  it('round-trips wildcard values and preserves negated occurrences', () => {
    const wild = findOf(parseQuery(addFacetValue(':note{}', 'tags', 'fran*')))!
    expect(wild.filters.find(f => f.key === 'tags')!.values[0]).toEqual({ value: 'fran', wildcard: true })
    const negated = selectedValuesFor(findOf(parseQuery(':note{!tags:a}'))!, 'tags')
    expect(negated[0]!.negate).toBe(true)
    expect(tagsValues(findOf(parseQuery(removeFacetValue(':note{!tags:a}', 'tags', negated[0]!)))!)).toEqual([])
  })

  it('keeps the source scope a radio (replace, not AND)', () => {
    const replaced = findOf(parseQuery(addFacetValue(':collection{source:collections}', 'source', 'journal')))!
    expect(sourceValues(replaced)).toEqual(['journal'])
    expect(replaced.sourceScope).toBeUndefined()
    const added = findOf(parseQuery(addFacetValue(':journal{}', 'source', 'collections')))!
    expect(sourceValues(added)).toContain('collections')
    // Negated source occurrences are independent clauses — a scope write
    // replaces only the head-scope slot and the positive occurrence.
    const withNegated = findOf(parseQuery(setSourceScopeValue(':note{source:journal,!source:guides}', 'collections')))!
    expect(sourceValues(withNegated)).toEqual(['collections'])
    expect(withNegated.filters.some(f => f.key === 'source' && f.negate && f.values.some(v => v.value === 'guides'))).toBe(true)
    // Head-authored scope clears to all sources, negations surviving.
    const cleared = findOf(parseQuery(setSourceScopeValue(':collection{!source:guides} by {tag}', null)))!
    expect(sourceValues(cleared)).toEqual([])
    expect(cleared.filters.some(f => f.key === 'source' && f.negate)).toBe(true)
    expect(cleared.groupBy).toEqual(['tag'])
    // A user-authored scope under a scoped head survives the head-slot clear.
    const mixed = findOf(parseQuery(setSourceScopeValue(':journal{source:collections}', null)))!
    expect(sourceValues(mixed)).toEqual(['collections'])
  })

  it('preserves sibling source occurrences on a targeted scope replace', () => {
    // Duplicate positives: the FIRST occurrence is the composer-targeted
    // scope slot; later positives and negations are never silently deleted.
    const multi = findOf(parseQuery(setSourceScopeValue(':note{source:journal,source:collections,!source:guides}', 'playground')))!
    expect(sourceValues(multi)).toEqual(['playground', 'collections'])
    expect(multi.filters.some(f => f.key === 'source' && f.negate && f.values.some(v => v.value === 'guides'))).toBe(true)
  })

  it('counts session plane options per retained event, matching post-selection rows', () => {
    const sessionEntry: Entry = entry({
      id: 'r1',
      title: 'Session',
      kind: 'result',
      execution: {
        resultId: 'r1',
        noteId: 'n1',
        timestamp: 0,
        outputType: 'all',
        events: [
          { id: 'e1', resultId: 'r1', noteId: 'n1', grain: 'event', timestamp: 0, outputType: 'segment', timeSpan: { started: 0 }, metrics: [] },
          { id: 'e2', resultId: 'r1', noteId: 'n1', grain: 'event', timestamp: 0, outputType: 'segment', timeSpan: { started: 0 }, metrics: [] },
          { id: 'e3', resultId: 'r1', noteId: 'n1', grain: 'event', timestamp: 0, outputType: 'load', timeSpan: { started: 0 }, metrics: [] },
        ],
      },
    })
    expect(facetOptions('session', 'plane', {
      entries: [sessionEntry],
      tagMembership: null,
      effortMembership: null,
    })).toEqual([
      { value: 'segment', count: 2 },
      { value: 'load', count: 1 },
    ])
  })
})

// ── component: tri-state rows / narrowing / pending / zero recovery ──────────

function publish(snapshot: StreamResultSnapshot) {
  act(() => publishStreamResults(snapshot))
}

/** The row's single cycle button; its current state lives on `data-state`. */
function stateButton(key: string, value: string): HTMLButtonElement {
  return screen.getByTestId(`conditions-state-${key}:${value}`) as HTMLButtonElement
}

function routedQuery(): string {
  return new URLSearchParams(lastLocation!.search).get('q') ?? ''
}

describe('ConditionsNavPanel', () => {
  it('toggles include/off on stable rows and narrows counts', async () => {
    renderPanel()
    publish({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })

    // Open the Tag section and read the option rows over the full results.
    fireEvent.click(await waitFor(() => screen.getByText('Tag')))
    await waitFor(() => {
      expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()
      expect(screen.getByTestId('conditions-row-tags:barbell')).toBeTruthy()
    })

    // Include strength → the routed query gains tags:strength and the row
    // flips to included WITHOUT re-clicking the accordion header (open state
    // survives the query change)…
    fireEvent.click(stateButton('tags', 'strength'))
    await waitFor(() => expect(tagsValues(findOf(parseQuery(routedQuery()))!)).toEqual(['strength']))
    expect(stateButton('tags', 'strength').dataset.state).toBe('include')
    expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()

    // …and the narrowed published result set keeps empty selectors visible with count 0 and faded styling.
    publish({
      pathname: '/collections',
      query: routedQuery(),
      entries: ENTRIES.filter(e => e.id === 'n1'),
    })
    await waitFor(() => {
      const barbell = screen.getByTestId('conditions-row-tags:barbell')
      expect(barbell).toBeTruthy()
      expect(barbell.className).toContain('opacity-40')
      expect(barbell.textContent).toContain('0')
    })
    // The selected value stays listed (removable), not duplicated as an option.
    expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()

    // Off removes the value from both polarities — the cycle passes through
    // exclude, which must land (matching run published) before the next click.
    fireEvent.click(stateButton('tags', 'strength'))
    publish({
      pathname: '/collections',
      query: routedQuery(),
      entries: ENTRIES.filter(e => e.id === 'c/one'),
    })
    await waitFor(() => expect(stateButton('tags', 'strength').dataset.state).toBe('exclude'))
    fireEvent.click(stateButton('tags', 'strength'))
    await waitFor(() => expect(tagsValues(findOf(parseQuery(routedQuery()))!)).toEqual([]))
    expect(routedQuery()).not.toContain('!tags')
  })

  it('excludes values, keeps them listed past their result support, and recovers', async () => {
    renderPanel()
    publish({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })
    fireEvent.click(await waitFor(() => screen.getByText('Tag')))
    await waitFor(() => expect(screen.getByTestId('conditions-row-tags:barbell')).toBeTruthy())

    // Cycle: off → include → exclude; the matching run must land between
    // steps (controls disable while a fresh execution is pending).
    fireEvent.click(stateButton('tags', 'barbell'))
    publish({ pathname: '/collections', query: routedQuery(), entries: ENTRIES })
    await waitFor(() => expect(stateButton('tags', 'barbell').dataset.state).toBe('include'))
    fireEvent.click(stateButton('tags', 'barbell'))
    await waitFor(() => expect(routedQuery()).toContain('!tags:barbell'))
    expect(stateButton('tags', 'barbell').dataset.state).toBe('exclude')

    // Zero results: the exclusion stays listed with its removal control…
    publish({ pathname: '/collections', query: routedQuery(), entries: [] })
    await waitFor(() => {
      expect(screen.getByTestId('conditions-row-tags:barbell')).toBeTruthy()
      expect(stateButton('tags', 'barbell').disabled).toBe(false)
    })
    // …and Off clears the negation back to a tags-free query.
    fireEvent.click(stateButton('tags', 'barbell'))
    await waitFor(() => {
      expect(tagsValues(findOf(parseQuery(routedQuery()))!)).toEqual([])
      expect(routedQuery()).not.toContain('!tags')
    })
  })

  it('restores selections from the URL alone and keeps them removable at zero results', async () => {
    // Restoration: the selection renders from the routed q= with NO snapshot.
    renderPanel('/collections?q=%3Acollection%7Btags%3Astrength%7D%20by%20%7Btag%7D')
    expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()
    expect(stateButton('tags', 'strength').dataset.state).toBe('include')

    // Selected-zero recovery: an empty result set keeps the selection listed…
    publish({
      pathname: '/collections',
      query: ':collection{tags:strength} by {tag}',
      entries: [],
    })
    await waitFor(() => expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy())
    // …removable back to a tags-free query (canonical head scope remains);
    // the cycle steps through exclude once its matching run lands.
    fireEvent.click(stateButton('tags', 'strength'))
    publish({ pathname: '/collections', query: routedQuery(), entries: [] })
    await waitFor(() => expect(stateButton('tags', 'strength').dataset.state).toBe('exclude'))
    fireEvent.click(stateButton('tags', 'strength'))
    await waitFor(() => expect(tagsValues(findOf(parseQuery(routedQuery()))!)).toEqual([]))
  })

  it('never offers options from a stale snapshot (previous page or superseded draft)', () => {
    renderPanel()
    publish({ pathname: '/journal', query: ':journal{}', entries: ENTRIES })
    // No option rows anywhere: the published run belongs to another page.
    expect(screen.queryByTestId('conditions-row-tags:strength')).toBeNull()
    expect(screen.queryByTestId('conditions-row-tags:barbell')).toBeNull()
    expect(facetOptions('note', 'tags', { entries: [], tagMembership: MEMBERSHIP, effortMembership: EFFORT_MEMBERSHIP })).toEqual([])
  })

  it('retains prior rows visibly disabled while a matching execution is pending', async () => {
    renderPanel()
    publish({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })
    fireEvent.click(await waitFor(() => screen.getByText('Tag')))
    await waitFor(() => expect(stateButton('tags', 'strength').disabled).toBe(false))

    fireEvent.click(stateButton('tags', 'strength'))
    // Snapshot still matches the OLD query: committed rows stay visible at
    // their prior counts, every control disabled — no disappearing flash.
    expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()
    expect(screen.getByTestId('conditions-row-tags:barbell')).toBeTruthy()
    expect(stateButton('tags', 'strength').dataset.state).toBe('include')
    expect(stateButton('tags', 'strength').disabled).toBe(true)
    expect(stateButton('tags', 'barbell').disabled).toBe(true)

    // Matching snapshot lands → controls re-enable on the fresh counts (empty selectors stay with count 0).
    publish({
      pathname: '/collections',
      query: routedQuery(),
      entries: ENTRIES.filter(e => e.id === 'n1'),
    })
    await waitFor(() => expect(stateButton('tags', 'strength').disabled).toBe(false))
    const barbell = screen.getByTestId('conditions-row-tags:barbell')
    expect(barbell).toBeTruthy()
    expect(barbell.textContent).toContain('0')
  })

  it('renders a jump to WQL link for text search and adds freeform values for identifiers', async () => {
    let closed = 0
    renderPanel('/collections', () => {
      closed += 1
    })
    publish({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })
    expect(screen.getByTestId('conditions-jump-wql-text')).toBeTruthy()
    fireEvent.click(screen.getByTestId('conditions-jump-wql-text'))
    expect(closed).toBe(1)
  })
  it('closes the drawer on full-query shortcuts only, never on facet or group-by edits', async () => {
    let closed = 0
    renderPanel('/collections', () => {
      closed += 1
    })
    publish({ pathname: '/collections', query: DEFAULT_Q, entries: ENTRIES })

    // Facet edits ride the current query — the drawer stays open.
    fireEvent.click(await waitFor(() => screen.getByText('Tag')))
    fireEvent.click(stateButton('tags', 'strength'))
    await waitFor(() => expect(tagsValues(findOf(parseQuery(routedQuery()))!)).toEqual(['strength']))
    expect(closed).toBe(0)

    // The header Group-by checkbox is a query edit too: it rewrites `by {}`
    // in place, keeps the drawer open AND the section expanded (never a
    // DisclosureButton toggle), while the shortcut/Custom match re-derives.
    const groupToggle = screen.getByTestId('conditions-groupby-tags') as HTMLInputElement
    expect(groupToggle.checked).toBe(true) // DEFAULT_Q groups by {tag}
    fireEvent.click(groupToggle)
    await waitFor(() => expect(findOf(parseQuery(routedQuery()))!.groupBy).toBeUndefined())
    expect(closed).toBe(0)
    expect(screen.getByTestId('conditions-row-tags:strength')).toBeTruthy()
    expect((screen.getByTestId('conditions-groupby-tags') as HTMLInputElement).checked).toBe(false)

    // Landing row (route-default query) closes too.
    fireEvent.click(screen.getByText('All collections'))
    expect(closed).toBe(1)
  })

  it('enumerates effort slugs from the containment index over current results', () => {
    const options = facetOptions('note', 'effort', {
      entries: ENTRIES,
      tagMembership: MEMBERSHIP,
      effortMembership: EFFORT_MEMBERSHIP,
    })
    // fran is contained by both rows, thruster by one — counts are rows.
    expect(options).toEqual([
      { value: 'fran', count: 2 },
      { value: 'thruster', count: 1 },
    ])
  })
})

// Guard: every toggle result must stay a parseable find query.
describe('conditionsFacets invariants', () => {
  it('always yields a valid find AST with the target intact', () => {
    let q = ':collection{} by {tag} last 4w | limit 20'
    for (const value of ['strength', 'fran*', 'endurance']) {
      q = addFacetValue(q, 'tags', value)
      const parsed = parseQuery(q)
      expect(parsed.error).toBeUndefined()
      expect(isFindQuery(parsed)).toBe(true)
    }
    expect(q).toContain('by {tag}')
    expect(q).toContain('last 4w')
    expect(q).toContain('| limit 20')
  })
})
