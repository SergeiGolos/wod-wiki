# Route: `/workout` / `/note`

| | |
|--|--|
| **Route Patterns** | `/workout/:category/:name`, `/note/:category/:name` |
| **Template** | [Note Workspace](../templates/note-workspace.md) |
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

## Workflow

1.  **Load**: The `WorkoutEditorPage` resolves the file path based on the route parameters.
2.  **Edit**: Users can modify the WodScript; changes are persisted via the [Playground DB service](../templates/note-workspace.md#configurations-by-route).
3.  **Run**: Clicking the "Start Workout" overlay in the editor (or a button pipeline) triggers the workout lifecycle.
