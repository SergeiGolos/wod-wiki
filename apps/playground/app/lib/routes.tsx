/**
 * Playground Route Definitions — canonical paths, builders, and redirect matrix.
 *
 * This is the single source of truth for all browser-level routes in the
 * playground app.  Route patterns, path builders, and legacy aliases live
 * here so nothing else hard-codes a path literal.
 *
 */

import { Navigate, useParams, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// React-Router path patterns (used by <Route path="...">)
// ---------------------------------------------------------------------------

export const ROUTE_PATTERNS = {
  home: '/',
  playgroundRoot: '/playground',
  playground: '/playground/:id',
  notePlaygroundAlias: '/note/playground/:name',
  note: '/note/:category/:name',
  journal: '/journal',
  journalEntry: '/journal/:identity',
  journalNote: '/journal/:date/:uuid',
  plan: '/plan',
  guideGettingStarted: '/guide/getting-started',
  guideSyntax: '/guide/syntax',
  guideBehaviors: '/guide/behaviors',
  guideAnalytics: '/guide/analytics',
  aiFirst: '/ai-first',
  feeds: '/feeds',
  feedDetail: '/feeds/:feedSlug',
  feedItem: '/feeds/:feedSlug/:feedDate/:feedItem',
  collections: '/collections',
  collectionDetail: '/collections/:slug',
  collectionWorkout: '/collections/:collection/:workout',
  tracker: '/tracker/:runtimeId',
  run: '/run/:runtimeId',
  load: '/load',
  loadJournal: '/load/journal',
  loadJournalDate: '/load/journal/:date',
  efforts: '/efforts',
  effort: '/effort/:slug',
  effortDetail: '/effort/:slug',
  analytics: '/analytics',
  analyticsExplorer: '/analytics/explorer',
  analyticsDashboard: '/analytics/dashboard',
  dashboard: '/dashboard',
  dashboardView: '/dashboard/:slug',
  library: '/library',
} as const;

// ---------------------------------------------------------------------------
// Canonical path builders
// ---------------------------------------------------------------------------

/** /playground/:id */
export function playgroundPath(id: string): string {
  return `/playground/${encodeURIComponent(id)}`;
}

/** /note/:category/:name */
export function notePath(category: string, name: string): string {
  return `/note/${encodeURIComponent(category)}/${encodeURIComponent(name)}`;
}

/** /journal/:date/ */
export function journalDatePath(date: string): string {
  return `/journal/${encodeURIComponent(date)}/`;
}

/**
 * Sub-selection of a single note within a date page.
 * Notes are stored by UUID, but the user only ever sees the whole date page —
 * note selection is UI-level state carried in the ?note= query param.
 * /journal/:date?note=<uuid>
 */
export function journalNotePath(date: string, uuid: string): string {
  return `/journal/${encodeURIComponent(date)}?note=${encodeURIComponent(uuid)}`;
}

/** Legacy single-segment journal route (date, UUID alias, or slug alias). */
export function journalEntryPath(identity: string): string {
  return `/journal/${encodeURIComponent(identity)}`;
}

/** /journal/:id?autoStart=<runtimeId> */
export function journalEntryAutoStartPath(id: string, runtimeId: string): string {
  return `/journal/${encodeURIComponent(id)}?autoStart=${encodeURIComponent(runtimeId)}`;
}

/** /feeds/:feedSlug */
export function feedDetailPath(feedSlug: string): string {
  return `/feeds/${encodeURIComponent(feedSlug)}`;
}

/** /feeds/:feedSlug/:feedDate/:feedItem */
export function feedItemPath(feedSlug: string, feedDate: string, feedItem: string): string {
  return `/feeds/${encodeURIComponent(feedSlug)}/${encodeURIComponent(feedDate)}/${encodeURIComponent(feedItem)}`;
}

/** /collections/:slug */
export function collectionDetailPath(slug: string): string {
  return `/collections/${encodeURIComponent(slug)}`;
}

/** /collections/:collection/:workout */
export function workoutPath(collection: string, workout: string): string {
  return `/collections/${encodeURIComponent(collection)}/${encodeURIComponent(workout)}`;
}

/** /tracker/:runtimeId (legacy redirect alias — preserved for external links) */
export function trackerPath(runtimeId: string): string {
  return `/tracker/${encodeURIComponent(runtimeId)}`;
}

/** /run/:runtimeId (canonical runtime seam for WOD-505) */
export function runPath(runtimeId: string): string {
  return `/run/${encodeURIComponent(runtimeId)}`;
}

/** /load */
export function loadPath(): string {
  return '/load';
}

export interface PlaygroundLoadUrlOptions {
  zip: string;
}

/** /load?zip=<encoded> */
export function buildPlaygroundLoadUrl({ zip }: PlaygroundLoadUrlOptions): string {
  return `/load?zip=${encodeURIComponent(zip)}`;
}

export interface JournalLoadUrlOptions {
  zip: string;
  date?: string;
}

/** /load/journal?zip=<encoded> or /load/journal/:date?zip=<encoded> */
export function buildJournalLoadUrl({ zip, date }: JournalLoadUrlOptions): string {
  const basePath = date ? `/load/journal/${encodeURIComponent(date)}` : '/load/journal';
  return `${basePath}?zip=${encodeURIComponent(zip)}`;
}

export function effortsPath(): string {
  return '/efforts';
}

/** /analytics/explorer with an optional pre-filled WQL query and range.
 * The explorer now lives at /dashboard; this builder keeps deep links (?q=)
 * working by pointing at the new home. */
export function analyticsExplorerPath(options?: { q?: string; weeks?: number }): string {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.weeks) params.set('weeks', String(options.weeks));
  const qs = params.toString();
  return `/dashboard${qs ? `?${qs}` : ''}`;
}

