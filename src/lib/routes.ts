/**
 * Route Definitions & Navigation Helpers
 *
 * Canonical route structure for WOD Wiki views:
 *
 *   {noteId}/plan                                    — Plan view
 *   {noteId}/track/{sectionId}                       — Runtime/tracking for a wod section
 *   {noteId}/review                                  — All results for the note
 *   {noteId}/review/{sectionId}                      — Results filtered to a wod section
 *   {noteId}/review/{sectionId}/{resultId}           — Single result set
 *
 * All IDs support both full UUIDs and short-IDs (last segment of UUID).
 */

// ---------------------------------------------------------------------------
// Route param types
// ---------------------------------------------------------------------------

/** Base params shared by every note-level route */
export interface NoteRouteParams {
  /** Short-ID or full UUID of the note / history entry */
  noteId: string;
}

/** Plan view — just needs the note */
export interface PlanRouteParams extends NoteRouteParams {
  view: 'plan';
}

/** Track view — targets a specific wod section */
export interface TrackRouteParams extends NoteRouteParams {
  view: 'track';
  /** The wod section id within the note to execute */
  sectionId: string;
}

/** Review view — progressive filtering */
export interface ReviewAllRouteParams extends NoteRouteParams {
  view: 'review';
  sectionId?: undefined;
  resultId?: undefined;
}

export interface ReviewSectionRouteParams extends NoteRouteParams {
  view: 'review';
  /** Filter to results from this wod section */
  sectionId: string;
  resultId?: undefined;
}

export interface ReviewResultRouteParams extends NoteRouteParams {
  view: 'review';
  /** The wod section the result belongs to */
  sectionId: string;
  /** Specific result set / run id */
  resultId: string;
}

export type ReviewRouteParams =
  | ReviewAllRouteParams
  | ReviewSectionRouteParams
  | ReviewResultRouteParams;

/** Union of all valid routed states */
export type WodRouteParams =
  | PlanRouteParams
  | TrackRouteParams
  | ReviewRouteParams;

// ---------------------------------------------------------------------------
// React-Router path patterns (consumed by <Route path="..."> )
// ---------------------------------------------------------------------------

/** Route patterns registered in App.tsx */
export const ROUTE_PATTERNS = {
  /** /note/:noteId → redirect to plan */
  noteRoot:         '/note/:noteId',
  /** /note/:noteId/plan */
  plan:             '/note/:noteId/plan',
  /** /note/:noteId/track (no section selected yet) */
  trackBase:        '/note/:noteId/track',
  /** /note/:noteId/track/:sectionId */
  track:            '/note/:noteId/track/:sectionId',
  /** /note/:noteId/review */
  reviewAll:        '/note/:noteId/review',
  /** /note/:noteId/review/:sectionId */
  reviewSection:    '/note/:noteId/review/:sectionId',
  /** /note/:noteId/review/:sectionId/:resultId */
  reviewResult:     '/note/:noteId/review/:sectionId/:resultId',

  // Playground equivalents (static / non-persisted)
  playgroundRoot:   '/playground',
  playgroundPlan:   '/playground/plan',
  playgroundTrack:  '/playground/track/:sectionId',
  playgroundReview: '/playground/review',
} as const;

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

/** Build a fully-qualified hash path for a plan view */
export function planPath(noteId: string): string {
  return `/note/${noteId}/plan`;
}

/** Build a fully-qualified hash path for the track view */
export function trackPath(noteId: string, sectionId?: string): string {
  if (sectionId) {
    return `/note/${noteId}/track/${sectionId}`;
  }
  return `/note/${noteId}/track`;
}

/**
 * Build a fully-qualified hash path for the review view.
 *
 * @param noteId     - Note identifier (short or full UUID)
 * @param sectionId  - Optional wod-section filter
 * @param resultId   - Optional single-result filter (requires sectionId)
 */
export function reviewPath(
  noteId: string,
  sectionId?: string,
  resultId?: string,
): string {
  let path = `/note/${noteId}/review`;
  if (sectionId) {
    path += `/${sectionId}`;
    if (resultId) {
      path += `/${resultId}`;
    }
  }
  return path;
}

/** Build any route path from a typed params object */
export function buildPath(params: WodRouteParams): string {
  switch (params.view) {
    case 'plan':
      return planPath(params.noteId);
    case 'track':
      return trackPath(params.noteId, params.sectionId);
    case 'review':
      if (params.sectionId && params.resultId) {
        return reviewPath(params.noteId, params.sectionId, params.resultId);
      }
      if (params.sectionId) {
        return reviewPath(params.noteId, params.sectionId);
      }
      return reviewPath(params.noteId);
  }
}

// ---------------------------------------------------------------------------
// Param parsing (from react-router useParams output)
// ---------------------------------------------------------------------------

/**
 * Raw params shape from react-router for the most general route.
 * All fields are optional because react-router unions across patterns.
 */
export interface RawRouteParams {
  noteId?: string;
  view?: string;
  sectionId?: string;
  resultId?: string;
}

/**
 * Parse raw useParams() output into a typed WodRouteParams.
 * Returns `null` when the URL doesn't match any recognised pattern.
 */
export function parseRouteParams(raw: RawRouteParams): WodRouteParams | null {
  const { noteId, view, sectionId, resultId } = raw;
  if (!noteId) return null;

  switch (view) {
    case 'plan':
      return { noteId, view: 'plan' };

    case 'track':
      if (!sectionId) return null; // track requires a section
      return { noteId, view: 'track', sectionId };

    case 'review':
      if (sectionId && resultId) {
        return { noteId, view: 'review', sectionId, resultId };
      }
      if (sectionId) {
        return { noteId, view: 'review', sectionId };
      }
      return { noteId, view: 'review' };

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Playground path builders (static / non-persisted content)
// ---------------------------------------------------------------------------

export function playgroundPlanPath(): string {
  return '/playground/plan';
}

export function playgroundTrackPath(sectionId: string): string {
  return `/playground/track/${sectionId}`;
}

export function playgroundReviewPath(): string {
  return '/playground/review';
}
