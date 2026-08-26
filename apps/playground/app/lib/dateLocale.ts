/**
 * dateLocale — the "Date language" preference (#858, inheriting #706's
 * locked decision): dates follow the browser locale by default (Auto), with
 * an explicit override from the ⋮ Actions menu.
 *
 * The resolved tag lives in a module-level variable so the pure formatters
 * in dateFormat.ts — and their existing call sites (LibraryPage,
 * JournalDateScroll, FeedFeed, BackdateConfirmModal, WorkoutEditorPage) —
 * pick the preference up with no parameter threading. `useDateLocale` gives
 * React components reactivity. Storage/event pattern mirrors
 * useShowPlaygrounds (localStorage + dispatched StorageEvent, so same-tab
 * and cross-tab stay in sync).
 */
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'wodwiki:dateLocale'

export interface DateLocaleOption {
  /** BCP-47 tag; null = Auto (browser locale). */
  tag: string | null
  label: string
}

/** Auto + English + a few common locales (per the #706 decision). */
export const DATE_LOCALE_OPTIONS: DateLocaleOption[] = [
  { tag: null, label: 'Auto (browser)' },
  { tag: 'en', label: 'English' },
  { tag: 'zh', label: '中文' },
  { tag: 'es', label: 'Español' },
  { tag: 'de', label: 'Deutsch' },
  { tag: 'fr', label: 'Français' },
]

function readStored(): string | undefined {
  try {
    return validate(localStorage.getItem(STORAGE_KEY))
  } catch {
    return undefined
  }
}

/** Ignore stale/invalid tags — an unknown tag would make Intl throw. */
function validate(tag: string | null): string | undefined {
  return tag && DATE_LOCALE_OPTIONS.some(o => o.tag === tag) ? tag : undefined
}

let current: string | undefined = typeof window === 'undefined' ? undefined : readStored()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) current = validate(e.newValue)
  })
}

/** Resolved BCP-47 tag, or undefined for Auto (browser locale). */
export function getDateLocale(): string | undefined {
  return current
}

export function setDateLocale(tag: string | null): void {
  current = tag ?? undefined
  try {
    if (tag === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, tag)
  } catch {
    // Private mode / storage disabled — the in-memory pref still applies.
  }
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: tag }))
}

/** React binding: the current tag (null = Auto) and the setter. */
export function useDateLocale(): [string | null, (tag: string | null) => void] {
  const [tag, setTag] = useState<string | null>(() => current ?? null)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // The module-level listener (registered at import) runs first, so the
      // validated value is already resolved.
      if (e.key === STORAGE_KEY) setTag(getDateLocale() ?? null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [tag, setDateLocale]
}
