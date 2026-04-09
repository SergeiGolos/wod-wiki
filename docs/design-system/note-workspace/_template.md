# Template: Note Workspace

| | |
|--|--|
| **Name** | Note Workspace |
| **Code** | `playground/src/App.tsx` (page components), `src/components/Editor/NoteEditor.tsx`, `src/panels/page-shells/JournalPageShell.tsx` |
| **Routes** | `/workout/*`, `/note/*`, `/playground/*`, `/journal/*` |

## Description

The central interactive workspace for authoring, tracking, and reviewing WodScript notes. While visually similar, different routes configure this workspace through the **Workbench Context** and **Editor Mode**.

The workspace typically consists of:
1.  **Sidebar**: Navigation for collections, results, and recent pages.
2.  **Header**: Sticky navigation with section dropdowns and global actions (Cast, Theme).
3.  **Editor Surface**: The `NoteEditor` (CodeMirror 6) with syntax highlighting, linting, and interactive overlays.
4.  **Runtime Overlays**: Dialog-based `FullscreenTimer` and `FullscreenReview` panels triggered from within the editor.

## Configurations by Route

The following table outlines how the Note Workspace is configured based on the active route:

| Route Pattern | Data Source | Editor Mode | Workbench Context / Overlays |
|---------------|-------------|-------------|------------------------------|
| `/workout/:cat/:name` | Markdown File (`wods/`) | Editable | `NoteEditor` directly; fullscreen overlays. |
| `/note/playground/:id` | IndexedDB | Editable | `NoteEditor` directly; fullscreen overlays. |
| `/playground/:id` | IndexedDB | Editable | `NoteEditor` (Scratchpad); generated UUID source. |
| `/journal/:id` | IndexedDB | Editable | `JournalPageShell`; wraps `NoteEditor` with specific overlay state management. |
| `/collections/*` | Git/Markdown | Editable | `NoteEditor` (pre-loaded with collection script). |

## Core Components

| Component | Responsibility |
|-----------|----------------|
| `NoteEditor` | Core WodScript editing surface; handles compilation and inline UI feedback. |
| `JournalPageShell` | Layout shell specifically for stored notes; manages the visibility and lifecycle of timer/review dialogs. |
| `FullscreenTimer` | Full-screen execution panel for running the compiled `WodBlock`. |
| `FullscreenReview` | Post-workout results matrix and analytics visualization. |
