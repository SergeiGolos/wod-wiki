# Route: `/journal` (Weekly View)

| | |
|--|--|
| **Route Pattern** | `/journal` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | None (journal nav panel drives date/tag state via URL) |
| **Component** | `JournalWeeklyPage` (`playground/src/views/ListViews.tsx`) |
| **Shell** | `CanvasPage` (title-bar mode, no subheader) |

## Description

A focused, tactical view of recent training activity and upcoming sessions, sorted by date descending. The page has no inline query organism — date and tag filtering is driven by the journal nav panel's calendar widget and tag chips. This is distinct from the `/journal/:id` route, which is a per-entry workspace.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Playground + Journal from IndexedDB). |
| **Query Organism** | None inline. Date/tag state comes from the journal nav panel via `useJournalQueryState`. |
| **Filtered List** | `FilteredList` rendered directly by `JournalWeeklyPage` (no `QueriableListView` wrapper). |

> **Implementation note:** `JournalWeeklyPage` renders `FilteredList` directly without the `QueriableListView` wrapper. The journal nav panel (calendar + tag chips) communicates with the list through the shared `useJournalQueryState` hook and URL params.

## State Management

State is shared across `JournalWeeklyPage` and the journal nav panel via the `useJournalQueryState` hook.

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID. |
| `?d=` | `nuqs` via `useJournalQueryState` | `replace` | Selected date (`YYYY-MM-DD`). Set by the journal nav calendar; drives scroll-to-date in `FilteredList`. Updated by scroll sync as user scrolls. |
| `?month=` | `nuqs` via `useJournalQueryState` | `replace` | Visible month in the journal nav calendar widget (`YYYY-MM`). |
| `?tags=` | `nuqs` via `useJournalQueryState` | `replace` | Active tag filters (comma-separated). Set by journal nav panel tag chips. |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `results` | `any[]` | Recent results loaded from IndexedDB on mount. |
| `isScrollUpdating` | `ref<boolean>` | Guard preventing scroll-driven date updates from conflicting with nav panel clicks. |

## Scroll Sync

As the user scrolls `FilteredList`, an `IntersectionObserver` fires `onVisibleDateChange`, which updates `?d=` via `setDateParam`. This keeps the journal nav panel calendar in sync with the user's scroll position.

## Workflow

1. **Focus**: The user sees all activity sorted by date descending, with tag filtering from the nav panel.
2. **Navigate**: Clicking a date in the journal nav calendar sets `?d=` and the list scrolls to that date group.
3. **Track**: Tap any list item to open the workout editor or review a completed session.
