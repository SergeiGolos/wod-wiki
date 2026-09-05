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

/** Open: the Entry's deep-link per its kind; block Entries anchor to their
 *  section within the parent note (#855 — honored wherever the target
 *  surface exposes section DOM ids; degrades to the plain note elsewhere). */
export function entryOpenHref(entry: Entry): string {
  const href = (() => {
    switch (entry.kind) {
      case 'note':
        // Playground entries open in the playground editor; journal notes use
        // the journal-date (YYYY-MM-DD), falling back to sourceItem.
        if (entry.sourceCatalog === 'playground') {
          return `/playground/${encodeURIComponent(entry.sourceItem)}`
        }
        return `/journal/${encodeURIComponent(entry.date ?? entry.sourceItem)}/`
      case 'session':
        return `/collections/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(entry.sourceItem)}`
      case 'post': {
        const date = entry.date ?? ''
        return `/feeds/${encodeURIComponent(entry.sourceCatalog)}/${encodeURIComponent(date)}/${encodeURIComponent(entry.sourceItem)}`
      }
      case 'effort':
        return `/effort/${encodeURIComponent(entry.id)}`
      case 'result':
        return `/results/${encodeURIComponent(entry.id)}`
      case 'segment':
      case 'event':
        return `/results/${encodeURIComponent(entry.execution?.resultId ?? entry.id)}`
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

/** Compare: any row with a blockContentId; routes to the analytics explorer. */
export function entryCompareHref(entry: Entry): string | null {
  if (!entry.blockContentId) return null
  return `/analytics/explorer?q=${encodeURIComponent(entry.blockContentId)}`
}

/** Add to today: Note + Post (per spec), and Result + Segment when associated with a noteId. */
export function entryCanAddToToday(entry: Entry): boolean {
  if (entry.kind === 'note' || entry.kind === 'post') return true
  if ((entry.kind === 'result' || entry.kind === 'segment') && !!entry.execution?.noteId) {
    return true
  }
  return false
}
