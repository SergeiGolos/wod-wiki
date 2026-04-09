# Route: `/playground`

| | |
|--|--|
| **Route Patterns** | `/playground`, `/playground/:id` |
| **Template** | [Note Workspace](_template.md) |
| **Component** | `PlaygroundNotePage` |

## Description

An ephemeral scratchpad workspace for experimenting with WodScript without creating a permanent file.

## Configuration (Note Workspace)

| Property | Configuration |
|----------|---------------|
| **Data Source** | User-owned note stored in IndexedDB. |
| **Editor Mode** | Fully editable. |
| **Workbench Context** | Single-panel `NoteEditor` pre-loaded with a "New Playground" template. |
| **Execution** | Same as Workout route; launches into dialog-based runtime execution. |

## Workflow

1.  **Create**: Visiting `/playground` redirects to a new UUID-based route (e.g., `/playground/2026-03-24-14-30`).
2.  **Initialize**: The page is pre-populated with a standard WodScript template for quick start.
3.  **Persist**: All changes are automatically saved to the browser's IndexedDB.
