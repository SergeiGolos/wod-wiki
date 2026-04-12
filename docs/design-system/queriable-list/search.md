# Route: `/search`

| | |
|--|--|
| **Route Pattern** | `/search` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | **Text Filter Strip** (`TextFilterStrip` as `CanvasPage` subheader) |
| **Component** | `SearchPage` (`playground/src/views/ListViews.tsx`) |
| **Shell** | `CanvasPage` (title-bar mode, `TextFilterStrip` as subheader, `autoFocus`) |

## Description

A dedicated page for global discovery across the entire WodScript ecosystem. Provides a permanent, URL-shareable interface for searching collections, personal notes, and historical results.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Collections + Playground + Journal from IndexedDB). |
| **Query Organism** | `TextFilterStrip` — mounted as the `CanvasPage` subheader with `autoFocus`. Writes `?q=` on every keystroke via `nuqs`. |
| **Filtered List** | `FilteredList` rendered directly by `SearchPage`. Items include Notes and historical Results. |

> **Implementation note:** Like `JournalWeeklyPage`, `SearchPage` renders `FilteredList` directly without the `QueriableListView` wrapper. The query organism (`TextFilterStrip`) communicates via the `?q=` URL param, which `SearchPage` reads independently with `useQueryState`.

## State Management

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID. |
| `?q=` | `nuqs` via `TextFilterStrip` | default | The active search query string; updated on every keystroke. |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `results` | `any[]` | Recent results loaded from IndexedDB on mount. |

## Workflow

1. **Discovery**: User types into the sticky `TextFilterStrip` at the top of the page (auto-focused on arrival).
2. **Filter**: `SearchPage` reads `?q=` and filters the merged list in real time — no server round-trip.
3. **Selection**: Clicking a result row navigates to the workout editor (`onSelect`) or the review page (`/review/:id`).
