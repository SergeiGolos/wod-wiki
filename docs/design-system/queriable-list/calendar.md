# Route: `/calendar`

| | |
|--|--|
| **Route Pattern** | `/calendar` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | **Month Calendar** |

## Description

A high-level overview of training history and planned sessions organized by month. This is the primary entry point for date-driven exploration of the WodScript database.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Collections + Playground + Journal). |
| **Query Organism** | `CalendarQueryOrganism` (Month View). |
| **Default Query** | Current month based on system clock. |

## State Management

`/calendar` is wrapped in `CanvasPage` (title-bar mode), which contributes `?s=` for TOC section tracking.

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID. |
| `?month=` | `nuqs` via `useQueryState('month')` | default | The month displayed in the calendar view (`YYYY-MM`). |
| `?d=` | `nuqs` via `useJournalQueryState` | `replace` | Selected date (`YYYY-MM-DD`); also drives the Journal nav panel. |
| `?tags=` | `nuqs` via `useJournalQueryState` | `replace` | Active tag filters (comma-separated). |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| CalendarQuery `start` / `end` | `Date` | Local date range while the user is picking; written to URL only on confirm. |

## Workflow

1.  **Navigate**: User clicks "Calendar" in the sidebar or follows a link.
2.  **Query**: The sticky Calendar organism allows switching months or selecting specific dates.
3.  **Browse**: The Filtered List displays items matching the selected month or date range, using specialized rendering for Notes and Results.
