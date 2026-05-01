# Route: `/journal/:id`

| | |
|--|--|
| **Route Pattern** | `/journal/:id` |
| **Template** | [Note Workspace](design-system/note-template/_template.md) |
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

## State Management

### URL State (`nuqs` via `JournalPageShell`)

| Param | Type | `history` | Purpose |
|-------|------|-----------|---------|
| `?s=` | `string` | `push` | Active content section ID used by the TOC sidebar to highlight the current section. Each section change adds a browser history entry (back button navigates between sections). |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `isTimerOpen` | `boolean` | Controls `FullscreenTimer` dialog visibility. |
| `isReviewOpen` | `boolean` | Controls `FullscreenReview` dialog visibility. |
| `timerBlock` | `WodBlock \| null` | The `WodBlock` currently executing in the timer; `null` when no session is running. |
| `reviewSegments` | `Segment[]` | Analytics segments from the completed session; populated on timer close for the review dialog. |
| `wodBlocks_jp` | `WodBlock[]` | Compiled blocks from the `NoteEditor`; updated live as the user edits the script. |

## Workflow

1.  **Browse**: Users typically reach this route through the "Results" sidebar accordion.
2.  **Review**: The page loads with the previous session's script and allows for post-workout reflections.
3.  **Re-Run**: Users can launch a new execution directly from the journaled script.
