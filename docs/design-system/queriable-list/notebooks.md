# Route: `/notebooks`

| | |
|--|--|
| **Route Pattern** | `/notebooks` |
| **Template** | [Queriable List](_template.md) |
| **Component** | `NotebooksPage` |

## Description

The personal "History" or "Journal" view for the user. It provides a powerful interface for organizing, filtering, and analyzing all tracked sessions and saved notes.

## Configuration (Queriable List Template)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Full user history from IndexedDB. |
| **Query Organism** | **Month Calendar** (Default) or **Fuzzy Search**. |
| **Filtered List** | Shows a consolidated list of **Notes** and **Results** (workouts with logs). |

## Query Parameters (`nuqs`)

The Notebooks route extensively uses deep-linked state via URL parameters:
- `month`: (YYYY-MM) Sets the active calendar month.
- `dates`: (comma-separated ISO) Sets a custom list of selected dates.
- `range`: (start,end ISO) Sets a continuous date range filter.
- `notebook`: (slug) Filters the list to a specific user-defined notebook.

## Workflow

1.  **Filter**: User selects a month or notebook from the sidebar.
2.  **Select**: One or more entries are selected in the center list.
3.  **Analyze/Preview**: The right panel updates to show a session summary or aggregate stats.
4.  **Action**: User can "Edit" a note (opening the [Note Workspace](../note-workspace/workout.md)) or view a full "Review" of a single session.
