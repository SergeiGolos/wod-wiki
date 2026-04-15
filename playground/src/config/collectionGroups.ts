/**
 * collectionGroups — derives category→collection mappings from the
 * `category` front matter field in each collection's README.md.
 *
 * Used by:
 *   - CollectionsPage  — to group and filter the list by category
 *   - CollectionsNavPanel — to show clickable category chips
 *   - MarkdownCanvasPage — to show a clickable category chip on collection detail pages
 */

import { getWodCollections } from '@/repositories/wod-collections'

/**
 * Build a map of category slug → collection IDs from front matter data.
 * Categories are sorted alphabetically.
 */
export function getCategoryGroups(): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const collection of getWodCollections()) {
    for (const cat of collection.categories) {
      if (!map[cat]) map[cat] = []
      map[cat].push(collection.id)
    }
  }
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
}

/** All collection IDs that appear in at least one category group. */
export function getAssignedIds(): Set<string> {
  return new Set(Object.values(getCategoryGroups()).flat())
}

/** Returns the first category slug for a given collection id, or null. */
export function getCategoryForCollection(collectionId: string): string | null {
  const groups = getCategoryGroups()
  for (const [cat, ids] of Object.entries(groups)) {
    if (ids.includes(collectionId)) return cat
  }
  return null
}

// ── Legacy static exports (kept for existing consumers) ───────────────────────

/** @deprecated Use getCategoryGroups() instead */
export const COLLECTION_GROUPS = getCategoryGroups()

/** @deprecated Use getAssignedIds() instead */
export const ASSIGNED = getAssignedIds()
