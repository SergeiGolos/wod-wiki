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
  efforts: '/efforts',
  effort: '/effort/:slug',
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

export function effortsPath(): string {
  return '/efforts';
}

export function effortPath(slug: string): string {
  return `/effort/${encodeURIComponent(slug)}`;
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
