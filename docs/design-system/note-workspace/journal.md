# Route: `/journal/:id`

| | |
|--|--|
| **Route Pattern** | `/journal/:id` |
| **Template** | [Note Workspace](_template.md) |
| **Component** | `JournalPageShell` |

## Description

The workspace for reviewing and editing stored journal entries and results.

## Configuration (Note Workspace)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Stored note record in IndexedDB (Journal category). |
| **Editor Mode** | Editable (for adding post-workout notes or modifying the script). |
| **Workbench Context** | Wrapped in `JournalPageShell` for explicit state management of timer and review dialogs. |
| **Execution** | Uses the `JournalPageShell` to mount and manage overlays rather than standard `App.tsx` fall-throughs. |

## Workflow

1.  **Browse**: Users typically reach this route through the "Results" sidebar accordion.
2.  **Review**: The page loads with the previous session's script and allows for post-workout reflections.
3.  **Re-Run**: Users can launch a new execution directly from the journaled script.
