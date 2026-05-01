# Page: Journal Calendar

**Route:** `/journal`
**Template:** [CalendarTemplate](../01.page-templates/calendar-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/views/ListViews.tsx → JournalWeeklyPage`

---

## Overview

The Journal Calendar is the primary entry point for the journal section. It presents a scrollable weekly timeline of dates. Each date cell shows the journal note title (if one exists) and any workout results logged that day. Users click a cell to open the journal note for that date, or click an empty cell to create a new entry.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/journal` |
| Path params | none |
| `?d=` (nuqs) | Selected / visible date (YYYY-MM-DD). Written on scroll via IO; read on mount to restore position. `history: 'replace'` |
| `?tags=` (nuqs) | Comma-separated tag filters. `history: 'replace'` |

---

## Template Overrides

| CalendarTemplate behaviour | Journal Calendar override |
|---------------------------|--------------------------|
| `leftPanel` | Calendar mini-nav (mini month grid with dots for days that have entries) |
| `contentPanel` | `JournalDateScroll` — vertically scrolling date strip |
| Date cell renderer | `JournalDateCell` — shows entry title + result count badges |
| `onOpenEntry(dateKey)` | `navigate('/journal/:dateKey')` |
| `onCreateEntry(date)` | Creates new journal entry in IndexedDB → `navigate('/journal/:dateKey')` |
| `onSelectResult(resultId)` | `navigate('/review/:resultId')` |
| `onVisibleDateChange` | Updates `?d=` URL param |

---

## Unique Behaviours

### Scroll Seeding
On mount the timeline always positions at **today** — not at the `?d=` URL param. The `?d=` param is only used for restoring scroll after a browser back/forward navigation (not on initial load). User-intent scrolls (calendar clicks) drive the timeline after mount.

### IntersectionObserver IO Callbacks
`JournalDateScroll` uses an IntersectionObserver to detect the most-visible date in the viewport and writes it to `?d=`. This is a read-write operation with no user intent — it does not push history entries.

### No Overlap with CalendarTemplate Date Picker
The mini-nav in `leftPanel` is a click-to-scroll widget, not a date input. Clicking a date calls `scrollRef.current?.scrollToDate(dateKey)` — it does not navigate.

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Monthly mini-calendar with entry indicators |
| `contentHeader` | "Journal" heading + new entry button |
| `contentPanel` | `JournalDateScroll` — vertical scrollable timeline |
| `rightPanel` | Tag filter panel (planned) |

---

## Data

| Dataset | Source | Loads when |
|---------|--------|-----------|
| Journal entries | `playgroundDB.getPagesByCategory('journal')` | On mount |
| Workout results | `indexedDBService.getRecentResults(100)` | On mount |

Both datasets are loaded once and held in component state. No per-date lazy loading.

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Tap date cell with entry | `/journal/:dateKey` |
| Tap empty date cell | Creates entry → `/journal/:dateKey` |
| Tap result badge | `/review/:resultId` |
