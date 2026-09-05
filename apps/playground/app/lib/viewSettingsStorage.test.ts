import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import {
  readViewSettings,
  writeViewSettings,
  resetViewSettings,
  useViewSettings,
  VIEW_SETTINGS_STORAGE_PREFIX,
  type ViewSettings,
} from './viewSettingsStorage'
import { getDefaultVisibleFieldIds } from './fieldProjection'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('viewSettingsStorage — pure read/write/reset', () => {
  it('returns default view settings when localStorage is empty', () => {
    const settings = readViewSettings('/journal', 'note')
    expect(settings.layout).toBe('cards')
    expect(settings.level).toBe('note')
    expect(settings.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))
  })

  it('persists and recovers custom view settings per route', () => {
    const custom: ViewSettings = {
      level: 'note',
      layout: 'rows',
      visibleFields: ['title', 'date'],
    }
    writeViewSettings('/journal', custom)

    const raw = window.localStorage.getItem(`${VIEW_SETTINGS_STORAGE_PREFIX}/journal`)
    expect(raw).not.toBeNull()

    const read = readViewSettings('/journal', 'note')
    expect(read.layout).toBe('rows')
    expect(read.visibleFields).toEqual(['title', 'date'])
  })

  it('persists groupBy across reload', () => {
    writeViewSettings('/library', {
      level: 'note',
      layout: 'cards',
      visibleFields: ['title'],
      groupBy: 'week',
    })

    const read = readViewSettings('/library', 'note')
    expect(read.groupBy).toBe('week')
  })

  it('migrates legacy stream/table layouts to cards/rows on read', () => {
    window.localStorage.setItem(
      `${VIEW_SETTINGS_STORAGE_PREFIX}/journal`,
      JSON.stringify({ level: 'note', layout: 'stream', visibleFields: ['title'] }),
    )
    window.localStorage.setItem(
      `${VIEW_SETTINGS_STORAGE_PREFIX}/library`,
      JSON.stringify({ level: 'note', layout: 'table', visibleFields: ['title'] }),
    )

    expect(readViewSettings('/journal', 'note').layout).toBe('cards')
    expect(readViewSettings('/library', 'note').layout).toBe('rows')
  })

  it('isolates preferences across different routes', () => {
    writeViewSettings('/journal', {
      level: 'note',
      layout: 'rows',
      visibleFields: ['title'],
    })
    writeViewSettings('/efforts', {
      level: 'effort',
      layout: 'cards',
      visibleFields: ['label', 'met'],
    })

    const journalSettings = readViewSettings('/journal', 'note')
    const effortsSettings = readViewSettings('/efforts', 'effort')

    expect(journalSettings.layout).toBe('rows')
    expect(journalSettings.visibleFields).toEqual(['title'])

    expect(effortsSettings.layout).toBe('cards')
    expect(effortsSettings.visibleFields).toEqual(['label', 'met'])
  })

  it('drops unknown or obsolete field ids on read', () => {
    const corrupted = {
      level: 'note',
      layout: 'rows',
      visibleFields: ['title', 'non_existent_field', 'date'],
    }
    window.localStorage.setItem(
      `${VIEW_SETTINGS_STORAGE_PREFIX}/journal`,
      JSON.stringify(corrupted),
    )

    const read = readViewSettings('/journal', 'note')
    expect(read.visibleFields).toEqual(['title', 'date'])
  })

  it('resets view settings to defaults', () => {
    writeViewSettings('/journal', {
      level: 'note',
      layout: 'rows',
      visibleFields: ['title'],
    })

    const reset = resetViewSettings('/journal', 'note')
    expect(reset.layout).toBe('cards')
    expect(reset.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))

    const read = readViewSettings('/journal', 'note')
    expect(read.layout).toBe('cards')
  })
})

describe('useViewSettings hook', () => {
  it('initializes with route defaults', () => {
    const { result } = renderHook(() => useViewSettings('/results', 'result'))
    expect(result.current.settings.layout).toBe('cards')
    expect(result.current.settings.visibleFields).toEqual(getDefaultVisibleFieldIds('result'))
  })

  it('switches layout between cards, rows, and feed and persists', () => {
    const { result } = renderHook(() => useViewSettings('/results', 'result'))

    act(() => {
      result.current.setLayout('feed')
    })
    expect(result.current.settings.layout).toBe('feed')

    const persisted = readViewSettings('/results', 'result')
    expect(persisted.layout).toBe('feed')
  })

  it('persists groupBy via setGroupBy', () => {
    const { result } = renderHook(() => useViewSettings('/library', 'note'))

    act(() => {
      result.current.setGroupBy('month')
    })
    expect(result.current.settings.groupBy).toBe('month')
    expect(readViewSettings('/library', 'note').groupBy).toBe('month')
  })

  it('toggles individual fields visibility on and off and persists', () => {
    const { result } = renderHook(() => useViewSettings('/efforts', 'effort'))
    expect(result.current.settings.visibleFields).toContain('met')

    act(() => {
      result.current.toggleField('met')
    })
    expect(result.current.settings.visibleFields).not.toContain('met')

    // Toggling again restores it
    act(() => {
      result.current.toggleField('met')
    })
    expect(result.current.settings.visibleFields).toContain('met')
  })

  it('resets settings to defaults', () => {
    const { result } = renderHook(() => useViewSettings('/journal', 'note'))

    act(() => {
      result.current.setLayout('rows')
      result.current.toggleField('tags')
    })
    expect(result.current.settings.layout).toBe('rows')

    act(() => {
      result.current.resetSettings()
    })
    expect(result.current.settings.layout).toBe('cards')
    expect(result.current.settings.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))
  })
})
