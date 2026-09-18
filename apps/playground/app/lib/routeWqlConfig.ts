/**
 * routeWqlConfig — user-configurable per-route WQL defaults (wayfinder: Route WQL defaults settings).
 *
 * Persists the user's override of a surface's landing default WQL, source type
 * options, and Group-By options in localStorage, one key per route id,
 * mirroring viewSettingsStorage. Absent fields fall back individually to the
 * in-code system defaults (the route's StreamProfile, the palette seed, the
 * view settings dialog's Group-By list); an empty array is a deliberate
 * "no predefined options" state and is preserved. An explicit URL `?q=` always
 * wins over any default — that precedence lives in useComposerQueryState.
 */
import type { StreamProfile } from '../views/stream/streamProfile'

export interface RouteWqlConfig {
  /** Landing default WQL when the URL carries no `?q=`. */
  defaultWql?: string
  /** Replaces the profile's typeOptions when present (empty = no predefined options). */
  typeOptions?: string[]
  /** Replaces the view settings dialog's Group-By list when present. */
  groupByOptions?: string[]
}

/** The ⌘K palette is a global surface, not a route; it gets a synthetic route id. */
export const PALETTE_ROUTE_ID = '/palette'

export const ROUTE_WQL_STORAGE_PREFIX = 'wodwiki.routeWql.v1'

export function getRouteWqlStorageKey(routeId: string): string {
  const id = routeId.startsWith('/') ? routeId : `/${routeId}`
  return `${ROUTE_WQL_STORAGE_PREFIX}${id}`
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
}

/**
 * Storage keys that moved during the route rebrand (#link-crosswalk):
 * overrides saved under the old surface id still resolve under the new one.
 * The new key always wins when both exist.
 */
const LEGACY_STORAGE_ALIASES: Record<string, string> = {
  '/sessions': '/results',
  '/dashboards': '/dashboard',
}

export function readRouteWqlConfig(routeId: string): RouteWqlConfig {
  const read = (id: string): RouteWqlConfig | null => {
    if (typeof window === 'undefined' || !window.localStorage) return null
    try {
      const raw = window.localStorage.getItem(getRouteWqlStorageKey(id))
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<RouteWqlConfig>
      return {
        defaultWql:
          typeof parsed.defaultWql === 'string' && parsed.defaultWql.trim().length > 0
            ? parsed.defaultWql.trim()
            : undefined,
        typeOptions: sanitizeStringArray(parsed.typeOptions),
        groupByOptions: sanitizeStringArray(parsed.groupByOptions),
      }
    } catch {
      return null
    }
  }

  const current = read(routeId)
  if (current) return current
  const legacyId = LEGACY_STORAGE_ALIASES[routeId]
  return (legacyId && read(legacyId)) || {}
}

export function writeRouteWqlConfig(routeId: string, config: RouteWqlConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(
      getRouteWqlStorageKey(routeId),
      JSON.stringify({
        defaultWql: config.defaultWql?.trim() || undefined,
        typeOptions: sanitizeStringArray(config.typeOptions),
        groupByOptions: sanitizeStringArray(config.groupByOptions),
      }),
    )
  } catch {
    // Non-fatal if quota exceeded
  }
}

export function clearRouteWqlConfig(routeId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(getRouteWqlStorageKey(routeId))
  } catch {
    // Non-fatal
  }
}

/**
 * Overlay the stored config onto a resolved StreamProfile. Returns the same
 * object when nothing is configured, so profile identity is preserved.
 */
export function applyRouteWqlConfig(profile: StreamProfile): StreamProfile {
  const config = readRouteWqlConfig(profile.route)
  if (!config.defaultWql && !config.typeOptions) return profile
  return {
    ...profile,
    defaultWql: config.defaultWql ?? profile.defaultWql,
    typeOptions: config.typeOptions ?? profile.typeOptions,
  }
}
