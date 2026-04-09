# Template: Queriable List

| | |
|--|--|
| **Name** | Queriable List |
| **Code** | `src/components/workbench/queriable-list/QueriableList.tsx` (Target), `src/app/pages/NotebooksPage.tsx`, `src/app/pages/CollectionsPage.tsx` |
| **Routes** | `/notebooks`, `/collections` |

## Description

A dynamic, high-performance template designed for exploring large datasets through a unified query interface. It decouples query generation from list rendering, allowing for flexible filtering across multiple data sources.

## Core Organisms

### 1. Query Organism (Interface)
A sticky, top-aligned organism responsible for generating a structured `QueryObject`. Multiple specialized components can implement this interface.

| Implementation | Purpose | UI Pattern |
|----------------|---------|------------|
| **Fuzzy Search** | Global text-based discovery. | Real-time input with suggestion dropdown. |
| **Month Calendar** | Date-based journal browsing. | 7-column grid with activity indicators. |
| **Week Planner** | Short-term training planning. | 7-day horizontal strip with daily workout summaries. |

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

## Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [Query Organism (Sticky Top)]                            │
│ (Fuzzy Input / Calendar / Week Planner)                  │
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
