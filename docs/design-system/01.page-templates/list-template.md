# Template: List

**Component:** `ListTemplate` (Template)
**Atomic Level:** Template — queryable list lifecycle + merged data shell
**Status:** Design Draft
**Parent Template:** [AppTemplate](../00.layout-template/app-template.md)
**Last Updated:** 2026-04-30

---

## Overview

`ListTemplate` is the page-type shell for browsing, filtering, and selecting from large data sets. It owns the query state (text filter, date range, tag filter), loads data from the merged data source (Collections, Playground, Journal), and exposes a typed `ListContext` to child pages. The sticky query organism + virtualized filtered list are the defining UI affordances.

This template sits between `AppTemplate` (layout panels) and individual list pages (e.g. `CollectionsPage`, search, journal feed) that configure the query organism and item renderers.

---

## Pages Using This Template

| Page | Route | Current File |
|------|-------|------|
| Collections index | `/collections` | `playground/src/views/CollectionsPage.tsx` |
| Journal feed | `/journal` | `playground/src/views/ListViews.tsx → JournalWeeklyPage` |
| Search | `/search` | TBD |

---

## Routing & URL State

All filter state is URL-encoded so filters survive refresh and can be shared.

| Param | nuqs type | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?q=` | `string` | `replace` | Text search / filter query |
| `?d=` | `string` (YYYY-MM-DD) | `replace` | Selected date (journal feed) |
| `?month=` | `string` (YYYY-MM) | `replace` | Active month in calendar mini-nav |
| `?tags=` | `string[]` | `replace` | Active tag filters |

By convention all params use `history: 'replace'` — filter changes do not push new browser history entries.

### Hook: `useListQueryState`

Wraps all nuqs params into a single hook consumed by the template:

```ts
interface ListQueryState {
  query: string
  setQuery: (q: string) => void
  selectedDate: string | null
  setDateParam: (d: string) => void
  selectedTags: string[]
  setTagsParam: (tags: string[]) => void
}
```

---

## Data Loading

The template loads from a merged data source that combines three backends. Loading is triggered on mount and re-runs when query state changes.

### Merged Data Source

| Source | Backend | Read mode |
|--------|---------|-----------|
| Collections | Static markdown (`markdown/collections/`) | Read-only, bundled |
| Playground notes | IndexedDB (`playgroundDB`) | Read-write |
| Journal entries + results | IndexedDB (`indexedDBService`) | Read-write |

### Typed Output: `ListContext`

```ts
interface ListContext {
  // Query state
  queryState: ListQueryState

  // Derived query object (computed, not in URL)
  queryObject: QueryObject

  // Loaded data
  items: FilteredListItem[]        // merged, sorted, filtered
  isLoading: boolean
  error: string | null

  // Measurements
  queryHeight: number              // sticky organism height for scroll layout

  // Actions (event hub)
  onSelectItem: (item: FilteredListItem) => void
  onCreateItem: (type: 'note' | 'workout') => void
  onDeleteItem: (id: string) => void
}
```

### `FilteredListItem` Discriminated Union

```ts
type FilteredListItem =
  | { type: 'note';    id: string; payload: NoteItem }
  | { type: 'workout'; id: string; payload: WorkoutBlock }
  | { type: 'result';  id: string; payload: WorkoutResult }
```

---

## Event Hub

The template defines a stable set of list-level events. Inheriting pages override these to customize navigation and side-effects.

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onSelectItem(item)` | Routes based on item type: note → `/note/…`, result → `/review/…` | Open item in right panel instead of navigating |
| `onCreateItem(type)` | Creates new note/workout in IndexedDB → navigates to it | Pre-fill from a template or show a creation dialog |
| `onDeleteItem(id)` | Soft-deletes from IndexedDB → removes from list | Show confirmation dialog |
| `onQueryChange(q)` | Updates `?q=` URL param | Debounce or normalize input |

---

## AppTemplate Slot Assignments

| AppTemplate Panel | Default Content | Provided By |
|-------------------|-----------------|-------------|
| `leftPanel` | Section / category navigation | Template — `ListCategoryNav` |
| `contentPanel` | Sticky query organism + filtered list | Template shell |
| `rightPanel` | Item detail preview (when item selected) | Template — lazy-loaded detail panel |
| `contentHeader` | Page title + new-item button | Template — `ListHeader` |

The template injects defaults via `usePageLayout`. Individual pages can override any slot.

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| URL state (`?q=`, `?d=`, `?tags=`) | ✅ | — |
| Merged data load + filtering | ✅ | — |
| Default slot injection into AppLayoutContext | ✅ | — |
| Query organism component | ❌ | `queryOrganism: ReactNode` (e.g. `TextFilterStrip`, `FuzzySearchQuery`) |
| Item renderer per type | ❌ | `renderItem: (item: FilteredListItem) => ReactNode` |
| Empty-state content | ❌ | `emptyState?: ReactNode` |
| Data sources to include | Configurable | `sources?: ('collections' \| 'playground' \| 'journal')[]` — defaults to all three |
| Custom right-panel detail | Optional override | `rightPanel?: ReactNode` |

---

## Layout Structure

```
AppTemplate
├── leftPanel     → [ListCategoryNav] section / tag tree
├── contentHeader → [ListHeader]  page title + new item button
└── contentPanel
      ├── [QueryOrganism — sticky]   ← provided by page (TextFilterStrip / etc.)
      │     emits QueryObject downward
      └── [FilteredList — scrollable]
            ├── [Item: Note]         ← rendered by page's renderItem()
            ├── [Item: WorkoutBlock]
            └── [Item: Result]
```
