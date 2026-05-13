# Template: Calendar

**Component:** `CalendarTemplate` (Template)
**Atomic Level:** Template — date-navigation lifecycle + journal data shell
**Status:** Design Draft — implementation tracked in [WOD-261](/WOD/issues/WOD-261)
**Parent Template:** [AppTemplate](../00.layout-template/app-template.md)
**Last Updated:** 2026-04-30

---

## Overview

`CalendarTemplate` is the page-type shell for date-navigated content. It owns the calendar state (selected date, active month), loads journal entries and workout results keyed to those dates, and exposes a typed `CalendarContext` to child pages. The scrollable timeline / date-strip is the defining UI affordance.

This template sits between `AppTemplate` (layout panels) and the individual calendar pages (e.g. `JournalWeeklyPage`, `FeedPage`) that configure what is rendered per date cell.

---

## Pages Using This Template

| Page | Route | Current File |
|------|-------|------|
| Journal Weekly | `/journal` | `playground/src/views/ListViews.tsx → JournalWeeklyPage` |
| Feed (planned) | `/feed` | TBD |

---

## Routing & URL State

All calendar state is URL-encoded so date selections survive refresh and can be shared as links.

| Param | nuqs type | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?d=` | `string` (YYYY-MM-DD) | `replace` | Currently-selected / visible date. Written continuously as the user scrolls the timeline; read once on mount to restore scroll position. |
| `?month=` | `string` (YYYY-MM) | `replace` | Active month shown in the calendar mini-navigator (left panel). Optional — derived from `?d=` when absent. |
| `?tags=` | `string[]` | `replace` | Active tag filters. Applied to both journal entries and results. |

### Hook: `useCalendarQueryState`

Wraps all nuqs params into a single hook consumed by the template:

```ts
interface CalendarQueryState {
  selectedDate: string | null        // YYYY-MM-DD
  setDateParam: (d: string) => void
  activeMonth: string | null         // YYYY-MM
  setMonthParam: (m: string) => void
  selectedTags: string[]
  setTagsParam: (tags: string[]) => void
}
```

---

## Data Loading

The template loads two datasets keyed to the active date range (visible week ± buffer):

| Dataset | Source | Hook / Service |
|---------|--------|---------------|
| Journal entries (notes) | IndexedDB (`playgroundDB`) | `playgroundDB.getPagesByCategory('journal')` |
| Workout results | IndexedDB (`indexedDBService`) | `indexedDBService.getRecentResults()` |

Both datasets are loaded on mount and refreshed when the user navigates to a new month. Individual date cells receive pre-bucketed data; no per-cell fetch is needed.

### Typed Output: `CalendarContext`

```ts
interface CalendarContext {
  // Query state
  selectedDate: string | null
  activeMonth: string | null
  selectedTags: string[]

  // Data
  journalEntries: Map<string, JournalEntrySummary>   // date-key → entry summary
  results: WorkoutResult[]                           // all results in loaded range

  // Actions (event hub)
  onSelectDate: (dateKey: string) => void
  onOpenEntry: (dateKey: string) => void
  onCreateEntry: (date: Date) => void
  onSelectResult: (resultId: string) => void
}
```

---

## Event Hub

The template defines a stable set of calendar-level events. Inheriting pages override these handlers to customize navigation and side-effects.

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onSelectDate(dateKey)` | Updates `?d=` URL param; scrolls timeline to date | Highlight a date in a custom date picker |
| `onOpenEntry(dateKey)` | `navigate('/journal/:dateKey')` | Open entry in a side panel instead of navigating |
| `onCreateEntry(date)` | Creates new IndexedDB entry → `navigate('/journal/:dateKey')` | Prompt for entry type before creating |
| `onSelectResult(resultId)` | `navigate('/review/:resultId')` | Show inline result preview |
| `onVisibleDateChange(dateKey)` | Writes `?d=` param (IO callback, not user intent) | Track analytics or sync external calendar |

---

## AppTemplate Slot Assignments

| AppTemplate Panel | Default Content | Provided By |
|-------------------|-----------------|-------------|
| `leftPanel` | Monthly mini-calendar navigator | Template — `CalendarMiniNav` |
| `contentPanel` | Scrollable weekly timeline + date cells | Template shell, cell content by page |
| `rightPanel` | Tag filter panel | Template — `TagFilterPanel` |
| `contentHeader` | Month/year heading + today button | Template — `CalendarHeader` |

The template injects defaults into `AppLayoutContext`. Individual pages can override any slot by calling `usePageLayout({ leftPanel: <custom />, … })` after the template mounts.

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| URL state (`?d=`, `?month=`, `?tags=`) | ✅ | — |
| Journal entries load | ✅ | — |
| Results load | ✅ | — |
| Default slot injection into AppLayoutContext | ✅ | — |
| Date cell rendering | ❌ | `renderDateCell: (dateKey, data) => ReactNode` |
| Empty-state content | ❌ | `emptyState?: ReactNode` |
| Entry creation destination | Configurable via `onCreateEntry` | Override handler or leave default |
| Custom left panel content | Optional override | `leftPanel?: ReactNode` |

---

## Layout Structure

```
AppTemplate
├── leftPanel     → [CalendarMiniNav] month grid, highlights days with data
├── contentHeader → [CalendarHeader]  "April 2026" + Today button
└── contentPanel
      └── [WeeklyTimeline] — horizontal scroll or vertical date strips
            ├── [DateCell: 2026-04-28]  journalEntries['2026-04-28'], results[…]
            ├── [DateCell: 2026-04-29]  …
            ├── [DateCell: 2026-04-30]  ← today
            └── …
```
