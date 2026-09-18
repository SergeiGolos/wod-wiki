/**
 * Entry action helpers — the pure seam between an Entry and the URL the
 * Open / Compare row action should navigate to. The LibraryRow consumes
 * these; the test seam is the URL the row would visit on click.
 *
 * URL shapes (per the spec's row-action section):
 *   Open  Note    → /journal/:date/
 *   Open  Session → /collections/:cat/:workout
 *   Open  Post    → /feeds/:feedSlug/:date/:item
 *   Compare (any) → /analytics/explorer?q=:blockContentId
 *
 * Run is NOT a URL: WallClockPage only consumes pendingRuntimes, so the Run
 * action stages a runtime through startEntryRun (./entryRun) and navigates
 * to /run/:runtimeId itself.
 *
 * Add-to-today is not a URL (it's a creation flow); the Library page wires it
 * via `addEntryToTodayInput`. The shape is exposed as a boolean
 * (`entryCanAddToToday`) so the LibraryRow can render the button.
 */
import type { Entry } from './entryMapper'
import { noteByIdPath, sessionDetailPath } from './routes'

/** Open: the Entry's deep-link per its kind; block Entries anchor to their
 *  section within the parent note (#855 — honored wherever the target
 *  surface exposes section DOM ids; degrades to the plain note elsewhere).
 *  Every stored note opens in the canonical editor `/notes/:noteId`; the
 *  remaining specialization is the page render (`/p/:pageId`) for notes that
 *  publish a page (#link-crosswalk). */
export function entryOpenHref(entry: Entry): string {
  const href = (() => {
    switch (entry.kind) {
      case 'note':
        // Page notes (guides, user-built pages) render at their page id; the
        // lookup in canvasRouteLookup resolves the declared route.
        if (entry.sourceCatalog === 'guides') {
          return entry.pageId ? `/p/${entry.pageId}` : `/${entry.sourceItem}`
        }
        // Playground entries open in the playground editor; other stored
        // notes open in the canonical single-note editor.
        if (entry.sourceCatalog === 'playground') {
          return `/playground/${encodeURIComponent(entry.sourceItem)}`
        }
        return noteByIdPath(entry.id)
      case 'session':
        return `/c/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(entry.sourceItem)}`
      case 'post': {
        const date = entry.date ?? ''
        return `/feeds/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(date)}/${encodeURIComponent(entry.sourceItem)}`
      }
      case 'effort':
        return `/e/${encodeURIComponent(entry.id)}`
      case 'result':
        return sessionDetailPath(entry.id)
      case 'segment':
      case 'event':
        return sessionDetailPath(entry.execution?.resultId ?? entry.id)
      default:
        return '/'
    }
  })()
  return entry.block ? `${href}#${encodeURIComponent(entry.block.segmentId)}` : href
}

/** True when the entry already lives in the playground (Open is the playground
 *  action — the feed's "Playground" action targets non-playground content). */
export function entryIsPlayground(entry: Entry): boolean {
  return entry.sourceCatalog === 'playground' || entry.sourceId === 'playground'
}

/** Compare: any row with a blockContentId; routes to the WQL explorer on the
 *  dashboards list (the ?q= deep link pre-fills the query). */
export function entryCompareHref(entry: Entry): string | null {
  if (!entry.blockContentId) return null
  return `/dashboards?q=${encodeURIComponent(entry.blockContentId)}`
}

/** Add to today: Note + Post (per spec), and Result + Segment when associated with a noteId. */
export function entryCanAddToToday(entry: Entry): boolean {
  if (entry.kind === 'note' || entry.kind === 'post') return true
  if ((entry.kind === 'result' || entry.kind === 'segment') && !!entry.execution?.noteId) {
    return true
  }
  return false
}
