/**
 * Entry action helpers — the pure seam between an Entry and the URL the
 * Open / Run / Compare row action should navigate to. The LibraryRow
 * consumes these; the test seam is the URL the row would visit on click.
 *
 * URL shapes (per the spec's row-action section):
 *   Open  Note    → /journal/:date/
 *   Open  Session → /collections/:cat/:workout
 *   Open  Post    → /feeds/:feedSlug/:date/:item
 *   Run   (any)   → /run/:blockContentId
 *   Compare (any) → /analytics/explorer?q=:blockContentId
 *
 * Add-to-today is not a URL (it's a creation flow); see `useCreateJournalEntry`
 * in the build slice. The shape is exposed as a boolean (`entryCanAddToToday`)
 * so the LibraryRow can render the button.
 */
import type { Entry } from './entryMapper'

/** Open: the Entry's deep-link per its kind. */
export function entryOpenHref(entry: Entry): string {
  switch (entry.kind) {
    case 'note':
      // Entry.date is the journal-date (YYYY-MM-DD); fall back to sourceItem.
      return `/journal/${encodeURIComponent(entry.date ?? entry.sourceItem)}/`
    case 'session':
      return `/collections/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(entry.sourceItem)}`
    case 'post': {
      const date = entry.date ?? ''
      return `/feeds/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(date)}/${encodeURIComponent(entry.sourceItem)}`
    }
  }
}

/** Run: only meaningful for rows with a blockContentId; Session/Post per spec. */
export function entryRunHref(entry: Entry): string | null {
  if (!entry.blockContentId) return null
  if (entry.kind === 'note') return null
  return `/run/${encodeURIComponent(entry.blockContentId)}`
}

/** Compare: any row with a blockContentId; routes to the analytics explorer. */
export function entryCompareHref(entry: Entry): string | null {
  if (!entry.blockContentId) return null
  return `/analytics/explorer?q=${encodeURIComponent(entry.blockContentId)}`
}

/** Add to today: Note + Post (per spec); Session is undated and cannot be added. */
export function entryCanAddToToday(entry: Entry): boolean {
  return entry.kind === 'note' || entry.kind === 'post'
}
