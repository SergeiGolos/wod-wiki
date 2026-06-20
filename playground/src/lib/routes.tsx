/**
 * Playground Route Definitions — canonical paths, builders, and redirect matrix.
 *
 * This is the single source of truth for all browser-level routes in the
 * playground app.  Route patterns, path builders, and legacy aliases live
 * here so nothing else hard-codes a path literal.
 *
 */

import { Navigate, useParams } from 'react-router-dom'
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
  journalEntry: '/journal/:id',
  plan: '/plan',
  guideGettingStarted: '/guide/getting-started',
  guideSyntax: '/guide/syntax',
  aiFirst: '/ai-first',
  feeds: '/feeds',
  feedDetail: '/feeds/:feedSlug',
  feedItem: '/feeds/:feedSlug/:feedDate/:feedItem',
  collections: '/collections',
  collectionDetail: '/collections/:slug',
  collectionWorkout: '/collections/:collection/:workout',
  tracker: '/tracker/:runtimeId',
  run: '/run/:runtimeId',
  review: '/review/:runtimeId',
  load: '/load',
  loadJournal: '/load/journal',
  loadJournalDate: '/load/journal/:date',
  efforts: '/efforts',
  effort: '/effort/:slug',
  effortDetail: '/effort/:slug',
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

/** /journal/:id */
export function journalEntryPath(id: string): string {
  return `/journal/${encodeURIComponent(id)}`;
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

/** /review/:runtimeId */
export function reviewPath(runtimeId: string): string {
  return `/review/${encodeURIComponent(runtimeId)}`;
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

/** Redirect /getting-started → /guide/getting-started */
export function GettingStartedRedirect(): ReactNode {
  return <Navigate to="/guide/getting-started" replace />
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
  // /getting-started  →  /guide/getting-started
  {
    match: (p) => {
      if (p !== '/getting-started') return false;
      return {};
    },
    to: () => '/guide/getting-started',
  },
  // /syntax/*  →  /guide/syntax/*
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
  return pathname.startsWith('/journal/') && pathname !== '/journal';
}

/** Detect whether a location pathname belongs to the tracker/run family. */
export function isTrackerPath(pathname: string): boolean {
  return pathname.startsWith('/tracker/') || pathname.startsWith('/run/');
}

/** Detect whether a location pathname belongs to the review family. */
export function isReviewPath(pathname: string): boolean {
  return pathname.startsWith('/review/');
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

