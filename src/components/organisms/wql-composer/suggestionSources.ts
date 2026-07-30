/**
 * Suggestion sources — dynamic typeahead data bindings for WqlComposer
 * token slots (issue #831, decision #824).
 *
 * Each slot declares a {@link SuggestionBinding}: an async loader, a cache
 * policy, whether user-typed values outside the list are allowed (open
 * slots), and the empty-state copy rendered when a source has no rows.
 *
 * Sources:
 *   - tag        user tags from IndexedDB merged with static-corpus tags
 *                (frontmatter `tags:` of the static block index), deduped
 *   - effort     effort slugs from the CompositeEffortRegistry (bundled +
 *                user-created, loaded per cache expiry)
 *   - discipline canonical lowercase EFFORT_DISCIPLINES, title-cased labels
 *   - catalog    catalog ids derived from the static block index
 *   - type       distinct dataTypes across static + user block indexes
 *   - has        closed static feature vocabulary
 *
 * Bindings are overridable per slot ({@link setSuggestionBinding}) so pages
 * can inject their own data and tests never touch IndexedDB or the 8 MB
 * static corpus.
 */

import type { BlockIndexRow } from '@/types/storage'
import { extractFrontmatterTags } from '@/lib/frontmatter'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { loadStaticBlockIndex } from '@/services/content/staticBlockIndex'
import { CompositeEffortRegistry } from '@/effort-registry'
import { EFFORT_DISCIPLINES } from '@/effort-registry/disciplines'

// ── Contract ────────────────────────────────────────────────────────────────

export interface SuggestionItem {
  /** The value emitted into the clause (and compiled into WQL). */
  value: string
  /** Display label; defaults to `value` when absent. */
  label?: string
}

/**
 * Cache policy per binding:
 *   - 'static'     loaded once for the session (vocabularies, static corpus)
 *   - { ttlMs }    reloaded after the TTL expires (user-owned data)
 */
export type SuggestionCachePolicy = 'static' | { ttlMs: number }

export interface SuggestionBinding {
  load: () => Promise<SuggestionItem[]>
  cache: SuggestionCachePolicy
  /** Open slots accept user-typed values not present in the suggestion list. */
  open: boolean
  /** "Nothing here yet" affordance rendered when the source has no rows. */
  emptyText: string
}

// ── Pure derivations (unit-tested without IndexedDB / static corpus) ───────

/** Tags declared in frontmatter rows of a block index, deduped + sorted. */
export function tagsFromStaticBlocks(blocks: BlockIndexRow[]): string[] {
  const tags = new Set<string>()
  for (const block of blocks) {
    if (block.dataType !== 'frontmatter') continue
    for (const tag of extractFrontmatterTags(block.rawContent)) tags.add(tag)
  }
  return [...tags].sort()
}

/** Catalog id of a block row: first noteId path segment, `feeds/` stripped. */
function catalogOf(noteId: string): string {
  return noteId.startsWith('feeds/') ? noteId.split('/')[1]! : noteId.split('/')[0]!
}

/**
 * Distinct catalog ids of a block index. Only static rows contribute (the
 * same rule as the Library panel's listCatalogs); user journal notes carry
 * no catalog.
 */
export function catalogIdsFromBlocks(blocks: BlockIndexRow[]): string[] {
  const ids = new Set<string>()
  for (const block of blocks) {
    if (block.isStatic === false) continue
    if (!block.isStatic && !block.sourceId?.startsWith('collection:') && !block.sourceId?.startsWith('feed:')) continue
    const id = catalogOf(block.noteId)
    if (id) ids.add(id)
  }
  return [...ids].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
}

/** Distinct segment dataTypes present in a block index, sorted. */
export function blockTypesFromBlocks(blocks: BlockIndexRow[]): string[] {
  const types = new Set<string>()
  for (const block of blocks) {
    if (block.dataType) types.add(block.dataType)
  }
  return [...types].sort()
}

/**
 * Merge user tag labels with static-corpus labels. Deduplicated
 * case-insensitively; the user-cased spelling wins on collision.
 */
export function mergeTagSuggestions(userLabels: string[], corpusLabels: string[]): string[] {
  const byLower = new Map<string, string>()
  for (const label of [...userLabels, ...corpusLabels]) {
    const key = label.toLowerCase()
    if (!byLower.has(key)) byLower.set(key, label)
  }
  return [...byLower.values()].sort()
}

// ── Default loaders ─────────────────────────────────────────────────────────

async function loadTagSuggestions(): Promise<SuggestionItem[]> {
  const [userLabels, corpusLabels] = await Promise.all([
    indexedDBService.getAllTags().then(tags => tags.map(t => t.label)).catch(() => [] as string[]),
    loadStaticBlockIndex().then(tagsFromStaticBlocks).catch(() => [] as string[]),
  ])
  return mergeTagSuggestions(userLabels, corpusLabels).map(value => ({ value }))
}

