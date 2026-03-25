# Route: `/journal` (Weekly View)

| | |
|--|--|
| **Route Pattern** | `/journal` |
| **Template** | [Queriable List](../templates/queriable-list.md) |
| **Query Organism** | **Week Planner** |

## Description

A focused, tactical view of a single training week. It provides a "horizon" view of recent performance and upcoming sessions. This is distinct from the `/journal/:id` route, which is a detail workspace.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Playground + Journal). |
| **Query Organism** | `WeekPlannerQueryOrganism` (7-day horizontal strip). |
| **Default Query** | Current week, with today as the 6th day in the sequence. |

## Query Parameters (`nuqs`)

- `d`: (YYYY-MM-DD) The reference date for the week. This date is treated as the **second to last day** (Day 6) in the 7-day view.

## Week Planner Logic

The planner displays a fixed 7-day window relative to the date `d`:
- **Window**: `[d - 4 days]` to `[d + 1 day]`.
- **Highlighting**: Weekends are visually distinguished (e.g., subtle background tint or border).
- **List Scope**: The Filtered List is strictly limited to entries within these 7 days.

## Workflow

1.  **Focus**: The user sees exactly one week of activity at a glance.
2.  **Navigate**: Clicking a day in the planner updates the `d` parameter to shift the window.
3.  **Track**: Provides a quick way to launch into "Today's" workout or review "Yesterday's" results.
