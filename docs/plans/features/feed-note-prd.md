# PRD: FeedNote — Date-Stamped Markdown Feed View

**Status**: Proposed  
**Author**: Guppi  
**Date**: 2026-04-30

---

## Overview

FeedNote is a new first-class note subtype that surfaces a folder of date-stamped markdown files as a scrollable, date-grouped feed — combining the scrolling list UX of the Journal with the read-only canvas rendering of a Collection note.

---

## Problem

Users want to maintain a folder of curated or imported markdown files (articles, notes, logs, references) and browse them in chronological order inside wod-wiki — without building a custom editor UI or requiring IndexedDB persistence. The current note subtypes don't cover this:

| Subtype | Persisted | List View | Read-Only Canvas |
|---|---|---|---|
| PlaygroundNote | IndexedDB | ✗ | ✗ |
| JournalNote | IndexedDB | ✓ (date scroll) | ✗ |
| CollectionNote | Bundled `.md` | ✗ | ✓ |
| **FeedNote** _(new)_ | Bundled `.md` | ✓ (date scroll) | ✓ |

---

## Goals

1. Render a `markdown/feeds/` folder as a chronological, scrollable list view — reusing `JournalDateScroll` (the same component used by the Journal list).
2. Clicking an entry opens a read-only canvas view — reusing `MarkdownCanvasPage` (the same renderer used for Collections).
3. No new UI components required. Composed entirely from existing primitives.
4. Accessible from a new **Feeds** link in the sidebar, placed directly under **Collections**.
5. FeedNote is a named subtype (`category: 'feeds'`) parallel to `playground`, `journal`, and `collections`.

---

## Non-Goals

- No editing of feed files inside the app (read-only).
- No IndexedDB persistence (files are bundled, not user-created).
- No separate folder-per-feed navigation (MVP: single `feeds/` folder; grouping is future work).

---

## Naming Convention

Files in `markdown/feeds/` must follow the pattern:

```
YYYY-MM-DD-HHMM-{slug}.md
```

Examples:
```
2026-04-30-0830-movement-standards.md
2026-03-15-1200-benchmark-workouts.md
```

The date-time prefix is parsed to provide the `JournalDateScroll` grouping key (`YYYY-MM-DD`). The slug becomes the display title (formatted: `movement-standards` → `Movement Standards`).

---

## User Stories

1. **Browse feed** — As a user, I open Feeds from the sidebar and see all feed entries grouped by date, scrolling chronologically just like the Journal.
2. **Read an entry** — As a user, I click an entry and see it rendered as a read-only canvas (markdown, wod blocks displayed but not editable).
3. **Scroll through dates** — As a user, I can use the calendar strip (same as Journal) to jump to a specific date in the feed.

---

## Data Flow

```
markdown/feeds/*.md
    ↓ import.meta.glob (eager, raw)
    ↓ parseFeedFiles() — extracts date, time, slug, content
    ↓ FeedsListPage (JournalDateScroll with feed entries)
    ↓ /feeds/:slug → FeedNotePage (MarkdownCanvasPage, read-only)
```

---

## Routes

| Path | Component | Description |
|---|---|---|
| `/feeds` | `FeedsListPage` | Scrollable date-grouped list |
| `/feeds/:slug` | `FeedNotePage` | Read-only canvas for one entry |

---

## Navigation

- A new **Feeds** `NavItem` (L1, `NewspaperIcon`) is added to `appNavTree.ts` immediately after Collections.
- `isActive` matches `/feeds` and `/feeds/*`.
- No new L2 panel needed for MVP (no filter requirements).

---

## Acceptance Criteria

- [ ] `markdown/feeds/` folder is scanned; files matching `YYYY-MM-DD-HHMM-{slug}.md` are parsed.
- [ ] `/feeds` renders entries grouped by date using `JournalDateScroll`.
- [ ] Clicking an entry navigates to `/feeds/:slug`.
- [ ] `/feeds/:slug` renders the markdown file via `MarkdownCanvasPage` (read-only, no editor).
- [ ] Feeds link appears in the sidebar under Collections.
- [ ] Files without a valid date prefix are silently skipped.
- [ ] No new reusable UI components are created — only new page/view files that compose existing components.

---

## Out of Scope (Future)

- Multiple named feeds (sub-folders like `markdown/feeds/articles/`)
- Search / filter strip on the Feeds list
- Feed entry tagging or metadata
- External feed import (RSS, etc.)
