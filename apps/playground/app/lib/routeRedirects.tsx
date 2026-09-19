/**
 * Legacy-alias redirect components — one component per retired path family,
 * mounted directly in the App route table. Pure re-addressing lives here;
 * route patterns, URL builders, and the resolveRedirect matrix stay in
 * ./routes.
 */
import { Navigate, useParams, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isNoteUuid } from './journalRoute'
import {
  collectionPath,
  effortPath,
  noteByIdPath,
  playgroundPath,
  runPath,
  sessionDetailPath,
  workoutPath,
} from './routes'

// ---------------------------------------------------------------------------
// Legacy-alias redirect components
// ---------------------------------------------------------------------------

// Legacy-alias redirect components

/** Redirect /note/playground/:name → /playground/:name */
export function NotePlaygroundRedirect(): ReactNode {
  const { name } = useParams<{ name: string }>()
  return <Navigate to={playgroundPath(name!)} replace />
}

/** Redirect /workout/:category/:name → /c/:category/:name */
export function WorkoutRedirect(): ReactNode {
  const { category, name } = useParams<{ category: string; name: string }>()
  return <Navigate to={workoutPath(category!, name!)} replace />
}

/**
 * Redirect the /collections item family to the /c prefix. A note-UUID target
 * opens the canonical single-note editor; date and page-slug targets keep
 * their scoped collection view under /c.
 */
export function CollectionItemRedirect(): ReactNode {
  const { slug, target } = useParams<{ slug: string; target: string }>()
  const { search } = useLocation()
  if (target == null) {
    return <Navigate to={{ pathname: collectionPath(slug!), search }} replace />
  }
  if (isNoteUuid(decodeURIComponent(target))) {
    return <Navigate to={{ pathname: noteByIdPath(decodeURIComponent(target)), search }} replace />
  }
  return <Navigate to={{ pathname: workoutPath(slug!, decodeURIComponent(target)), search }} replace />
}

/** Redirect /effort/:slug → /e/:slug */
export function EffortRedirect(): ReactNode {
  const { slug } = useParams<{ slug: string }>()
  return <Navigate to={effortPath(slug!)} replace />
}

/** Redirect /results → /sessions, preserving any ?q= deep link. */
export function ResultsRedirect(): ReactNode {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/sessions', search }} replace />
}

/** Redirect /results/segments → /sessions with the segments query pre-filled. */
export function SegmentsRedirect(): ReactNode {
  return <Navigate to={`/sessions?q=${encodeURIComponent('rows:segment{} last 8w')}`} replace />
}

/** Redirect /results/:resultId → /sessions/:sessionId */
export function ResultDetailRedirect(): ReactNode {
  const { resultId } = useParams<{ resultId: string }>()
  return <Navigate to={sessionDetailPath(resultId!)} replace />
}

/** Redirect /dashboard → /dashboards, preserving any ?q=/?weeks= deep link. */
export function DashboardLandingRedirect(): ReactNode {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/dashboards', search }} replace />
}

/** Redirect /tracker/:runtimeId → /run/:runtimeId */
export function TrackerRedirect(): ReactNode {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  return <Navigate to={runPath(runtimeId!)} replace />
}

/**
 * Retired review routes (#946, Ticket 005): dedicated execution telemetry routes
 * live on `/sessions` and `/sessions/:sessionId`. Bookmarks land directly on
 * `/sessions/:sessionId` (or note-scoped `/sessions?q=...`):
 *   /review/:runtimeId                              → /sessions/:runtimeId
 *   /note/:noteId/review/:sectionId/:resultId       → /sessions/:resultId
 *   /note/:noteId/review[/…]                        → /sessions?q=rows:all{note:…}
 */
export function ReviewRedirect(): ReactNode {
  const { runtimeId, noteId, resultId } = useParams<{
    runtimeId?: string
    noteId?: string
    sectionId?: string
    resultId?: string
  }>()
  const scope = resultId ?? runtimeId
  if (scope) {
    return <Navigate to={sessionDetailPath(scope)} replace />
  }
  if (noteId) {
    return <Navigate to={`/sessions?q=${encodeURIComponent(`rows:all{note:${noteId}}`)}`} replace />
  }
  return <Navigate to="/sessions" replace />
}

/** Redirect /getting-started → / (retired: content folded into home) */
export function GettingStartedRedirect(): ReactNode {
  return <Navigate to="/" replace />
}

/** Redirect /plan → /journal?mode=plan, preserving any caller-supplied query string. */
export function PlanRedirect(): ReactNode {
  const search = useLocation().search
  // The plan-mode param is appended last; any caller `?zip=...` is preserved.
  const suffix = search && search.startsWith('?') ? `${search}&mode=plan` : '?mode=plan'
  return <Navigate to={`/journal${suffix}`} replace />
}

/** Redirect /syntax/* → /p/syntax/* (pages carry the slug, not the namespace). */
export function SyntaxRedirect(): ReactNode {
  const { '*': splat } = useParams()
  return <Navigate to={splat ? `/p/syntax/${splat}` : '/p/syntax'} replace />
}

/** Redirect /analytics/explorer → /dashboards, preserving the shareable ?q=
 *  (and ?weeks=) query string. The WQL explorer lives on the dashboards list. */
export function ExplorerRedirect(): ReactNode {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/dashboards', search }} replace />
}
