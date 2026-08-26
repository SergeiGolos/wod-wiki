/**
 * Library redirect matrix (#813 slices 5-6) — the three legacy list routes
 * (`/journal`, `/collections`, `/feeds`) redirect to `/library` with the
 * tri-state source filter pre-set in the query. Existing query params
 * (e.g. `?mode=plan`, `?s=YYYY-MM-DD`) are preserved (appended, not
 * overwritten) so deep links survive.
 */
import { describe, it, expect } from 'bun:test'
import { resolveLibraryRedirect } from './routes'

describe('resolveLibraryRedirect — /journal', () => {
  it('redirects /journal to /library with note=on, session=hide, post=hide', () => {
    expect(resolveLibraryRedirect('/journal', '')).toBe(
      '/library?note=on&session=hide&post=hide',
    )
  })

  it('preserves a trailing slash', () => {
    expect(resolveLibraryRedirect('/journal/', '')).toBe(
      '/library?note=on&session=hide&post=hide',
    )
  })

  it('preserves ?mode=plan', () => {
    expect(resolveLibraryRedirect('/journal', '?mode=plan')).toBe(
      '/library?note=on&session=hide&post=hide&mode=plan',
    )
  })

  it('preserves multiple query params', () => {
    expect(resolveLibraryRedirect('/journal', '?mode=plan&s=2026-07-15&tags=pr')).toBe(
      '/library?note=on&session=hide&post=hide&mode=plan&s=2026-07-15&tags=pr',
    )
  })
})

describe('resolveLibraryRedirect — /collections', () => {
  it('redirects /collections to /library with note=hide, session=on, post=hide', () => {
    expect(resolveLibraryRedirect('/collections', '')).toBe(
      '/library?note=hide&session=on&post=hide',
    )
  })

  it('preserves ?text=…', () => {
    expect(resolveLibraryRedirect('/collections', '?text=fran')).toBe(
      '/library?note=hide&session=on&post=hide&text=fran',
    )
  })
})

describe('resolveLibraryRedirect — /feeds', () => {
  it('redirects /feeds to /library with note=hide, session=hide, post=on', () => {
    expect(resolveLibraryRedirect('/feeds', '')).toBe(
      '/library?note=hide&session=hide&post=on',
    )
  })

  it('preserves ?s=YYYY-MM-DD', () => {
    expect(resolveLibraryRedirect('/feeds', '?s=2026-07-12')).toBe(
      '/library?note=hide&session=hide&post=on&s=2026-07-12',
    )
  })
})

describe('resolveLibraryRedirect — pass-through', () => {
  it('returns null for non-list paths so the router falls through', () => {
    expect(resolveLibraryRedirect('/journal/2026-07-15', '')).toBeNull()
    expect(resolveLibraryRedirect('/collections/crossfit-girls/fran', '')).toBeNull()
    expect(resolveLibraryRedirect('/feeds/crossfit-programming/2026-07-12/monday', '')).toBeNull()
    expect(resolveLibraryRedirect('/', '')).toBeNull()
  })
})
