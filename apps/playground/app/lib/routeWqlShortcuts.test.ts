/**
 * routeWqlShortcuts — the behaviors the shortcut seam must never lose:
 * persistence across reloads (fresh store over the same backend), built-in
 * library-group links (landing, Feeds route action) with stored-list
 * authority, shape validation on read, read-back-verified writes (storage
 * failures are NOT successes and lose no data), reactive notification, and
 * full-query matching that is PERMUTATION-INSENSITIVE on WHERE filter items
 * (and occurrence values) plus GROUP BY dimensions, while negation, windows
 * and pipes keep their identity — so reordered queries match their saved
 * selector and no Custom row appears, but a custom filter never matches the
 * base All link.
 *
 * Run: bun test app/lib/routeWqlShortcuts.test.ts
 */
import { describe, it, expect } from 'bun:test'
import { LocalStore, InMemoryBackend, type StorageBackend } from '@/services/storage/LocalStore'
import {
  ALL_SHORTCUT_ID,
  FEEDS_ID,
  ROUTE_SHORTCUTS_STORAGE_PREFIX,
  builtinShortcuts,
  readRouteShortcuts,
  resolveRouteShortcuts,
  writeRouteShortcuts,
  resetRouteShortcuts,
  shortcutMatches,
  shortcutMatchesQuery,
  subscribeRouteShortcuts,
  routeShortcutsVersion,
  defaultLandingShortcut,
  type WqlShortcut,
} from './routeWqlShortcuts'

const SC: WqlShortcut = { id: 'strength-month', label: 'Strength this month', icon: 'dumbbell', wql: ':note{tags:strength} by {week}' }
const LANDING = ':note{} last 4w'
const CTX = { pathname: '/journal', query: '' }

function storeOn(backend: StorageBackend) {
  return new LocalStore(ROUTE_SHORTCUTS_STORAGE_PREFIX, backend)
}

describe('routeWqlShortcuts — persistence', () => {
  it('returns an empty list when nothing is stored (the built-in landing stands)', () => {
    expect(readRouteShortcuts('/journal', storeOn(new InMemoryBackend()))).toEqual([])
  })

  it('round-trips per route and survives a "reload" (fresh store, same backend)', () => {
    const backend = new InMemoryBackend()
    writeRouteShortcuts('/journal', [SC], storeOn(backend))
    writeRouteShortcuts('/efforts', [{ ...SC, id: 'x', wql: ':effort{}' }], storeOn(backend))

    const reloaded = readRouteShortcuts('/journal', storeOn(backend))
    expect(reloaded).toEqual([SC])
    expect(readRouteShortcuts('/efforts', storeOn(backend))).toHaveLength(1)
    expect(readRouteShortcuts('/collections', storeOn(backend))).toEqual([])
  })

  it('normalizes route ids without a leading slash', () => {
    const backend = new InMemoryBackend()
    writeRouteShortcuts('journal', [SC], storeOn(backend))
    expect(readRouteShortcuts('/journal', storeOn(backend))).toEqual([SC])
  })

  it('reset discards the stored list so the built-in landing stands again', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    writeRouteShortcuts('/journal', [defaultLandingShortcut('All entries', 'calendar'), SC], store)
    resetRouteShortcuts('/journal', store)
    expect(readRouteShortcuts('/journal', store)).toEqual([])
  })
})

describe('routeWqlShortcuts — built-in library-group links', () => {
  it('derive the landing plus the zone route action (Collections: Feeds)', () => {
    expect(builtinShortcuts('/journal')).toEqual([
      { id: ALL_SHORTCUT_ID, label: 'All entries', icon: 'calendar', wql: '' },
    ])
    expect(builtinShortcuts('/collections')).toEqual([
      { id: ALL_SHORTCUT_ID, label: 'All collections', icon: 'folder', wql: '' },
      { id: FEEDS_ID, label: 'Feeds', icon: 'rss', wql: '', to: '/feeds' },
    ])
  })

  it('resolve to built-ins until stored, then the stored list is authoritative (delete-all included)', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    expect(resolveRouteShortcuts('/journal', store)).toEqual(builtinShortcuts('/journal'))

    expect(writeRouteShortcuts('/journal', [], store)).toBe(true)
    expect(resolveRouteShortcuts('/journal', store)).toEqual([])

    resetRouteShortcuts('/journal', store)
    expect(resolveRouteShortcuts('/journal', store)).toEqual(builtinShortcuts('/journal'))
  })

  it('a first user save keeps the built-ins (resolve feeds the upsert)', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    const next = [...resolveRouteShortcuts('/journal', store), SC]
    expect(writeRouteShortcuts('/journal', next, store)).toBe(true)
    expect(resolveRouteShortcuts('/journal', store).map(s => s.id)).toEqual([ALL_SHORTCUT_ID, SC.id])
  })
})

