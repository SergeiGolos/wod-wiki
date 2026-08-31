/**
 * dateLocale + formatDateHeader (#858, #1012) — the "Date language" preference:
 * Auto (UI language 'en') by default, explicit override persisted to
 * localStorage, invalid tags rejected.
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
  it('defaults to Auto (UI language "en") with nothing stored', () => {
    expect(getDateLocale()).toBe('en')
    expect(formatDateHeader('2026-01-12')).toBe('Jan 12, 2026')
  })

  it('persists an override and resolves it for formatting', () => {
    setDateLocale('en')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en')
    expect(getDateLocale()).toBe('en')
    expect(formatDateHeader('2026-01-12')).toBe('Jan 12, 2026')
  })

  it('renders Chinese headers under the zh override', () => {
    setDateLocale('zh')
    expect(formatDateHeader('2026-01-12')).toBe('2026年1月12日')
  })

  it('returns to Auto (UI language "en") and clears storage on null', () => {
    setDateLocale('zh')
    setDateLocale(null)
    expect(getDateLocale()).toBe('en')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('rejects stale tags not in the option set', () => {
    setDateLocale('en')
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'klingon' }))
    expect(getDateLocale()).toBe('en')
    expect(() => formatDateHeader('2026-01-12')).not.toThrow()
  })

  it('syncs via storage events (same-tab and cross-tab)', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'de' }))
    expect(getDateLocale()).toBe('de')
    expect(formatDateHeader('2026-01-12')).toBe('12. Jan. 2026')
  })

  it('offers Auto (UI language) + English + common locales', () => {
    expect(DATE_LOCALE_OPTIONS[0]).toEqual({ tag: null, label: 'Auto (UI language)' })
    expect(DATE_LOCALE_OPTIONS.map(o => o.tag)).toContain('en')
    expect(DATE_LOCALE_OPTIONS.length).toBeGreaterThanOrEqual(4)
  })
})
