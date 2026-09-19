import { LocalStore, InMemoryBackend } from '@/services/storage/LocalStore'
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
  readRouteWqlConfig,
  writeRouteWqlConfig,
  clearRouteWqlConfig,
  applyRouteWqlConfig,
  getRouteWqlStorageKey,
  ROUTE_WQL_STORAGE_PREFIX,
  PALETTE_ROUTE_ID,
  type RouteWqlConfig,
} from './routeWqlConfig'
import { LIBRARY_STREAM_PROFILE } from '../views/stream/streamProfile'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('routeWqlConfig — pure read/write/clear', () => {
  it('returns an empty config when nothing is stored', () => {
    expect(readRouteWqlConfig('/journal')).toEqual({})
  })

  it('round-trips a config per route and isolates routes', () => {
    writeRouteWqlConfig('/journal', { defaultWql: 'find:note last 6w' })
    writeRouteWqlConfig('/library', { typeOptions: ['journal'] })

    expect(readRouteWqlConfig('/journal')).toEqual({ defaultWql: 'find:note last 6w' })
    expect(readRouteWqlConfig('/library')).toEqual({ typeOptions: ['journal'] })
    expect(readRouteWqlConfig('/efforts')).toEqual({})
  })

  it('keys storage like viewSettingsStorage: prefix + /<routeId>', () => {
    expect(getRouteWqlStorageKey('/journal')).toBe(`${ROUTE_WQL_STORAGE_PREFIX}/journal`)
    expect(getRouteWqlStorageKey('journal')).toBe(`${ROUTE_WQL_STORAGE_PREFIX}/journal`)
  })

  it('preserves an empty options array — a deliberate "no predefined options" state', () => {
    writeRouteWqlConfig('/journal', { typeOptions: [] })
    expect(readRouteWqlConfig('/journal')).toEqual({ typeOptions: [] })
  })

  it('drops blank entries and trims values on write', () => {
    writeRouteWqlConfig('/journal', {
      defaultWql: '  find:note last 6w  ',
      typeOptions: ['notes', '  ', 'journal'],
      groupByOptions: ['week', ''],
    })

    expect(readRouteWqlConfig('/journal')).toEqual({
      defaultWql: 'find:note last 6w',
      typeOptions: ['notes', 'journal'],
      groupByOptions: ['week'],
    })
  })

  it('drops blank default WQL on read', () => {
    window.localStorage.setItem(getRouteWqlStorageKey('/journal'), JSON.stringify({ defaultWql: '   ' }))
    expect(readRouteWqlConfig('/journal')).toEqual({})
  })

  it('survives malformed JSON with an empty config', () => {
    window.localStorage.setItem(getRouteWqlStorageKey('/journal'), '{not json')

    expect(readRouteWqlConfig('/journal')).toEqual({})
  })

  it('resolves overrides saved under pre-rename surface ids (legacy alias)', () => {
    // Overrides saved before the /results → /sessions and /dashboard →
    // /dashboards rebrands must still resolve.
    window.localStorage.setItem(
      getRouteWqlStorageKey('/results'),
      JSON.stringify({ defaultWql: 'rows:all{} last 8w' }),
    )
    expect(readRouteWqlConfig('/sessions')).toEqual({ defaultWql: 'rows:all{} last 8w' })

    window.localStorage.setItem(
      getRouteWqlStorageKey('/dashboard'),
      JSON.stringify({ defaultWql: 'rows:all{} last 12w' }),
    )
    expect(readRouteWqlConfig('/dashboards')).toEqual({ defaultWql: 'rows:all{} last 12w' })

    // The new key always wins when both exist
    window.localStorage.setItem(
      getRouteWqlStorageKey('/sessions'),
      JSON.stringify({ defaultWql: 'rows:all{} last 4w' }),
    )
    expect(readRouteWqlConfig('/sessions')).toEqual({ defaultWql: 'rows:all{} last 4w' })
  })

  it('never aliases the other direction — writes land on the new key only', () => {
    writeRouteWqlConfig('/sessions', { defaultWql: 'rows:all{} last 4w' })
    expect(window.localStorage.getItem(getRouteWqlStorageKey('/results'))).toBeNull()
  })

  it('drops non-string garbage from stored arrays', () => {
    window.localStorage.setItem(
      getRouteWqlStorageKey('/journal'),
      JSON.stringify({ typeOptions: ['notes', 42, null, 'journal'] }),
    )
    expect(readRouteWqlConfig('/journal')).toEqual({ typeOptions: ['notes', 'journal'] })
  })

  it('clear removes the stored config', () => {
    writeRouteWqlConfig('/journal', { defaultWql: 'find:note last 6w' })
    clearRouteWqlConfig('/journal')
    expect(readRouteWqlConfig('/journal')).toEqual({})
  })

  it('clear on a renamed surface also clears the legacy key — a reset must not resurrect', () => {
    window.localStorage.setItem(
      getRouteWqlStorageKey('/results'),
      JSON.stringify({ defaultWql: 'rows:all{} last 8w' }),
    )
    clearRouteWqlConfig('/sessions')
    expect(readRouteWqlConfig('/sessions')).toEqual({})
  })
})