async function loadEffortSuggestions(): Promise<SuggestionItem[]> {
  // A fresh registry per load so user efforts created since the last cache
  // expiry appear; loadBundled falls back to bundled-only when IndexedDB is
  // unavailable (Storybook, private mode).
  const registry = new CompositeEffortRegistry()
  await registry.loadBundled()
  return registry.list().map(e => ({ value: e.slug })).sort((a, b) => a.value.localeCompare(b.value))
}

async function loadDisciplineSuggestions(): Promise<SuggestionItem[]> {
  return EFFORT_DISCIPLINES.map(d => ({ value: d, label: d[0]!.toUpperCase() + d.slice(1) }))
}

async function loadCatalogSuggestions(): Promise<SuggestionItem[]> {
  return catalogIdsFromBlocks(await loadStaticBlockIndex()).map(value => ({ value }))
}

async function loadBlockTypeSuggestions(): Promise<SuggestionItem[]> {
  const [staticBlocks, userBlocks] = await Promise.all([
    loadStaticBlockIndex().catch(() => [] as BlockIndexRow[]),
    indexedDBService.getAllBlockIndex().catch(() => [] as BlockIndexRow[]),
  ])
  return blockTypesFromBlocks([...staticBlocks, ...userBlocks]).map(value => ({ value }))
}

async function loadHasSuggestions(): Promise<SuggestionItem[]> {
  return ['timer', 'image', 'metric', 'rx'].map(value => ({ value }))
}

// ── Registry + cache ────────────────────────────────────────────────────────

const builtinBindings: Record<string, SuggestionBinding> = {
  tag: {
    load: loadTagSuggestions,
    cache: { ttlMs: 30_000 },
    open: true,
    emptyText: 'No tags yet — type one to filter by it',
  },
  effort: {
    load: loadEffortSuggestions,
    cache: { ttlMs: 60_000 },
    open: true,
    emptyText: 'No efforts yet — create one on an effort page',
  },
  discipline: {
    load: loadDisciplineSuggestions,
    cache: 'static',
    open: false,
    emptyText: 'No disciplines available',
  },
  catalog: {
    load: loadCatalogSuggestions,
    cache: 'static',
    open: false,
    emptyText: 'No catalogs in the static corpus',
  },
  type: {
    load: loadBlockTypeSuggestions,
    cache: { ttlMs: 300_000 },
    open: false,
    emptyText: 'No indexed block types yet',
  },
  has: {
    load: loadHasSuggestions,
    cache: 'static',
    open: false,
    emptyText: 'No features available',
  },
}

/** Live binding table — built-ins plus any page/test overrides. */
export const SUGGESTION_BINDINGS: Record<string, SuggestionBinding> = { ...builtinBindings }

/**
 * Override (or with `undefined`, restore) the binding for a slot type.
 * Restoring returns the built-in binding; unknown types are simply deleted.
 */
export function setSuggestionBinding(type: string, binding: SuggestionBinding | undefined): void {
  if (binding) {
    SUGGESTION_BINDINGS[type] = binding
  } else if (builtinBindings[type]) {
    SUGGESTION_BINDINGS[type] = builtinBindings[type]
  } else {
    delete SUGGESTION_BINDINGS[type]
  }
  invalidateSuggestions(type)
}

/** The active binding for a slot type, when one exists. */
export function getSuggestionBinding(type: string): SuggestionBinding | undefined {
  return SUGGESTION_BINDINGS[type]
}

interface CacheEntry {
  promise: Promise<SuggestionItem[]>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Load suggestions for a slot type, honoring the binding's cache policy.
 * Concurrent callers share the in-flight load. A failing source resolves to
 * an empty list (and is NOT pinned in the cache) so the popover degrades to
 * its empty state instead of breaking.
 */
export function loadSuggestions(type: string): Promise<SuggestionItem[]> {
  const binding = SUGGESTION_BINDINGS[type]
  if (!binding) return Promise.resolve([])

  const now = Date.now()
  const hit = cache.get(type)
  if (hit && hit.expiresAt > now) return hit.promise

  const promise = binding.load().catch(() => {
    cache.delete(type)
    return [] as SuggestionItem[]
  })
  cache.set(type, {
    promise,
    expiresAt: binding.cache === 'static' ? Infinity : now + binding.cache.ttlMs,
  })
  return promise
}

/** Drop cached suggestions — one slot, or every slot when omitted. */
export function invalidateSuggestions(type?: string): void {
  if (type === undefined) cache.clear()
  else cache.delete(type)
}
