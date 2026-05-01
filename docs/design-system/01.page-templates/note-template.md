# Template: Note

**Component:** `NoteTemplate` (Template)
**Atomic Level:** Template — note authoring lifecycle + IndexedDB content shell
**Status:** Design Draft
**Parent Template:** [AppTemplate](../00.layout-template/app-template.md)
**Last Updated:** 2026-04-30

---

## Overview

`NoteTemplate` is the page-type shell for authoring, executing, and reviewing WodScript notes. It owns content loading from IndexedDB (or file), WodBlock compilation state, workout launch flow (note → tracker → review), and overlay lifecycle (FullscreenTimer, FullscreenReview). It exposes a typed `NoteContext` to child pages.

This template sits between `AppTemplate` (layout panels) and the individual note pages (JournalPage, PlaygroundNotePage, WorkoutEditorPage) that supply the content source and override execution behaviour.

---

## Pages Using This Template

| Page | Route | Current File |
|------|-------|------|
| Journal note | `/journal/:id` | `playground/src/pages/JournalPage.tsx` |
| Playground note | `/playground/:id` | `playground/src/pages/PlaygroundNotePage.tsx` |
| Workout editor | `/workout/:category/:name` | `playground/src/pages/WorkoutEditorPage.tsx` |
| Collection note | `/collections/*` | collection source via markdown file |

---

## Routing & URL State

Note pages carry identity entirely in path params — no nuqs filter state at the template level. The one exception is `JournalPageShell` which adds `?s=` for section scroll tracking.

| Param                    | Source                   | Purpose                                                       |
| ------------------------ | ------------------------ | ------------------------------------------------------------- |
| `:id`                    | path (react-router)      | IndexedDB key for playground / journal notes                  |
| `:category/:name`        | path                     | File path for `wods/` workout scripts                         |
| `?s=`                    | nuqs (`history: 'push'`) | Active section for journal notes (JournalPageShell only)      |
| `?autoStart=<runtimeId>` | search param (transient) | Auto-launch timer on page load; consumed and removed on mount |

### Hook: `useNoteRouteParams`

```ts
interface NoteRouteParams {
  noteId: string           // full composite key, e.g. 'journal/2026-04-30'
  category: string         // 'journal' | 'playground' | 'workout' | 'collection'
  name: string             // the per-category identifier
}
```

---

## Data Loading

| Data | Source | Hook / Service |
|------|--------|---------------|
| Note content | IndexedDB or `wods/` file | `usePlaygroundContent({ category, name, mdContent })` |
| Workout results for note | IndexedDB | `indexedDBService.getResultsForNote(noteId)` |
| Auto-start runtime (transient) | In-memory `pendingRuntimes` map | Consumed on mount via `?autoStart=` |

Content load is idempotent — the template creates a new note with the provided template content if the key does not exist yet.

### Typed Output: `NoteContext`

```ts
interface NoteContext {
  // Content
  content: string
  isLoading: boolean
  error: string | null

  // Editor callbacks
  onChange: (value: string) => void
  onLineChange?: (line: number) => void
  onBlur?: () => void

  // Compiled blocks
  wodBlocks: WodBlock[]
  setWodBlocks: (blocks: WodBlock[]) => void

  // Section index (built from headings + wod blocks)
  index: NavItemL3[]

  // Results for this note
  results: WorkoutResult[]
  refreshResults: () => void

  // Actions (event hub)
  onStartWorkout: (block: WodBlock) => void
  onOpenReview: (runtimeId: string) => void
  onScrollToSection: (id: string) => void
}
```

---

