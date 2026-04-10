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

## State Management

> **Important:** Notebooks uses react-router `useSearchParams` directly — **not `nuqs`**. Params are read/written via `setSearchParams`; they do not share nuqs option defaults (`history`, `shallow`, etc.).

### URL State (react-router `useSearchParams`)

| Param | Type | Purpose |
|-------|------|---------|
| `?notebook=` | slug | Filters the list to a specific user-defined notebook. |
| `?dates=` | comma-separated ISO | A custom set of selected dates (active when `filterMode === 'list'`). |
| `?range=` | `start,end ISO` | A continuous date range filter (active when `filterMode === 'range'`). |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `filterMode` | `'month' \| 'list' \| 'range'` | Which date filter mode is active. Determines which URL param is written and which filter logic runs. |
| `customDates` | `Set<string>` | Selected date ISO strings for `list` mode; initialised from `?dates=` on mount. |
| `dateRange` | `{ start: string; end: string } \| null` | Selected date range for `range` mode; initialised from `?range=` on mount. |
| `historyEntries` | `HistoryEntry[]` | All user history loaded from IndexedDB; filtered client-side. |
| `showCreateNotebook` | `boolean` | Controls the create-notebook dialog visibility. |
| `isDetailsOpen` | `boolean` | Controls the details panel visibility. |
| `lastClickedDate` | `Date \| null` | Tracks the last clicked date for multi-select toggling in `list` mode. |

## Workflow

1.  **Filter**: User selects a month or notebook from the sidebar.
2.  **Select**: One or more entries are selected in the center list.
3.  **Analyze/Preview**: The right panel updates to show a session summary or aggregate stats.
4.  **Action**: User can "Edit" a note (opening the [Note Workspace](../note-workspace/workout.md)) or view a full "Review" of a single session.
