# PRD: FeedNote — Named Feed Channels with Date-Grouped List View

**Status**: Revised  
**Author**: Guppi  
**Date**: 2026-04-30  
**Revision**: Corrects file naming convention — feed-name is the channel identity, not the slug.

---

## Overview

FeedNote is a new first-class note subtype that surfaces a folder of date-stamped markdown files as a scrollable, date-grouped feed — combining the scrolling list UX of the Journal with the read-only canvas rendering of a Collection note.

Each file belongs to a named **feed channel** (the `{feed-name}` suffix of the filename). Multiple files can share the same feed-name, forming a stream of entries for that channel. The list view provides feed-name chip filters in the sidebar panel, matching the pattern used by the Collections category filter.

---

## Problem

Users want to maintain a folder of curated or imported markdown files and browse them in chronological order inside wod-wiki, optionally scoped to a specific named stream. The current note subtypes don't cover this:

| Subtype | Persisted | List View | Read-Only Canvas | Feed Filter |
|---|---|---|---|---|
| PlaygroundNote | IndexedDB | ✗ | ✗ | — |
| JournalNote | IndexedDB | ✓ (date scroll) | ✗ | tags (placeholder) |
| CollectionNote | Bundled `.md` | ✓ (folder list) | ✓ | category chips |
| **FeedNote** _(new)_ | Bundled `.md` | ✓ (date scroll) | ✓ | feed-name chips |

---

## Goals

1. Render a `markdown/feeds/` folder as a chronological, scrollable list view — reusing `JournalDateScroll`.
2. Clicking an entry opens a read-only canvas view — reusing `MarkdownCanvasPage`.
3. The sidebar panel shows feed-name chip filters (derived dynamically from filenames) — following the `CollectionsNavPanel` pattern.
4. No new UI components. Composed entirely from existing primitives.
5. Accessible from a new **Feeds** link in the sidebar, placed directly under **Collections**.

---

## Non-Goals

- No editing of feed files in-app (read-only).
- No IndexedDB persistence.
- No sub-folder organization per feed (MVP: single `feeds/` folder).

---

## Naming Convention

Files in `markdown/feeds/` follow:

```
{YYYY-MM-DD}-{HHMM}-{feed-name}.md
```

| Segment | Role |
|---|---|
| `YYYY-MM-DD` | Date — used for `JournalDateScroll` grouping |
| `HHMM` | Time — displayed in the list row entry |
| `feed-name` | Channel identity — used for sidebar chip filtering and the detail route |

Examples:
```
2026-04-30-08:30-movement-standards.md
2026-03-15-12:00-movement-standards.md
2026-04-28-09:00-benchmark-workouts.md
2026-04-20-14:30-benchmark-workouts.md
```

The two `movement-standards` entries appear in the chronological list and can be filtered to exclusively by selecting the `movement-standards` chip. The two `benchmark-workouts` entries form a separate channel.

---

## Routes

| Path | Component | Description |
|---|---|---|
| `/feeds` | `FeedsListPage` | Scrollable date-grouped list, filterable by feed-name |
| `/feeds/{YYYY-MM-DD}-{HHMM}-{feed-name}` | `FeedNotePage` | Read-only canvas for one entry |

The full filename stem (minus `.md`) is used as the route param — it is globally unique by construction.

---

## Data Flow

```
markdown/feeds/*.md
    ↓ import.meta.glob (eager, raw)
    ↓ parseFeedFiles() — extracts date, time, feed-name, content
    ↓ FeedsListPage
        ├── FeedsNavPanel (sidebar) — feed-name chip toggles (URL query state)
        └── JournalDateScroll — filtered FeedItem[] grouped by date
    ↓ /feeds/:id → FeedNotePage (MarkdownCanvasPage, read-only)
```

---

## Navigation

- New **Feeds** `NavItem` (L1, `NewspaperIcon`) added to `appNavTree.ts` after Collections.
- `isActive` matches `/feeds` and `/feeds/*`.
- L2 panel: `FeedsNavPanel` — feed-name chip toggles (visible only on `/feeds` list page, hidden on entry pages — same guard used in `CollectionsNavPanel`).

---

## Sidebar Panel: FeedsNavPanel

The panel mirrors `CollectionsNavPanel` exactly, with feed-names in place of categories:

- Feed-names are derived at runtime from the parsed `FeedItem[]` (not hardcoded).
- Selecting chips writes to a `feeds` URL query param via `useFeedsQueryState()` hook (parallel to `useCollectionsQueryState()`).
- Multi-select: multiple feed-names can be active simultaneously.
- Clear button appears when any chips are selected.
- Panel hides itself on `/feeds/:id` entry pages.

---

## List View Filtering

`FeedsListPage` passes a filtered subset of `FeedItem[]` to `JournalDateScroll`:

```
selectedFeeds.length === 0  →  show all entries
selectedFeeds.length > 0    →  show entries where item.feedName ∈ selectedFeeds
```

The calendar strip continues to show all dates regardless of filter (consistent with journal behavior).

---

## Acceptance Criteria

- [ ] `markdown/feeds/` folder exists with sample files from at least two distinct feed-names.
- [ ] `parseFeedFiles()` correctly extracts `{ date, time, feedName, id, content }` from valid filenames; ignores invalid ones.
- [ ] `/feeds` renders a date-grouped scroll list via `JournalDateScroll`.
- [ ] The sidebar panel shows feed-name chips; selecting one filters the list.
- [ ] Clicking an entry navigates to `/feeds/:id`.
- [ ] `/feeds/:id` renders the markdown via `MarkdownCanvasPage` (read-only).
- [ ] Feeds nav item appears in sidebar after Collections.
- [ ] Panel is hidden on `/feeds/:id` entry pages.
- [ ] No new reusable UI components created.

---

## Out of Scope (Future)

- Sub-folder organization (`markdown/feeds/articles/`, `markdown/feeds/wods/`)
- In-app feed-name display names (currently title-cased from the filename)
- Calendar filter in the sidebar panel (journal has it; feeds can add later)
- External feed import (RSS / HTTP)
- Search within feeds