## Event Hub

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onStartWorkout(block)` | Stores block in `pendingRuntimes` → `navigate('/tracker/:id')` | Open FullscreenTimer inline instead of routing |
| `onOpenReview(runtimeId)` | `navigate('/review/:runtimeId')` | Open FullscreenReview inline as an overlay |
| `onScrollToSection(id)` | `AppLayoutContext.scrollToSection(id)` | Delegate to CodeMirror scroll for editor sections |
| `onSave()` | Auto-save via `onBlur` / `onChange` debounce | Manual save with explicit feedback |
| `onDelete()` | Soft-delete from IndexedDB → navigate away | Prompt confirmation dialog |

---

## AppTemplate Slot Assignments

| AppTemplate Panel | Default Content | Provided By |
|-------------------|-----------------|-------------|
| `leftPanel` | Section index / TOC (headings + wod blocks) | Template — `NotePageNav` (via `useNotePageNav`) |
| `contentPanel` | NoteEditor (CodeMirror 6) | Template shell |
| `rightPanel` | Results history for this note | Template — lazy `NoteResultsPanel` |
| `contentHeader` | Note title + NotePageActions (start workout, theme, cast) | Template — `NoteHeader` |

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| Content load (IndexedDB / file) | ✅ | `category`, `name`, `defaultContent?` |
| Auto-save on change/blur | ✅ | — |
| WodBlock compilation state | ✅ | — |
| Section index + left panel | ✅ | — |
| Results load for note | ✅ | — |
| Default workout launch (→ TrackerPage) | ✅ | — |
| Inline overlay mode (FullscreenTimer) | ❌ — opt-in | Set `timerMode: 'overlay'` prop |
| Inline overlay mode (FullscreenReview) | ❌ — opt-in | Set `reviewMode: 'overlay'` prop |
| Custom scroll-to handler (CodeMirror) | Configurable | Override `onScrollToSection` |
| Custom header actions | Optional override | `headerActions?: ReactNode` |

---

## Layout Structure

```
AppTemplate
├── leftPanel     → [NotePageNav]  section index (headings + wod block anchors)
├── contentHeader → [NoteHeader]   title + actions (start workout, cast, theme)
└── contentPanel
      ├── [NoteEditor]  CodeMirror 6, full height, syntax highlighting
      │
      ├── [FullscreenTimer]   fixed overlay — shown when timerMode='overlay'
      │                        and onStartWorkout fires
      └── [FullscreenReview]  fixed overlay — shown when reviewMode='overlay'
                               and onOpenReview fires
```

---

# Template: Note Workspace

|            |                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Name**   | Note Workspace                                                                                                                    |
| **Code**   | `playground/src/App.tsx` (page components), `src/components/Editor/NoteEditor.tsx`, `src/panels/page-shells/JournalPageShell.tsx` |
| **Routes** | `/workout/*`, `/note/*`, `/playground/*`, `/journal/*`                                                                            |

## Description

The central interactive workspace for authoring, tracking, and reviewing WodScript notes. While visually similar, different routes configure this workspace through the **Workbench Context** and **Editor Mode**.

The workspace typically consists of:
1.  **Sidebar**: Navigation for collections, results, and recent pages.
2.  **Header**: Sticky navigation with section dropdowns and global actions (Cast, Theme).
3.  **Editor Surface**: The `NoteEditor` (CodeMirror 6) with syntax highlighting, linting, and interactive overlays.
4.  **Runtime Overlays**: Dialog-based `FullscreenTimer` and `FullscreenReview` panels triggered from within the editor.

## State Management

Note Workspace routes use **no URL query state (`nuqs`)**. Route identity is carried entirely in the path.

### URL Shape (react-router path params, not nuqs)

| Route | Path Params | Source of truth |
|-------|-------------|----------------|
| `/workout/:category/:name` | `category`, `name` | `wods/` file path |
| `/note/playground/:id` | `id` | IndexedDB key |
| `/playground/:id` | `id` | IndexedDB key |
| `/journal/:id` | `id` | IndexedDB key |

### Local State (outside URL)

All execution and overlay state is managed locally and resets on navigation:

| State | Type | Present on routes | Purpose |
|-------|------|-------------------|---------|
| `wodBlocks` | `WodBlock[]` | All routes | Compiled blocks from the `NoteEditor`; updated live as the user edits. |
| `isTimerOpen` | `boolean` | `/journal/:id` | Controls `FullscreenTimer` dialog visibility. |
| `isReviewOpen` | `boolean` | `/journal/:id` | Controls `FullscreenReview` dialog visibility. |
| `timerBlock` | `WodBlock \| null` | `/journal/:id` | The active block currently executing; `null` when idle. |
| `reviewSegments` | `Segment[]` | `/journal/:id` | Analytics data from the completed session; populated on timer close. |
| `error` | `string \| null` | All routes | Load or execution error message. |

> **Exception — `JournalPageShell`**: `/journal/:id` uses `JournalPageShell` as its layout shell, which adds `?s=` (`nuqs`, `history: 'push'`) for section scroll tracking. See [journal.md](design-system/note-template/journal.md#state-management).

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