/** /dashboard — the WQL explorer (the dashboard namespace landing). */
export function dashboardPath(): string {
  return '/dashboard';
}

/** /dashboard/:slug — a saved or prebuilt dashboard. */
export function dashboardViewPath(slug: string): string {
  return `/dashboard/${encodeURIComponent(slug)}`;
}

/** /effort/:slug with optional modifiers and page controls */
export function effortPath(
  slug: string,
  modifiers?: Record<string, string>,
  options?: { mode?: string; tab?: string },
): string {
  const params = new URLSearchParams();
  if (modifiers) {
    for (const [k, v] of Object.entries(modifiers)) {
      params.set(k, v);
    }
  }
  if (options?.mode) params.set('mode', options.mode);
  if (options?.tab) params.set('tab', options.tab);
  const query = params.toString();
  return query ? `/effort/${encodeURIComponent(slug)}?${query}` : `/effort/${encodeURIComponent(slug)}`;
}

// ---------------------------------------------------------------------------
// Effort route utilities
// ---------------------------------------------------------------------------

/**
 * Parse effort route query params into resolver modifiers.
 *
 * Reserved params (not fed to resolver): mode, tab, q, origin
 * All other params are treated as attribute metric modifiers.
 */
export function parseEffortRouteModifiers(searchParams: URLSearchParams): Record<string, string> {
  const reserved = new Set(['mode', 'tab', 'q', 'origin']);
  const modifiers: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!reserved.has(key)) {
      modifiers[key] = value;
    }
  }
  return modifiers;
}

/**
 * Parse page-control params from effort route query string.
 *
 * Returns reserved params: mode, tab, q, origin
 */
export function parseEffortRouteOptions(searchParams: URLSearchParams): {
  mode?: string;
  tab?: string;
  q?: string;
  origin?: string;
} {
  return {
    mode: searchParams.get('mode') ?? undefined,
    tab: searchParams.get('tab') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    origin: searchParams.get('origin') ?? undefined,
  };
}
// ---------------------------------------------------------------------------
// Legacy-alias redirect components
// ---------------------------------------------------------------------------

/** Redirect /note/playground/:name → /playground/:name */
export function NotePlaygroundRedirect(): ReactNode {
  const { name } = useParams<{ name: string }>()
  return <Navigate to={playgroundPath(name!)} replace />
}

