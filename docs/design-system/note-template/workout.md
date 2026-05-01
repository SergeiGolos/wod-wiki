# Route: `/workout` / `/note`

| | |
|--|--|
| **Route Patterns** | `/workout/:category/:name`, `/note/:category/:name` |
| **Template** | [Note Workspace](note-template.md) |
| **Component** | `WorkoutEditorPage` |

## Description

The main workspace for authoring and editing WodScript files stored in the repository. `/note/` is a direct alias for `/workout/`.

## Configuration (Note Workspace)

| Property | Configuration |
|----------|---------------|
| **Data Source** | Read/write from the local workout library (`wods/` directory). |
| **Editor Mode** | Fully editable. |
| **Workbench Context** | Full-screen `NoteEditor` taking the entire viewport below the sticky header. |
| **Execution** | Launches `FullscreenTimer` and `FullscreenReview` via dialog overlays. |

## State Management

### URL State

None. Route identity is carried in path params `:category/:name`; no `nuqs` params.

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `wodBlocks` | `WodBlock[]` | Compiled blocks from the `NoteEditor`. |
| `error` | `string \| null` | Load error if the file is not found in the `wods/` library. |

## Workflow

1.  **Load**: The `WorkoutEditorPage` resolves the file path based on the route parameters.
2.  **Edit**: Users can modify the WodScript; changes are persisted via the [Playground DB service](note-template.md#configurations-by-route).
3.  **Run**: Clicking the "Start Workout" overlay in the editor (or a button pipeline) triggers the workout lifecycle.
