/**
 * viewSettingsStorage — client storage persistence for per-route view settings (Ticket 002).
 *
 * Persists the user's field visibility and layout preferences (Card Stream vs
 * Property Table) per view route in localStorage.
 * Drops obsolete or unknown field IDs on read to keep stored state resilient.
 */
import { useState, useCallback, useEffect } from 'react'
import {
  type EntityLevel,
  getFieldsForLevel,
  getDefaultVisibleFieldIds,
} from './fieldProjection'

export type LayoutMode = 'stream' | 'table'

export interface ViewSettings {
  level: EntityLevel
  layout: LayoutMode
  visibleFields: string[]
}

export const VIEW_SETTINGS_STORAGE_PREFIX = 'wodwiki.viewSettings.v1'

export function getRouteStorageKey(route: string): string {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`
  return `${VIEW_SETTINGS_STORAGE_PREFIX}${cleanRoute}`
}

export function getDefaultViewSettings(level: EntityLevel): ViewSettings {
  return {
    level,
    layout: 'stream',
    visibleFields: getDefaultVisibleFieldIds(level),
  }
}

export function readViewSettings(route: string, level: EntityLevel): ViewSettings {
  const defaults = getDefaultViewSettings(level)
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults
  }

  try {
    const raw = window.localStorage.getItem(getRouteStorageKey(route))
    if (!raw) return defaults

    const parsed = JSON.parse(raw) as Partial<ViewSettings>
    const layout: LayoutMode = parsed.layout === 'table' ? 'table' : 'stream'

    // Sanitize visible fields against valid fields for this level
    const availableFieldIds = new Set(getFieldsForLevel(level).map(f => f.id))
    const visibleFields = Array.isArray(parsed.visibleFields)
      ? parsed.visibleFields.filter(id => typeof id === 'string' && availableFieldIds.has(id))
      : defaults.visibleFields

    return {
      level,
      layout,
      visibleFields: visibleFields.length > 0 ? visibleFields : defaults.visibleFields,
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
      window.localStorage.removeItem(getRouteStorageKey(route))
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

  const resetSettings = useCallback(() => {
    const defaults = resetViewSettings(route, level)
    setSettings(defaults)
  }, [route, level])

  return {
    settings,
    setLayout,
    toggleField,
    setVisibleFields,
    resetSettings,
  }
}