describe('routeWqlShortcuts — validation on read', () => {
  it('drops non-object rows and rows without a nonempty label, known icon, string wql, or unique id', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    store.set('/journal', [
      null,
      7,
      'garbage',
      [['nested']],
      { id: 'a', label: '   ', icon: 'star', wql: ':note{}' },
      { id: 'b', label: 'No icon', icon: 'rocket', wql: ':note{}' },
      { id: 'c', label: 'No query', icon: 'star' },
      { id: 'd', label: 'Ok', icon: 'star', wql: ':note{}' },
      { id: 'd', label: 'Duplicate', icon: 'star', wql: ':effort{}' },
    ])
    expect(readRouteShortcuts('/journal', store)).toEqual([{ id: 'd', label: 'Ok', icon: 'star', wql: ':note{}' }])
  })

  it('drops unsafe route-action targets — not paths or protocol-relative off-site navigations', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    store.set('/collections', [
      { id: 'a', label: 'Protocol-relative', icon: 'rss', wql: '', to: '//evil.example' },
      { id: 'b', label: 'Not a path', icon: 'rss', wql: '', to: 'https://evil.example' },
      { id: 'c', label: 'Feeds ok', icon: 'rss', wql: '', to: '/feeds' },
    ])
    expect(readRouteShortcuts('/collections', store).map(s => s.id)).toEqual(['c'])
  })

  it('a non-array or unparseable payload reads as empty, never throws', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    store.setRaw('/journal', '{"not":"an array"}')
    expect(readRouteShortcuts('/journal', store)).toEqual([])
    store.setRaw('/journal', 'not json')
    expect(readRouteShortcuts('/journal', store)).toEqual([])
  })
})

describe('routeWqlShortcuts — verified writes', () => {
  it('reports failure and keeps prior data when the backend drops the write', () => {
    const backend = new InMemoryBackend()
    const store = storeOn(backend)
    expect(writeRouteShortcuts('/journal', [SC], store)).toBe(true)

    const broken: StorageBackend = {
      getItem: key => backend.getItem(key),
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: key => backend.removeItem(key),
    }
    const failing = storeOn(broken)
    expect(writeRouteShortcuts('/journal', [{ ...SC, id: 'other' }], failing)).toBe(false)
    // The failing store shares the backend for reads: the prior list is
    // intact — a failed write loses no data and is not reported as saved.
    expect(readRouteShortcuts('/journal', failing)).toEqual([SC])
  })

  it('silently-losing backends (no throw, no write) are detected as failures', () => {
    const silent: StorageBackend = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    expect(writeRouteShortcuts('/journal', [SC], storeOn(silent))).toBe(false)
  })

  it('notifies subscribers only on successful writes', () => {
    const store = storeOn(new InMemoryBackend())
    let notifications = 0
    const before = routeShortcutsVersion()
    const unsubscribe = subscribeRouteShortcuts(() => {
      notifications++
    })
    writeRouteShortcuts('/journal', [SC], store)
    expect(notifications).toBe(1)
    expect(routeShortcutsVersion()).toBe(before + 1)

    const silent: StorageBackend = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    writeRouteShortcuts('/journal', [SC], storeOn(silent))
    expect(notifications).toBe(1)
    unsubscribe()
  })
})

describe('routeWqlShortcuts — permutation-insensitive full-query matching', () => {
  it("'' matches only the landing state, never a real query", () => {
    expect(shortcutMatchesQuery('', '')).toBe(true)
    expect(shortcutMatchesQuery('', ' ')).toBe(true)
    expect(shortcutMatchesQuery('', ':note{}')).toBe(false)
    expect(shortcutMatchesQuery(':note{}', '')).toBe(false)
  })

  it('reordered WHERE items, occurrence values, and group dimensions are the same query', () => {
    const saved = ':effort{discipline:bodyweight,intensity:high} by {discipline,intensity}'
    expect(shortcutMatchesQuery(saved, ':effort{intensity:high,discipline:bodyweight} by {intensity,discipline}')).toBe(true)
    // Whitespace / canonical-brace differences match (serializer fixed point).
    expect(shortcutMatchesQuery(':note{} by {tag}', ':note by {tag}')).toBe(true)
  })

  it('negation, windows, and pipes keep their identity — different meaning never matches', () => {
    expect(shortcutMatchesQuery(':note{!tags:x}', ':note{tags:x}')).toBe(false)
    expect(shortcutMatchesQuery(':note{} last 4w', ':note{}')).toBe(false)
    expect(shortcutMatchesQuery(':note{tags:strength} by {week}', ':note{tags:strength} by {month}')).toBe(false)
    // A custom filter never matches the base All link.
    expect(shortcutMatches(defaultLandingShortcut('All entries', 'calendar'), { ...CTX, query: ':note{tags:x}' })).toBe(false)
  })

  it('route actions match by pathname; the Main-contract example round-trips', () => {
    const feeds = builtinShortcuts('/collections').find(s => s.to)!
    expect(shortcutMatches(feeds, { ...CTX, pathname: '/feeds' })).toBe(true)
    expect(shortcutMatches(feeds, { ...CTX, pathname: '/feed/abc' })).toBe(false)
    expect(shortcutMatches(feeds, { ...CTX, pathname: '/journal' })).toBe(false)

    const grouped = ':effort{discipline:bodyweight,intensity:high} by {discipline,intensity}'
    const shuffled = ':effort{intensity:high,discipline:bodyweight} by {intensity,discipline}'
    expect(shortcutMatches({ ...SC, wql: grouped }, { ...CTX, query: shuffled })).toBe(true)
  })
})
