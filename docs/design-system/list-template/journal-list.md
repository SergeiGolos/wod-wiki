# Route: `/journal` (Date Scroll View)

| | |
|--|--|
| **Route Pattern** | `/journal` |
| **Template** | [Queriable List](design-system/list-template/_template.md) |
| **Query Organism** | None (journal nav panel drives date/tag state via URL) |
| **Component** | `JournalWeeklyPage` → `JournalDateScroll` (`playground/src/views/ListViews.tsx`, `playground/src/views/queriable-list/JournalDateScroll.tsx`) |
| **Shell** | `CanvasPage` (title-bar mode, no subheader) |

## Description

An infinite-scroll, date-centric view of all training activity. Dates are shown in **descending order** (today at top, oldest at bottom). Today is at the top of the loaded page on initial load. Scrolling **down** travels into past dates. Scrolling **up** is bounded at today — no future dates are ever shown.

## Date Layout

```
↑  today (top of page)  ↑
─────────────
  2026-04-15  ← today (top on load)
  2026-04-14
  2026-04-13
  ...
  2026-04-01
─────────────
↓  older history  ↓
```

The visible window is initially ±14 days before the target date (today or `?d=`). The bottom sentinel extends the window by 7 past days at a time as the user scrolls toward older history.

## Infinite Scroll

`JournalDateScroll` uses two `IntersectionObserver` sentinels (window viewport, `root: null`):

| Sentinel | Location | Action | Compensation |
|----------|----------|--------|--------------|
| Top | Before first date group (today) | Extend window end toward today (capped) | None needed |
| Bottom | After last date group (oldest) | Prepend 7 past days | None needed (DOM grows below viewport) |

Both sentinels use a 600 px `rootMargin` to load eagerly before the user hits the edge.

> **Why `root: null`:** `CanvasPage` renders `div.min-h-screen` so no inner container ever clips — the **window** is the scroller. All IO observers, scroll APIs (`scrollBy`, `scrollTo`, `scrollend`), and position calculations must target `window`/`document`, not a container ref.

## Scroll Suppression

All programmatic scrolls (mount alignment, calendar navigation, off-window jumps) set `suppressReportRef = true` to prevent:

1. **Visible-date IO** from reporting mid-animation dates back to the URL (which would trigger another scroll in `ListViews`).
2. **Sentinel observers** from triggering extend during navigation.

Suppression is released by the native `scrollend` event (Chrome 114+, FF 109+, Safari 16.4+). A `scrollY`-stability poll (100 ms intervals, 2 stable polls) acts as a fallback for older browsers and replaces the old fixed 1 s timeout, which was too short for long smooth scrolls.

After suppression releases, both sentinel observers are **force-reconnected** (`unobserve` + `observe`) so that if a sentinel is still within the preload margin, IO re-fires immediately rather than stalling until the user scrolls again.

## Calendar Navigation

When the user clicks a date in the journal nav panel calendar, `scrollToDate(date)` is called on the imperative handle:

- **Date is in current window** → smooth scroll to the date group (top-aligned below sticky header).
- **Date is outside current window** → window is rebuilt as ±14 days around the target (capped at today for the end), then an **instant** scroll aligns to the target. Smooth scroll is intentionally avoided here because the DOM has been fully replaced.

The `lastIODateRef` guard in `JournalWeeklyPage` distinguishes IO-driven `selectedDate` changes (user is scrolling → don't re-scroll) from user-intent navigation (calendar click → do scroll). It is seeded with the initial `selectedDate` so that the first render does not trigger a redundant scroll competing with the mount alignment.

## State Management

State is shared across `JournalWeeklyPage` and the journal nav panel via `useJournalQueryState`.

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?d=` | `nuqs` via `useJournalQueryState` | `replace` | Active date (`YYYY-MM-DD`). Updated by IO scroll tracking as the user scrolls. Used to set the initial window and to sync the nav calendar. |
| `?month=` | `nuqs` via `useJournalQueryState` | `replace` | Visible month in the nav calendar widget (`YYYY-MM`). Auto-derived from `?d=` when not set explicitly. |
| `?tags=` | `nuqs` via `useJournalQueryState` | `replace` | Active tag filters (comma-separated). Set by nav panel tag chips. |

### Local State (outside URL)

| State / Ref | Type | Purpose |
|-------------|------|---------|
| `results` | `any[]` | Recent results loaded from IndexedDB on mount. |
| `lastIODateRef` | `ref<string>` | Tracks the last date key reported by IO scroll tracking. Guards the `useEffect([selectedDate])` in `JournalWeeklyPage` so that IO-driven URL updates do not cause a re-scroll. Seeded from the initial `selectedDate` on mount. |
| `dateWindow` | `{ start, end }` state | The current loaded date range inside `JournalDateScroll`. `end` is always capped at today. Grows backward as the bottom sentinel fires. |
| `suppressReportRef` | `ref<boolean>` | True during any programmatic scroll. Suppresses both visible-date IO reports and sentinel loading. |
| `mountScrollDoneRef` | `ref<boolean>` | False until the initial mount scroll completes. Prevents sentinels from firing before the user has had a chance to orient. |

## Workflow

1. **Load**: Page opens with today at the top of the viewport. The initial window covers ~14 days of history.
2. **Browse past**: Scroll down → history dates appear, bottom sentinel appends more past days as needed.
3. **Browse recent**: Scroll up → moves toward today. Top sentinel extends the window toward today if a bounded past-date rebuild left a gap.
4. **Navigate**: Click a calendar date → smooth (in-window) or instant (out-of-window) scroll to that date.
5. **Create**: Use the "New Entry" toolbar button to start a new journal entry.
6. **Review**: Tap any historical item to open the workout editor or results review.
