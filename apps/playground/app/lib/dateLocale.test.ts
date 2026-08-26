/**
 * dateLocale + formatDateHeader (#858) — the "Date language" preference:
 * Auto (browser locale) by default, explicit override persisted to
 * localStorage, invalid tags rejected (an unknown tag would make Intl
 * throw). Formatter and store are tested together because the resolved tag
 * is module state.
 */
import { afterEach, describe, expect, it } from 'bun:test'
import { DATE_LOCALE_OPTIONS, getDateLocale, setDateLocale } from './dateLocale'
import { formatDateHeader } from './dateFormat'

const STORAGE_KEY = 'wodwiki:dateLocale'

afterEach(() => {
  setDateLocale(null)
  localStorage.clear()
})

describe('dateLocale preference', () => {
  it('defaults to Auto (browser locale) with nothing stored', () => {
    expect(getDateLocale()).toBeUndefined()
    expect(formatDateHeader('2026-01-12')).toBe(
      new Date(Date.UTC(2026, 0, 12)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    )
  })

  it('persists an override and resolves it for formatting', () => {
    setDateLocale('en')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en')
    expect(getDateLocale()).toBe('en')
    expect(formatDateHeader('2026-01-12')).toBe('Jan 12, 2026')
  })

  it('renders Chinese headers under the zh override (the report’s desktop case)', () => {
    setDateLocale('zh')
    expect(formatDateHeader('2026-01-12')).toBe('2026年1月12日')
  })

  it('returns to Auto and clears storage on null', () => {
    setDateLocale('zh')
    setDateLocale(null)
    expect(getDateLocale()).toBeUndefined()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('rejects stale tags not in the option set', () => {
    setDateLocale('en')
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'klingon' }))
    expect(getDateLocale()).toBeUndefined()
    expect(() => formatDateHeader('2026-01-12')).not.toThrow()
  })

  it('syncs via storage events (same-tab and cross-tab)', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'de' }))
    expect(getDateLocale()).toBe('de')
    expect(formatDateHeader('2026-01-12')).toBe(
      new Date(Date.UTC(2026, 0, 12)).toLocaleDateString('de', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    )
  })

  it('offers Auto + English + common locales (per #706)', () => {
    expect(DATE_LOCALE_OPTIONS[0]).toEqual({ tag: null, label: 'Auto (browser)' })
    expect(DATE_LOCALE_OPTIONS.map(o => o.tag)).toContain('en')
    expect(DATE_LOCALE_OPTIONS.length).toBeGreaterThanOrEqual(4)
  })
})
