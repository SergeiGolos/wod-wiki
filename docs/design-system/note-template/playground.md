# Route: `/playground`

| | |
|--|--|
| **Route Patterns** | `/playground`, `/playground/:id` |
| **Template** | [Note Workspace](note-template.md) |
| **Component** | `PlaygroundNotePage` |

## Description

An ephemeral scratchpad workspace for experimenting with WhiteboardScript without creating a permanent file.

## Configuration (Note Workspace)

| Property | Configuration |
|----------|---------------|
| **Data Source** | User-owned note stored in IndexedDB. |
| **Editor Mode** | Fully editable. |
| **Workbench Context** | Single-panel `NoteEditor` pre-loaded with a "New Playground" template. |
| **Execution** | Same as Workout route; launches into dialog-based runtime execution. |

## State Management

### URL State

None. Route identity is entirely in the path param `:id`; no `nuqs` params.

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `wodBlocks_pnp` | `WodBlock[]` | Compiled blocks from the `NoteEditor`; used by execution overlays. |
| `error` | `string \| null` | Load error if the note is not found in IndexedDB. |

## Workflow

1.  **Create**: Visiting `/playground` redirects to a new UUID-based route (e.g., `/playground/2026-03-24-14-30`).
2.  **Initialize**: The page is pre-populated with a standard WhiteboardScript template for quick start.
3.  **Persist**: All changes are automatically saved to the browser's IndexedDB.
