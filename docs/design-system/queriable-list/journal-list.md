# Route: `/journal` (Date Scroll View)

| | |
|--|--|
| **Route Pattern** | `/journal` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | None (journal nav panel drives date/tag state via URL) |
| **Component** | `JournalWeeklyPage` → `JournalDateScroll` (`playground/src/views/ListViews.tsx`, `playground/src/views/queriable-list/JournalDateScroll.tsx`) |
| **Shell** | `CanvasPage` (title-bar mode, no subheader) |

## Description

An infinite-scroll, date-centric view of all training activity. Dates are shown in **ascending order** (oldest at top, newest toward bottom). Today is centered in the viewport on initial load. Scrolling **up** travels into past dates; scrolling **down** moves into future dates. Each date has an inline "Add note" prompt for today and future days. This is distinct from the `/journal/:id` route, which is a per-entry editor workspace.

## Date Layout

```
↑  past  ↑
─────────────
  2026-04-01
  2026-04-02
  ...
  2026-04-13  ← today (centered on load)
  2026-04-14
  ...
─────────────
↓  future  ↓
```

The visible window is initially ±14 days around the target date (today or `?d=`). Sentinels at the top and bottom extend the window by 7 days at a time as the user approaches either edge.

## Infinite Scroll

`JournalDateScroll` uses two `IntersectionObserver` sentinels (window viewport, `root: null`):

| Sentinel | Location | Action | Compensation |
|----------|----------|--------|--------------|
| Top | Before first date group | Prepend 7 past days | `window.scrollBy` (instant) using anchor-element delta to keep viewport stable |
| Bottom | After last date group | Append 7 future days | None needed (DOM grows below viewport) |

Both sentinels use a 600 px `rootMargin` to load eagerly before the user hits the edge.

> **Why `root: null`:** `CanvasPage` renders `div.min-h-screen` so no inner container ever clips — the **window** is the scroller. All IO observers, scroll APIs (`scrollBy`, `scrollTo`, `scrollend`), and position calculations must target `window`/`document`, not a container ref.

## Scroll Suppression

All programmatic scrolls (mount centering, calendar navigation, off-window jumps) set `suppressReportRef = true` to prevent:

1. **Visible-date IO** from reporting mid-animation dates back to the URL (which would trigger another scroll in `ListViews`).
2. **Sentinel observers** from triggering prepend/append during navigation (prepend compensation would fight the in-flight scroll with an instant `scrollBy`).

Suppression is released by the native `scrollend` event (Chrome 114+, FF 109+, Safari 16.4+). A `scrollY`-stability poll (100 ms intervals, 2 stable polls) acts as a fallback for older browsers and replaces the old fixed 1 s timeout, which was too short for long smooth scrolls.

After suppression releases, both sentinel observers are **force-reconnected** (`unobserve` + `observe`) so that if a sentinel is still within the preload margin, IO re-fires immediately rather than stalling until the user scrolls again.

## Calendar Navigation

When the user clicks a date in the journal nav panel calendar, `scrollToDate(date)` is called on the imperative handle:

- **Date is in current window** → smooth scroll to the date group (top-aligned below sticky header).
- **Date is outside current window** → window is rebuilt as ±14 days around the target, then an **instant** scroll aligns to the target. Smooth scroll is intentionally avoided here because the DOM has been fully replaced.

The `lastIODateRef` guard in `JournalWeeklyPage` distinguishes IO-driven `selectedDate` changes (user is scrolling → don't re-scroll) from user-intent navigation (calendar click → do scroll). It is seeded with the initial `selectedDate` so that the first render does not trigger a redundant scroll competing with the mount centering.

## "Add Note" Ghost Row

Each date group whose key is ≥ today shows a dashed "Add note" button at the bottom of the group. Past dates show no creation prompt since historical entries have already been created.

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
| `dateWindow` | `{ start, end }` state | The current loaded date range inside `JournalDateScroll`. Grows as sentinels fire. |
| `suppressReportRef` | `ref<boolean>` | True during any programmatic scroll. Suppresses both visible-date IO reports and sentinel loading. |
| `mountScrollDoneRef` | `ref<boolean>` | False until the initial center scroll completes. Prevents sentinels from firing before the user has had a chance to orient. |

## Workflow

1. **Load**: Page opens with today (or `?d=` target) centered in the viewport. ±14 days of dates are rendered.
2. **Browse past**: Scroll up → history dates appear, top sentinel prepends more with invisible scroll compensation.
3. **Browse future**: Scroll down → future dates appear, bottom sentinel appends more.
4. **Navigate**: Click a calendar date → smooth (in-window) or instant (out-of-window) scroll to that date.
5. **Create**: Tap "Add note for …" on any today-or-future date group to start a new entry.
6. **Review**: Tap any historical item to open the workout editor or results review.
