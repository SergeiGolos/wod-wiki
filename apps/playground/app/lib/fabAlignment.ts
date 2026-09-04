/**
 * fabAlignment — the "Search button position" preference: which thumb zone the
 * mobile floating search button (SearchFab) anchors to. Right (default) suits
 * right-handed use; Left mirrors it for left-handed use.
 *
 * Follows the dateLocale.ts pattern: module-level value + localStorage +
 * storage event, so non-React readers stay cheap and `useFabAlignment` gives
 * components reactivity.
 */
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'wodwiki:fabAlignment'

export type FabAlignment = 'right' | 'left'

export interface FabAlignmentOption {
  id: FabAlignment
  label: string
  description: string
}

export const FAB_ALIGNMENT_OPTIONS: FabAlignmentOption[] = [
  {
    id: 'right',
    label: 'Bottom right',
    description: 'Right-handed — the search button floats near your right thumb',
  },
  {
    id: 'left',
    label: 'Bottom left',
    description: 'Left-handed — the search button floats near your left thumb',
  },
]

function readStored(): FabAlignment | undefined {
  try {
    return validate(localStorage.getItem(STORAGE_KEY))
  } catch {
    return undefined
  }
}

function validate(value: string | null): FabAlignment | undefined {
  return value === 'right' || value === 'left' ? value : undefined
}

let current: FabAlignment | undefined =
  typeof window === 'undefined' ? undefined : readStored()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) current = validate(e.newValue)
  })
}

/** Resolved alignment, defaulting to 'right'. */
export function getFabAlignment(): FabAlignment {
  return current ?? 'right'
}

export function setFabAlignment(alignment: FabAlignment): void {
  current = alignment
  try {
    if (alignment === 'right') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, alignment)
  } catch {
    // Private mode / storage disabled — the in-memory pref still applies.
  }
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: alignment }))
}

/** React binding: the current alignment and the setter. */
export function useFabAlignment(): [FabAlignment, (alignment: FabAlignment) => void] {
  const [alignment, setAlignment] = useState<FabAlignment>(() => current ?? 'right')
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAlignment(validate(e.newValue) ?? 'right')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [alignment, setFabAlignment]
}
