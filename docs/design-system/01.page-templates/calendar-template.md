|            |                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **Name**   | Queriable List                                                                                                      |
| **Code**   | `playground/src/views/queriable-list/QueriableListView.tsx`, `playground/src/views/queriable-list/FilteredList.tsx` |
| **Routes** | `/journal`, `/search`, `/collections`                                                                               |

## Description

A dynamic, high-performance template designed for exploring large datasets through a unified query interface. It decouples query generation from list rendering, allowing for flexible filtering across multiple data sources.

## Core Organisms

### 1. Query Organism (Interface)
A sticky, top-aligned organism responsible for generating a structured `QueryObject`. Multiple specialized components can implement this interface.

| Implementation | Purpose | UI Pattern | Component |
|----------------|---------|------------|-----------|
| **Text Filter** | URL-aware text search bar, usable as a `CanvasPage` subheader. | Single-line input with clear button. | `TextFilterStrip` |
| **Fuzzy Search** | Inline query organism for collection sub-lists. | Real-time input inside the list container. | `FuzzySearchQuery` |

**Requirements**:
- **Sticky Position**: Must remain fixed at the top of the viewport during scrolling.
- **Query Output**: Emits a `QueryObject` containing terms, date ranges, and type filters.

### 2. Filtered List Organism
Consumes the `QueryObject` and applies it to the Merged Data Source to render a sorted, virtualized list of items.

**Requirements**:
- **Consolidated Querying**: Resolves the `QueryObject` against the unified backend.
- **Dynamic Rendering**: Switches between data-specific layouts based on the result type.

## Data Integration

### Merged Data Source
The template queries a unified provider that merges three distinct sources:
1.  **Collections**: Static markdown library (read-only).
2.  **Playground**: Ephemeral user notes (IndexedDB).
3.  **Journal Entries**: Persisted workout logs and notes (IndexedDB).

### Structured Data Types
The list renders three distinct types of data, each with its own specialized layout:

| Data Type | Attributes Displayed | Visual Pattern |
|-----------|----------------------|----------------|
| **Note** | Title, excerpt, tags, last updated. | Standard card with text preview. |
| **Workout Block** | Movement count, estimated duration, protocol (AMRAP/EMOM). | Pill-heavy layout with protocol icons. |
| **Result** | Performance metrics (reps/load), completion status, date/time. | Metric-focused row with sparklines/graphs. |

## State Management

Queriable List pages use **URL query params as the primary filter state** so filters survive page refresh and can be shared as links. Most params use `history: 'replace'` — filter changes do not create browser history entries.

### URL State patterns (nuqs, `history: 'replace'` by convention)

Query params vary per implementation — see individual page docs for exact param names.

| Pattern | Param | Type | Used by |
|---------|-------|------|---------|
| Text filter | `?q=` | `string` | Search, Collections index |
| Selected date | `?d=` | `YYYY-MM-DD` | Journal weekly view |
| Active month | `?month=` | `YYYY-MM` | Journal nav calendar |
| Tag filters | `?tags=` | comma-separated | Journal |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `query` | `QueryObject` | Derived query object passed from the Query Organism to the Filtered List. Not in the URL — computed from URL params. |
| `queryHeight` | `number` | Height of the sticky query organism used for scroll layout calculations (used by `QueriableListView`). |

## Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [Query Organism (Sticky Top)]                            │
│ (TextFilterStrip / FuzzySearchQuery / WeekCalendarStrip) │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Filtered List Organism]                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [Item: Note]                                       │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ [Item: Workout Block]                              │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ [Item: Result]                                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