describe('routeWqlConfig — resolution', () => {
  it('overrides profile defaultWql and typeOptions per field', () => {
    writeRouteWqlConfig('/library', { defaultWql: 'find:note{source:feeds} last 1w' })
    const applied = applyRouteWqlConfig(LIBRARY_STREAM_PROFILE)

    expect(applied.defaultWql).toBe('find:note{source:feeds} last 1w')
    // Unconfigured fields keep the system value.
    expect(applied.typeOptions).toEqual(LIBRARY_STREAM_PROFILE.typeOptions)
    expect(applied.route).toBe('/library')
  })

  it('replaces typeOptions wholesale, including the empty nudge state', () => {
    writeRouteWqlConfig('/library', { typeOptions: [] })
    expect(applyRouteWqlConfig(LIBRARY_STREAM_PROFILE).typeOptions).toEqual([])

    writeRouteWqlConfig('/library', { typeOptions: ['feeds'] })
    expect(applyRouteWqlConfig(LIBRARY_STREAM_PROFILE).typeOptions).toEqual(['feeds'])
  })

  it('returns the same profile object when no config exists', () => {
    expect(applyRouteWqlConfig(LIBRARY_STREAM_PROFILE)).toBe(LIBRARY_STREAM_PROFILE)
  })

  it('exposes the palette as a configurable synthetic route id', () => {
    expect(PALETTE_ROUTE_ID).toBe('/palette')
    writeRouteWqlConfig(PALETTE_ROUTE_ID, { defaultWql: 'find:note{text:fran}' })
    expect(readRouteWqlConfig(PALETTE_ROUTE_ID).defaultWql).toBe('find:note{text:fran}')
  })
})

describe('routeWqlConfig — type shape', () => {
  it('stores only the three override fields', () => {
    const config: RouteWqlConfig = { defaultWql: 'find:note', typeOptions: ['notes'], groupByOptions: ['week'] }
    writeRouteWqlConfig('/library', config)
    expect(Object.keys(readRouteWqlConfig('/library')).sort()).toEqual([
      'defaultWql',
      'groupByOptions',
      'typeOptions',
    ])
  })
})

describe('routeWqlConfig — dependency inversion', () => {
  it('operates against an injected InMemoryBackend without window globals', () => {
    const inMemory = new LocalStore(ROUTE_WQL_STORAGE_PREFIX, new InMemoryBackend())
    writeRouteWqlConfig('/custom', { defaultWql: 'find:note{source:feeds}' }, inMemory)
    expect(readRouteWqlConfig('/custom', inMemory).defaultWql).toBe('find:note{source:feeds}')
    clearRouteWqlConfig('/custom', inMemory)
    expect(readRouteWqlConfig('/custom', inMemory)).toEqual({})
  })
})
