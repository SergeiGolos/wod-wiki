# Route: `/calendar`

| | |
|--|--|
| **Route Pattern** | `/calendar` |
| **Template** | [Queriable List](../templates/queriable-list.md) |
| **Query Organism** | **Month Calendar** |

## Description

A high-level overview of training history and planned sessions organized by month. This is the primary entry point for date-driven exploration of the WodScript database.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Merged source (Collections + Playground + Journal). |
| **Query Organism** | `CalendarQueryOrganism` (Month View). |
| **Default Query** | Current month based on system clock. |

## Query Parameters (`nuqs`)

- `month`: (YYYY-MM) The month currently being displayed in the calendar.
- `start`: (YYYY-MM-DD) Optional start boundary for the query.
- `end`: (YYYY-MM-DD) Optional end boundary for the query.
- `type`: (`note` | `block` | `result`) Filters the list to specific data types.

## Workflow

1.  **Navigate**: User clicks "Calendar" in the sidebar or follows a link.
2.  **Query**: The sticky Calendar organism allows switching months or selecting specific dates.
3.  **Browse**: The Filtered List displays items matching the selected month or date range, using specialized rendering for Notes and Results.
