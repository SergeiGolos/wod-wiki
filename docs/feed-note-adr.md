# ADR: FeedNote — Composing Journal List + Collection Canvas as a New Note Subtype

**Status**: Revised  
**Date**: 2026-04-30  
**Refs**: `feed-note-prd.md`, `note-editor-adr.md`

---

## Context

wod-wiki has four distinct page contexts for rendering markdown content, each implemented as a named subtype:

| Subtype | Category Key | Source | Editable | List View |
|---|---|---|---|---|
| PlaygroundNote | `playground` | IndexedDB | ✓ | ✗ |
| JournalNote | `journal` | IndexedDB | ✓ | ✓ (date scroll) |
| CollectionNote | `collections` | Bundled `.md` | ✗ | ✓ (folder list) |
| WorkoutNote | `<category>` | Bundled `.md` | ✓ | ✗ |

The request is to add a fifth subtype — **FeedNote** — that reads bundled markdown files with a date-stamped naming convention, groups them by date using the Journal's scroll component, and renders individual entries via the Collection's read-only canvas renderer.

Key structural fact: the `{feed-name}` suffix in the filename is the **channel identity** — not a slug for routing. Multiple files share the same feed-name, forming a stream. The detail route uses the entire filename stem as its unique key.

The hard constraint: **no new reusable UI components**. Assemble from existing primitives only.

---

## Decision

### 1. New Category Key: `feeds`

FeedNote uses `category: 'feeds'` as its type discriminator, consistent with how `NON_COLLECTION_CATEGORIES` and `INLINE_RUNTIME_CATEGORIES` gate behavior in `pageUtils.ts`.

### 2. File Convention

Files live in `markdown/feeds/` and are named:

```
{YYYY-MM-DD}-{HHMM}-{feed-name}.md
```

| Segment | Role |
|---|---|
| `YYYY-MM-DD` | Date → `JournalDateScroll` grouping key |
| `HHMM` | Time → displayed in the list row |
| `feed-name` | Channel identity → used for sidebar filter chips and display |

The full filename stem (`{YYYY-MM-DD}-{HHMM}-{feed-name}`) is globally unique by construction and serves as the route param. Files not matching the pattern are silently ignored by `parseFeedFiles()`.

### 3. Data Model

A new pure-function utility at `playground/src/lib/feedFiles.ts`:

```ts
export interface FeedItem {
  id: string        // full filename stem — unique, used as route param
  dateKey: string   // 'YYYY-MM-DD' — JournalDateScroll grouping key
  time: string      // 'HHMM' — for display
  feedName: string  // channel identity — for filter chips
  title: string     // title-cased feedName for display
  content: string   // raw markdown
}

export function parseFeedFiles(
  glob: Record<string, string>
): FeedItem[]
```

`parseFeedFiles()` is deterministic and side-effect-free — straightforward to unit test. The regex is:

```
/^(\d{4}-\d{2}-\d{2})-(\d{2}:\d{2})-(.+)\.md$/
```

applied to the filename (last path segment).

### 4. Query State: `useFeedsQueryState`

A new hook at `playground/src/hooks/useFeedsQueryState.ts`, parallel to `useCollectionsQueryState`. It manages a `feeds` URL query param (comma-separated feed-names). Exports:

```ts
{
  selectedFeeds: string[]
  toggleFeed: (name: string) => void
  clearFeeds: () => void
}
```

This hook is the only shared state between `FeedsNavPanel` and `FeedsListPage`. No prop-drilling.

### 5. Sidebar Panel: `FeedsNavPanel`

A new panel at `playground/src/nav/panels/FeedsNavPanel.tsx`, structurally identical to `CollectionsNavPanel`:

- Derives the feed-name list from parsed `FeedItem[]` (sorted alphabetically, deduplicated).
- Renders chip toggles via `useFeedsQueryState()`.
- Shows a Clear button when any chips are active.
- Returns `null` on `/feeds/:id` entry pages (same guard: `location.pathname !== '/feeds'`).

No new UI primitives. The chip button markup is copy-equivalent to `CollectionsNavPanel`'s chip rows.

### 6. List View: `FeedsListPage`

A new view at `playground/src/views/FeedsListPage.tsx`. Wraps `JournalDateScroll` — same component used by `JournalWeeklyPage`. Differences from `JournalWeeklyPage`:

- Data source: static `FeedItem[]` from `parseFeedFiles()`, not IndexedDB.
- Filtering: `selectedFeeds` from `useFeedsQueryState()` applied before passing to scroll component.
- Entry map shape: `FeedItem[]` adapted to `Map<string, JournalEntrySummary>` (same shape `JournalWeeklyPage` builds from IndexedDB pages).

