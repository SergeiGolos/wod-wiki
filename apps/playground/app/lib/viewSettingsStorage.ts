/**
 * viewSettingsStorage — client storage persistence for per-route view settings (Ticket 002).
 *
 * Persists the user's field visibility, layout (Cards / Rows / Feed), and
 * grouping per view route in localStorage. Legacy stream/table layouts
 * migrate to cards/rows on read. Drops obsolete or unknown field IDs on read
 * to keep stored state resilient.
 */
import { useState, useCallback, useEffect } from 'react'
import {
  type EntityLevel,
  getFieldsForLevel,
  getDefaultVisibleFieldIds,
} from './fieldProjection'

export type LayoutMode = 'cards' | 'rows' | 'feed'

/** Persisted layouts from before the Cards / Rows / Feed split (Ticket 002). */
const LEGACY_LAYOUTS: Record<string, LayoutMode> = {
  stream: 'cards',
  table: 'rows',
}

export interface ViewSettings {
  level: EntityLevel
  layout: LayoutMode
  visibleFields: string[]
  groupBy?: string
}

export const VIEW_SETTINGS_STORAGE_PREFIX = 'wodwiki.viewSettings.v1'

/** Storage keys that moved during the route rebrand (#link-crosswalk):
 *  view settings saved under the old surface id still resolve under the
 *  new one. The current key always wins when both exist. */
const LEGACY_ROUTE_ALIASES: Record<string, string> = {
  '/sessions': '/results',
}

export function getRouteStorageKey(route: string): string {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`
  return `${VIEW_SETTINGS_STORAGE_PREFIX}${cleanRoute}`
}

export function getDefaultViewSettings(level: EntityLevel): ViewSettings {
  return {
    level,
    layout: 'cards',
    visibleFields: getDefaultVisibleFieldIds(level),
    groupBy: undefined,
  }
}

export function readViewSettings(route: string, level: EntityLevel): ViewSettings {
  const defaults = getDefaultViewSettings(level)
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults
  }

  const readRaw = (r: string): string | null => {
    try {
      return window.localStorage.getItem(getRouteStorageKey(r))
    } catch {
      return null
    }
  }
  let raw = readRaw(route)
  if (!raw) {
    const legacyRoute = LEGACY_ROUTE_ALIASES[route]
    if (legacyRoute) raw = readRaw(legacyRoute)
  }
  if (!raw) return defaults

  try {
    const parsed = JSON.parse(raw) as Partial<ViewSettings>
    const rawLayout = typeof parsed.layout === 'string' ? parsed.layout : ''
    const layout: LayoutMode =
      rawLayout === 'cards' || rawLayout === 'rows' || rawLayout === 'feed'
        ? rawLayout
        : (LEGACY_LAYOUTS[rawLayout] ?? 'cards')

    // Sanitize visible fields against valid fields for this level
    const availableFieldIds = new Set(getFieldsForLevel(level).map(f => f.id))
    const visibleFields = Array.isArray(parsed.visibleFields)
      ? parsed.visibleFields.filter(id => typeof id === 'string' && availableFieldIds.has(id))
      : defaults.visibleFields

    const groupBy = typeof parsed.groupBy === 'string' ? parsed.groupBy : undefined
    return {
      level,
      layout,
      visibleFields: visibleFields.length > 0 ? visibleFields : defaults.visibleFields,
      groupBy,
    }
  } catch {
    return defaults
  }
}

export function writeViewSettings(route: string, settings: ViewSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    window.localStorage.setItem(
      getRouteStorageKey(route),
      JSON.stringify({
        level: settings.level,
        layout: settings.layout,
        visibleFields: settings.visibleFields,
        groupBy: settings.groupBy,
      }),
    )
  } catch {
    // Non-fatal if quota exceeded
  }
}

export function resetViewSettings(route: string, level: EntityLevel): ViewSettings {
  const defaults = getDefaultViewSettings(level)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // A reset must also drop the legacy key, or the read alias resurrects it.
      const legacyRoute = LEGACY_ROUTE_ALIASES[route]
      const keys = legacyRoute ? [route, legacyRoute] : [route]
      keys.forEach(k => window.localStorage.removeItem(getRouteStorageKey(k)))
    } catch {
      // Non-fatal
    }
  }
  return defaults
}

/**
 * React hook for consuming and updating per-route view settings with client storage persistence.
 */
export function useViewSettings(route: string, level: EntityLevel) {
  const [settings, setSettings] = useState<ViewSettings>(() => readViewSettings(route, level))

  // Synchronize when route or level changes
  useEffect(() => {
    setSettings(readViewSettings(route, level))
  }, [route, level])

  const update = useCallback(
    (updater: (prev: ViewSettings) => ViewSettings) => {
      setSettings(prev => {
        const next = updater(prev)
        writeViewSettings(route, next)
        return next
      })
    },
    [route],
  )

  const setLayout = useCallback(
    (layout: LayoutMode) => {
      update(prev => ({ ...prev, layout }))
    },
    [update],
  )

  const toggleField = useCallback(
    (fieldId: string) => {
      update(prev => {
        const currentSet = new Set(prev.visibleFields)
        if (currentSet.has(fieldId)) {
          currentSet.delete(fieldId)
        } else {
          currentSet.add(fieldId)
        }
        return {
          ...prev,
          visibleFields: Array.from(currentSet),
        }
      })
    },
    [update],
  )

  const setVisibleFields = useCallback(
    (visibleFields: string[]) => {
      update(prev => ({ ...prev, visibleFields }))
    },
    [update],
  )

  const setGroupBy = useCallback(
    (groupBy?: string) => {
      update(prev => ({ ...prev, groupBy }))
    },
    [update],
  )
  const resetSettings = useCallback(() => {
    const defaults = resetViewSettings(route, level)
    setSettings(defaults)
  }, [route, level])

  return {
    settings,
    setLayout,
    toggleField,
    setVisibleFields,
    setGroupBy,
    resetSettings,
  }
}
