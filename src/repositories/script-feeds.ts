/**
 * WOD Feeds — public adapter over the script-groupings loader.
 *
 * A feed is a Grouping whose items carry dates, from
 * markdown/feeds/{feed-slug}/YYYY-MM-DD/{file}.md. Items are sorted by date
 * descending (most recent first); feeds are sorted by name ascending.
 * Results are memoised after first call (build-time data).
 */

import { getGroupings } from './script-groupings';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScriptFeedItem {
  /** Filename without extension, e.g. "monday-strength" */
  id: string;
  /** Display name derived from filename */
  name: string;
  /** Raw markdown content */
  content: string;
  /** Publication date key: YYYY-MM-DD (parent directory name) */
  feedDate: string;
  /** Full glob path key */
  path: string;
}

export interface ScriptFeed {
  /** Directory name, e.g. "crossfit-programming" */
  id: string;
  /** Display name, e.g. "CrossFit Programming" */
  name: string;
  /** The content of README.md if it exists */
  readme?: string;
  /** Category slugs parsed from the README front matter `category` field */
  categories: string[];
  /** All feed items sorted by feedDate descending (most recent first) */
  items: ScriptFeedItem[];
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Cached result */
let _feeds: ScriptFeed[] | null = null;

/**
 * Get all WOD feeds derived from markdown/feeds/ subdirectories.
 * Results are memoised after first call (build-time data never changes).
 */
export function getScriptFeeds(): ScriptFeed[] {
  if (_feeds) return _feeds;

  _feeds = getGroupings('feeds')
    .map(grouping => ({
      id: grouping.id,
      name: grouping.name,
      readme: grouping.readme,
      categories: grouping.categories,
      items: grouping.items
        .map(({ id, name, content, path, date }) => ({
          id,
          name,
          content,
          feedDate: date ?? '',
          path,
        }))
        // Most recent dates first
        .sort((a, b) => b.feedDate.localeCompare(a.feedDate)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return _feeds;
}

/** Get a single feed by ID. */
export function getScriptFeed(id: string): ScriptFeed | undefined {
  return getScriptFeeds().find(f => f.id === id);
}

/** Get a specific item within a feed by date + item id. */
export function getScriptFeedItem(
  feedId: string,
  feedDate: string,
  itemId: string,
): ScriptFeedItem | undefined {
  return getScriptFeed(feedId)?.items.find(
    i => i.feedDate === feedDate && i.id === itemId,
  );
}

/** Unique date keys present in a feed, most recent first. */
export function getFeedDateKeys(feed: ScriptFeed): string[] {
  return Array.from(new Set(feed.items.map(i => i.feedDate))).sort().reverse();
}