No changes to `JournalDateScroll`.

### 7. Detail View: `FeedNotePage`

A new page at `playground/src/pages/FeedNotePage.tsx`. Because feed entries are bundled, read-only markdown canvas documents:

- Renderer: `MarkdownCanvasPage` (same as `/collections/:slug` entries).
- Shell: `CanvasPage` (same as `/collections`).
- The `:id` param (full filename stem) is looked up in the parsed `FeedItem[]` to recover `content`.
- The `content` is parsed by `findCanvasPage()` or equivalent to produce the `CanvasPageData` structure `MarkdownCanvasPage` expects.

### 8. Routes

Two new routes added to `App.tsx`:

```
/feeds           → FeedsListPage (inside CanvasPage shell)
/feeds/:id       → FeedNotePage  (inside CanvasPage shell)
```

`AppContent`'s `currentWorkout` detection and `isJournalEntryRoute`/`isPlaygroundRoute` guards extended with a `/feeds` branch.

### 9. Navigation

New L1 item in `appNavTree.ts` after `collections`:

```ts
{
  id: 'feeds',
  label: 'Feeds',
  level: 1,
  icon: NewspaperIcon,   // @heroicons/react/20/solid
  action: { type: 'route', to: '/feeds' },
  isActive: isRouteActive('/feeds'),
  panel: FeedsNavPanel,
}
```

---

## Alternatives Considered

### A. Embed feed-name as front-matter, not filename

Would allow arbitrary filenames. Rejected — front-matter parsing adds complexity and makes the file listing non-obvious. The filename-as-schema is consistent with how the Journal uses `YYYY-MM-DD` date-keys and gives immediate visual sorting in any file browser.

### B. Reuse the Collections list view (folder list) instead of Journal date scroll

Collections shows a flat folder list, not a chronological scroll. Rejected — the time-ordered, date-grouped UX is the defining characteristic of this feature.

### C. Filter by feed-name via a `TextFilterStrip` (like the Collections search bar)

`TextFilterStrip` does substring text search. Feed-names are enumerable and discrete — chip toggles with multi-select are more appropriate (same conclusion the Collections category filter reached). Rejected in favor of the `CollectionsNavPanel` chip pattern.

### D. Use a single query param + `useJournalQueryState` for the filter

`useJournalQueryState` conflates date selection, tag filtering, and scroll state in a single hook — coupling concerns. A dedicated `useFeedsQueryState` keeps the feeds filter isolated and mirrors the `useCollectionsQueryState` precedent. More predictable.

---

## Consequences

**Positive:**
- Zero new UI components introduced.
- `JournalDateScroll`, `MarkdownCanvasPage`, `CanvasPage` reused unmodified.
- `CollectionsNavPanel` and `useCollectionsQueryState` provide a proven template for the sidebar panel and query hook.
- `parseFeedFiles()` is a pure function — high test confidence with minimal setup.
- Feature is fully additive — no existing routes, components, or data flows modified.

**Negative / Watch-outs:**
- `JournalEntrySummary` adapter in `FeedsListPage` must stay in sync if that type evolves.
- `MarkdownCanvasPage` currently receives a `CanvasPageData` object; how feed markdown content is converted to that shape needs a clean adapter (same as how canvas routes are registered — see `canvasRoutes.ts`). Feed entries likely don't need full canvas section parsing; a single-section wrapper is sufficient.
- Bundle size grows with feed file count (eagerly bundled). Acceptable for curated content; lazy loading is a future option.
- `HHMM` in filenames uses a colon — this is valid on Linux/macOS but **not on Windows**. If Windows support matters, the separator should be changed to `-` in the spec (e.g., `HH-MM`). Flag for project decision.

---

## Implementation Checklist

- [ ] `markdown/feeds/` folder with ≥2 feed-names and ≥2 entries per name
- [ ] `playground/src/lib/feedFiles.ts` — `FeedItem` type + `parseFeedFiles()`
- [ ] Unit tests for `parseFeedFiles()` (valid, invalid, edge cases)
- [ ] `playground/src/hooks/useFeedsQueryState.ts`
- [ ] `playground/src/nav/panels/FeedsNavPanel.tsx`
- [ ] `playground/src/views/FeedsListPage.tsx`
- [ ] `playground/src/pages/FeedNotePage.tsx`
- [ ] Routes `/feeds` + `/feeds/:id` in `App.tsx`
- [ ] `AppContent` detection updated for `/feeds` path prefix
- [ ] `appNavTree.ts` — Feeds L1 item after Collections
- [ ] Storybook story: `FeedsListPage`
- [ ] Storybook story: `FeedNotePage`
