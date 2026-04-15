/**
 * collectionGroups — shared mapping of category labels → collection IDs.
 *
 * Used by:
 *   - CollectionsPage  — to group the list by category
 *   - MarkdownCanvasPage — to show a clickable category chip on collection detail pages
 */

export const COLLECTION_GROUPS: Record<string, string[]> = {
  Kettlebell: [
    'kettlebell', 'dan-john', 'geoff-neupert', 'girevoy-sport',
    'joe-daniels', 'keith-weber', 'mark-wildman', 'steve-cotter', 'strongfirst',
  ],
  Crossfit: [
    'crossfit-games - 2020',
    'crossfit-games - 2021',
    'crossfit-games - 2022',
    'crossfit-games - 2023',
    'crossfit-games - 2024',
    'crossfit-girls',
  ],
  Swimming: [
    'swimming-pre-highschool', 'swimming-highschool', 'swimming-college',
    'swimming-post-college', 'swimming-masters', 'swimming-olympic', 'swimming-triathlete',
  ],
  Other: ['unconventional'],
}

export const ASSIGNED = new Set(Object.values(COLLECTION_GROUPS).flat())

/** Returns the category label (e.g. "Kettlebell") for a given collection id, or null. */
export function getCategoryForCollection(collectionId: string): string | null {
  for (const [label, ids] of Object.entries(COLLECTION_GROUPS)) {
    if (ids.includes(collectionId)) return label
  }
  return null
}
