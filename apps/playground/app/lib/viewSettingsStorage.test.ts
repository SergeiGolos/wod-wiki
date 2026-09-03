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
    expect(settings.layout).toBe('stream')
    expect(settings.level).toBe('note')
    expect(settings.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))
  })

  it('persists and recovers custom view settings per route', () => {
    const custom: ViewSettings = {
      level: 'note',
      layout: 'table',
      visibleFields: ['title', 'date'],
    }
    writeViewSettings('/journal', custom)

    const raw = window.localStorage.getItem(`${VIEW_SETTINGS_STORAGE_PREFIX}/journal`)
    expect(raw).not.toBeNull()

    const read = readViewSettings('/journal', 'note')
    expect(read.layout).toBe('table')
    expect(read.visibleFields).toEqual(['title', 'date'])
  })

  it('isolates preferences across different routes', () => {
    writeViewSettings('/journal', {
      level: 'note',
      layout: 'table',
      visibleFields: ['title'],
    })
    writeViewSettings('/efforts', {
      level: 'effort',
      layout: 'stream',
      visibleFields: ['label', 'met'],
    })

    const journalSettings = readViewSettings('/journal', 'note')
    const effortsSettings = readViewSettings('/efforts', 'effort')

    expect(journalSettings.layout).toBe('table')
    expect(journalSettings.visibleFields).toEqual(['title'])

    expect(effortsSettings.layout).toBe('stream')
    expect(effortsSettings.visibleFields).toEqual(['label', 'met'])
  })

  it('drops unknown or obsolete field ids on read', () => {
    const corrupted = {
      level: 'note',
      layout: 'table',
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
      layout: 'table',
      visibleFields: ['title'],
    })

    const reset = resetViewSettings('/journal', 'note')
    expect(reset.layout).toBe('stream')
    expect(reset.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))

    const read = readViewSettings('/journal', 'note')
    expect(read.layout).toBe('stream')
  })
})

describe('useViewSettings hook', () => {
  it('initializes with route defaults', () => {
    const { result } = renderHook(() => useViewSettings('/results', 'result'))
    expect(result.current.settings.layout).toBe('stream')
    expect(result.current.settings.visibleFields).toEqual(getDefaultVisibleFieldIds('result'))
  })

  it('toggles layout mode between stream and table and persists', () => {
    const { result } = renderHook(() => useViewSettings('/results', 'result'))

    act(() => {
      result.current.setLayout('table')
    })
    expect(result.current.settings.layout).toBe('table')

    const persisted = readViewSettings('/results', 'result')
    expect(persisted.layout).toBe('table')
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
      result.current.setLayout('table')
      result.current.toggleField('tags')
    })
    expect(result.current.settings.layout).toBe('table')

    act(() => {
      result.current.resetSettings()
    })
    expect(result.current.settings.layout).toBe('stream')
    expect(result.current.settings.visibleFields).toEqual(getDefaultVisibleFieldIds('note'))
  })
})
