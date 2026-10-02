/**
 * routeWqlConfig — user-configurable per-route WQL defaults (wayfinder: Route WQL defaults settings).
 *
 * Persists the user's override of a surface's landing default WQL, Where-stored
 * scope options, and fallback Group-By options in localStorage, one key per
 * route id, mirroring viewSettingsStorage. Absent fields fall back individually
 * to the in-code system defaults (the route's StreamProfile, the palette seed,
 * the view settings dialog's fallback list); an empty array is a deliberate
 * "no predefined options" state and is preserved. An explicit URL `?q=` always
 * wins over any default — that precedence lives in useComposerQueryState, so
 * defaults apply only when `?q` is absent and Back/Forward restores explicit
 * query choices.
 *
 * Favorites are priority lists, never grammar: stored option ids migrate
 * narrowly to canonical target/scope choices on read (work item 3); ids that
 * are neither canonical nor migratable are reported (`invalidTypeOptions`,
 * `invalidGroupByOptions`) instead of silently turning into query clauses.
 */
import { WQL_FIND_TARGETS, WQL_SOURCE_VALUES } from '@bitcobblers/wod-wiki-engine'
import type { StreamProfile } from '../views/stream/streamProfile'
import { LocalStore } from '@/services/storage/LocalStore'

export interface RouteWqlConfig {
  /** Landing default WQL when the URL carries no `?q=`. */
  defaultWql?: string
  /** Replaces the profile's scopeOptions when present (empty = no predefined options). */
  typeOptions?: string[]
  /** Replaces the view settings dialog's fallback Group-By list when present. */
  groupByOptions?: string[]
  /** Stored type-option ids that are neither canonical nor migratable — surfaced
   *  in Settings ▸ Query Defaults, never turned into query clauses. */
  invalidTypeOptions?: string[]
  /** Stored group-by ids outside the supported fallback dimensions. */
  invalidGroupByOptions?: string[]
}

/** The ⌘K palette is a global surface, not a route; it gets a synthetic route id. */
export const PALETTE_ROUTE_ID = '/palette'

export const ROUTE_WQL_STORAGE_PREFIX = 'wodwiki.routeWql.v1'

export const routeWqlStore = new LocalStore(ROUTE_WQL_STORAGE_PREFIX)

/** Canonical Where-stored choices — the storage scopes a note surface offers. */
export const SCOPE_OPTION_VALUES: readonly string[] = WQL_SOURCE_VALUES

/** Every canonical type-option value: singular targets plus storage scopes. */
export const CANONICAL_TYPE_OPTIONS: readonly string[] = [...WQL_FIND_TARGETS, ...WQL_SOURCE_VALUES]

/**
 * Fallback card-arrangement dimensions — the shared vocabulary the view
 * settings dialog renders, the query-defaults settings editor validates
 * against, and the stream grouping consumer (`groupEntriesByDimension`)
 * implements. Query grouping (WQL `by {…}`) wins over these while present.
 */
export const GROUP_BY_FAVORITE_OPTIONS: readonly { id: string; label: string }[] = [
  { id: 'date', label: 'Date' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'tag', label: 'Tags' },
  { id: 'source', label: 'Source' },
]

/**
 * Narrow one-time id migration for persisted favorites (work item 3): the old
 * plural-noun type vocabulary maps onto canonical singular targets. Storage
 * locations (journal/collections/feeds/playground) are already canonical and
 * pass through unchanged.
 */
const LEGACY_TYPE_OPTION_IDS: Record<string, string> = {
  notes: 'note',
  blocks: 'block',
  efforts: 'effort',
}

function getRouteWqlStorageId(routeId: string): string {
  return routeId.startsWith('/') ? routeId : `/${routeId}`
}

export function getRouteWqlStorageKey(routeId: string): string {
  return routeWqlStore.qualify(getRouteWqlStorageId(routeId))
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
}

/**
 * Migrate one stored favorites list id-by-id: legacy plural ids map to their
 * canonical choice, unknown ids are reported (not dropped silently), empty
 * lists stay empty, first-occurrence order (priority) is preserved.
 */
function migrateFavoriteIds(
  values: string[],
  canonical: readonly string[],
  legacy: Record<string, string>,
): { options: string[]; invalid: string[] } {
  const options: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    const id = legacy[v] ?? v
    if (!canonical.includes(id)) {
      if (!invalid.includes(v)) invalid.push(v)
      continue
    }
    if (!seen.has(id)) {
      seen.add(id)
      options.push(id)
    }
  }
  return { options, invalid }
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

export function readRouteWqlConfig(routeId: string, store: LocalStore = routeWqlStore): RouteWqlConfig {
  const id = getRouteWqlStorageId(routeId)
  const legacyId = LEGACY_STORAGE_ALIASES[id]
  const parsed = store.get<Partial<RouteWqlConfig>>(id, { alias: legacyId })
  if (!parsed) return {}
  const typeOptions = sanitizeStringArray(parsed.typeOptions)
  const groupByOptions = sanitizeStringArray(parsed.groupByOptions)
  const migratedType = typeOptions && migrateFavoriteIds(typeOptions, CANONICAL_TYPE_OPTIONS, LEGACY_TYPE_OPTION_IDS)
  const migratedGroup =
    groupByOptions &&
    migrateFavoriteIds(
      groupByOptions,
      GROUP_BY_FAVORITE_OPTIONS.map(o => o.id),
      {},
    )
  return {
    defaultWql:
      typeof parsed.defaultWql === 'string' && parsed.defaultWql.trim().length > 0
        ? parsed.defaultWql.trim()
        : undefined,
    typeOptions: migratedType?.options,
    groupByOptions: migratedGroup?.options,
    ...(migratedType?.invalid.length ? { invalidTypeOptions: migratedType.invalid } : {}),
    ...(migratedGroup?.invalid.length ? { invalidGroupByOptions: migratedGroup.invalid } : {}),
  }
}

export function writeRouteWqlConfig(routeId: string, config: RouteWqlConfig, store: LocalStore = routeWqlStore): void {
  const id = getRouteWqlStorageId(routeId)
  store.set(id, {
    defaultWql: config.defaultWql?.trim() || undefined,
    typeOptions: sanitizeStringArray(config.typeOptions),
    groupByOptions: sanitizeStringArray(config.groupByOptions),
  })
}

export function clearRouteWqlConfig(routeId: string, store: LocalStore = routeWqlStore): void {
  const id = getRouteWqlStorageId(routeId)
  const legacyId = LEGACY_STORAGE_ALIASES[id]
  store.remove(id, legacyId)
}

/**
 * Overlay the stored config onto a resolved StreamProfile. Returns the same
 * object when nothing is configured, so profile identity is preserved.
 *
 * Stored favorites overlay the scope list only: canonical target favorites
 * (e.g. a migrated `notes` → `note`) are inert here — the route's target is
 * fixed by the page — but stay visible and removable in Settings ▸ Query
 * Defaults. A stored list without scope entries (including a deliberate
 * empty list) leaves the route with no predefined scope options — the nudge
 * state, never a blocker.
 */
export function applyRouteWqlConfig(profile: StreamProfile): StreamProfile {
  const config = readRouteWqlConfig(profile.route)
  if (!config.defaultWql && !config.typeOptions) return profile
  return {
    ...profile,
    defaultWql: config.defaultWql ?? profile.defaultWql,
    scopeOptions: config.typeOptions
      ? config.typeOptions.filter(v => (WQL_SOURCE_VALUES as readonly string[]).includes(v))
      : profile.scopeOptions,
  }
}