/** Redirect /workout/:category/:name → /collections/:category/:name */
export function WorkoutRedirect(): ReactNode {
  const { category, name } = useParams<{ category: string; name: string }>()
  return <Navigate to={workoutPath(category!, name!)} replace />
}

/** Redirect /tracker/:runtimeId → /run/:runtimeId */
export function TrackerRedirect(): ReactNode {
  const { runtimeId } = useParams<{ runtimeId: string }>()
  return <Navigate to={runPath(runtimeId!)} replace />
}

/**
 * Retired review routes (#946): the dedicated results screens are gone — the
 * explorer with a rows query is the review. Bookmarks land on `/dashboard`
 * with the equivalent WQL preselected:
 *   /review/:runtimeId                              → rows:{result:…}
 *   /note/:noteId/review[/…]                        → rows:{note:…}
 *   /note/:noteId/review/:sectionId/:resultId       → rows:{result:…}
 * A section-only URL cannot narrow to `rows:{block:…}` — legacy section ids
 * predate block content ids — so it widens to the note scope (a truthful
 * superset) rather than landing on an empty table.
 */
export function ReviewRedirect(): ReactNode {
  const { runtimeId, noteId, resultId } = useParams<{
    runtimeId?: string
    noteId?: string
    sectionId?: string
    resultId?: string
  }>()
  const scope = resultId ?? runtimeId
  const q = scope ? `rows:{result:${scope}}` : `rows:{note:${noteId ?? ''}}`
  return <Navigate to={`/dashboard?q=${encodeURIComponent(q)}`} replace />
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

/** Redirect /syntax/* → /guide/syntax/* */
export function SyntaxRedirect(): ReactNode {
  const { '*': splat } = useParams()
  return <Navigate to={splat ? `/guide/syntax/${splat}` : '/guide/syntax'} replace />
}

// ---------------------------------------------------------------------------
// Legacy-alias → canonical redirect matrix
// ---------------------------------------------------------------------------

export interface RedirectRule {
  /** Return captured params (or true for empty) when the pathname matches. */
  match: (pathname: string) => Record<string, string> | false;
  /** Build the destination from captured params. */
  to: (params: Record<string, string>) => string;
}

/**
 * Ordered list of legacy aliases that should redirect to their canonical
 * shape.  Checked in order; first match wins.
 */
export const ROUTE_REDIRECTS: RedirectRule[] = [
  // /note/playground/:name  →  /playground/:name
  {
    match: (p) => {
      const m = p.match(/^\/note\/playground\/([^/]+)$/);
      if (!m) return false;
      return { name: decodeURIComponent(m[1]!) };
    },
    to: ({ name }) => playgroundPath(name),
  },
  // /workout/:category/:name  →  /collections/:category/:name
  {
    match: (p) => {
      const m = p.match(/^\/workout\/([^/]+)\/([^/]+)$/);
      if (!m) return false;
      return { collection: decodeURIComponent(m[1]!), workout: decodeURIComponent(m[2]!) };
    },
    to: ({ collection, workout }) => workoutPath(collection, workout),
  },
  // /getting-started  →  / (retired: content folded into home)
  {
    match: (p) => {
      if (p !== '/getting-started') return false;
      return {};
    },
    to: () => '/',
  },
  // /chapters/basics  →  /guide/syntax/basics
  {
    match: (p) => {
      if (p !== '/chapters/basics') return false;
      return {};
    },
    to: () => '/guide/syntax/basics',
  },
  // /chapters/sequences  →  /guide/syntax (split content; no single canonical page)
  {
    match: (p) => {
      if (p !== '/chapters/sequences') return false;
      return {};
    },
    to: () => '/guide/syntax',
  },
  // /chapters/protocols  →  /guide/syntax/protocols
  {
    match: (p) => {
      if (p !== '/chapters/protocols') return false;
      return {};
    },
    to: () => '/guide/syntax/protocols',
  },
  // /challenge  →  / (retired: quick-start challenge chain now lives on home)
  {
    match: (p) => {
      if (p !== '/challenge') return false;
      return {};
    },
    to: () => '/',
  },
  // /syntax/*  →  /guide/syntax/* (covers old /syntax/custom-metrics route)
  {
    match: (p) => {
      const m = p.match(/^\/syntax(\/.+)?$/);
      if (!m) return false;
      return { rest: m[1] ?? '' };
    },
    to: ({ rest }) => `/guide/syntax${rest}`,
  },
  // /tracker/:runtimeId  →  /run/:runtimeId
  {
    match: (p) => {
      const m = p.match(/^\/tracker\/([^/]+)$/);
      if (!m) return false;
      return { runtimeId: decodeURIComponent(m[1]!) };
    },
    to: ({ runtimeId }) => runPath(runtimeId),
  },
  // /plan  →  /journal?mode=plan
  // Preserve as an alias so external links, command palettes, and bookmarks
  // resolve cleanly; /journal itself redirects on to the unified Library.
  {
    match: (p) => {
      if (p !== '/plan') return false
      return {}
    },
    to: () => '/journal?mode=plan',
  },
];

/**
 * Resolve a pathname against the redirect matrix.
 *
 * @returns The canonical destination string, or `null` when no alias matches.
 */
export function resolveRedirect(pathname: string): string | null {
  for (const rule of ROUTE_REDIRECTS) {
    const params = rule.match(pathname);
    if (params !== false) {
      return rule.to(params);
    }
  }


  return null;

}

// ---------------------------------------------------------------------------
// Route-category helpers (used by navigation UI)
// ---------------------------------------------------------------------------

/** Detect whether a location pathname belongs to the playground note family. */
export function isPlaygroundNotePath(pathname: string): boolean {
  return pathname.startsWith('/playground/') || pathname.startsWith('/note/playground/');
}

/** Detect whether a location pathname belongs to the journal entry family. */
export function isJournalEntryPath(pathname: string): boolean {
  return pathname.startsWith('/journal/') && pathname !== '/journal' && pathname !== '/journal/';
}

/** Detect whether a location pathname belongs to the tracker/run family. */
export function isTrackerPath(pathname: string): boolean {
  return pathname.startsWith('/tracker/') || pathname.startsWith('/run/');
}

/** Detect whether a location pathname belongs to the collection workout family. */
export function isCollectionWorkoutPath(pathname: string): boolean {
  return pathname.startsWith('/collections/') && pathname.split('/').length >= 4 && pathname.split('/')[3] !== '';
}

/** Detect whether a location pathname belongs to the efforts family. */
export function isEffortsPath(pathname: string): boolean {
  return pathname === '/efforts' || pathname.startsWith('/effort/');
}

/** Detect whether a location pathname belongs to the effort family. */
export function isEffortPath(pathname: string): boolean {
  return pathname.startsWith('/effort/') || pathname === '/efforts';
}

/** Detect whether a location pathname belongs to the ai-first family. */
export function isAiFirstPath(pathname: string): boolean {
  return pathname === '/ai-first' || pathname.startsWith('/ai-first/');
}

/**
 * Capture the three segments of `/feeds/:feedSlug/:feedDate/:feedItem`.
 * Returns `[feedSlug, feedDate, feedItem]` (raw, URL-encoded) or `null` if
 * the pathname is not a feed-item path. `AppContent` uses this because
 * `useParams` only captures generic `{category, name, id}`.
 */
export function matchFeedItem(pathname: string): [string, string, string] | null {
  const m = pathname.match(/^\/feeds\/([^/]+)\/([^/]+)\/([^/]+)$/);
  return m ? [m[1]!, m[2]!, m[3]!] : null;
}

/**
 * Capture the slug of `/feeds/:feedSlug`. Returns the slug or `null` if
 * the pathname is not a feed-detail path. Does not match feed-item paths
 * (those are 3-segment, this is 1-segment) — caller checks `matchFeedItem`
 * first if both may match.
 */
export function matchFeedDetail(pathname: string): string | null {
  const m = pathname.match(/^\/feeds\/([^/]+)$/);
  return m ? m[1]! : null;
}

