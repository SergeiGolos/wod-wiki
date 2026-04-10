# Route: `/journal` (Weekly View)

| | |
|--|--|
| **Route Pattern** | `/journal` |
| **Template** | [Queriable List](_template.md) |
| **Query Organism** | **Week Planner** |

## Description

A focused, tactical view of a single training week. It provides a "horizon" view of recent performance and upcoming sessions. This is distinct from the `/journal/:id` route, which is a detail workspace.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Playground + Journal). |
| **Query Organism** | `WeekPlannerQueryOrganism` (7-day horizontal strip). |
| **Default Query** | Current week, with today as the 6th day in the sequence. |

## State Management

`/journal` (weekly view) is wrapped in `CanvasPage` (title-bar mode) with a `WeekCalendarStrip` as the sticky subheader. State is shared across the strip, the list, and the journal nav panel via the `useJournalQueryState` hook.

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID. |
| `?d=` | `nuqs` via `useJournalQueryState` | `replace` | Reference date for the 7-day window (`YYYY-MM-DD`). Clicking a day in `WeekCalendarStrip` updates this param; the list filters to that week. |
| `?month=` | `nuqs` via `useJournalQueryState` | `replace` | Visible month in the calendar widget (`YYYY-MM`). |
| `?tags=` | `nuqs` via `useJournalQueryState` | `replace` | Active tag filters (comma-separated). Shared with Calendar and Journal nav panel. |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `query` | `QueryObject` | Derived query computed from the URL params; not stored in the URL directly. |

## Week Planner Logic

The planner displays a fixed 7-day window relative to the date `d`:
- **Window**: `[d - 4 days]` to `[d + 1 day]`.
- **Highlighting**: Weekends are visually distinguished (e.g., subtle background tint or border).
- **List Scope**: The Filtered List is strictly limited to entries within these 7 days.

## Workflow

1.  **Focus**: The user sees exactly one week of activity at a glance.
2.  **Navigate**: Clicking a day in the planner updates the `d` parameter to shift the window.
3.  **Track**: Provides a quick way to launch into "Today's" workout or review "Yesterday's" results.
