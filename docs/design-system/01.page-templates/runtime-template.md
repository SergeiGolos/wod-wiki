# Template: Runtime

**Component:** `RuntimeTemplate` (Template)
**Atomic Level:** Template — workout execution lifecycle + result persistence shell
**Status:** Design Draft — implementation tracked in [WOD-261](/WOD/issues/WOD-261)
**Parent Template:** [FocusTemplate](../00.layout-template/focus-template.md) *(substitutable with AppTemplate for inline overlay mode)*
**Last Updated:** 2026-04-30

---

## Overview

`RuntimeTemplate` is the page-type shell for executing a compiled workout. It owns the pending runtime lookup (from the in-memory store), full-screen timer lifecycle, result persistence to IndexedDB on completion, and post-completion navigation. It exposes a typed `RuntimeContext` to child pages.

Unlike other templates this one is almost entirely modal — the content panel is consumed by the `FullscreenTimer` component. The AppTemplate panels collapse or hide during active execution.

---

## Pages Using This Template

| Page    | Route                 | Current File                           |
| ------- | --------------------- | -------------------------------------- |
| Tracker | `/tracker/:runtimeId` | `playground/src/pages/TrackerPage.tsx` |

---

## Routing & URL State

The runtime template is stateless with respect to URL query params. Identity is carried entirely in the path.

| Param | Source | Purpose |
|-------|--------|---------|
| `:runtimeId` | path (react-router) | Key into the in-memory `pendingRuntimes` map; also used as the IndexedDB result key |

No nuqs params. The runtime is ephemeral — refreshing the page with no pending runtime shows an error state.

---

## Data Loading

| Data | Source | How |
|------|--------|-----|
| Pending runtime | In-memory `pendingRuntimes` map | `pendingRuntimes.get(runtimeId)` on mount; deleted immediately after read to prevent leaks |

The pending entry carries:
```ts
interface PendingRuntime {
  block: WodBlock      // compiled workout block to execute
  noteId: string       // back-reference so completion can link result to note
}
```

If no pending runtime is found for the given `runtimeId` the template renders an error state and provides a "go back" action.

### Typed Output: `RuntimeContext`

```ts
interface RuntimeContext {
  runtimeId: string
  block: WodBlock | null           // null if not found
  noteId: string | null

  // Lifecycle state
  isRunning: boolean
  isComplete: boolean
  error: string | null

  // Actions (event hub)
  onComplete: (blockId: string, results: WorkoutResultData) => void
  onClose: () => void
}
```

---

## Event Hub

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onComplete(blockId, results)` | Persists result to IndexedDB via `indexedDBService.saveResult(…)` → `navigate('/review/:runtimeId', { replace: true })` if `results.completed` | Skip review navigation; stay on page or navigate elsewhere |
| `onClose()` | Resolves `noteId` back-reference → `navigate` to origin note page | Navigate to a custom destination (e.g. home) |
| `onError(err)` | Renders inline error message | Report to external error tracker |

### `onClose` Back-Navigation Logic

The default handler resolves the note origin from `noteId`:

| `noteId` prefix | Navigate to |
|-----------------|-------------|
| `playground/<id>` | `/playground/:id` |
| `journal/<id>` | `/journal/:id` |
| `<category>/<name>` | `/workout/:category/:name` |
| (anything else) | `/` |

---

## AppTemplate Slot Assignments

During active execution the layout collapses to prioritise the timer:

| AppTemplate Panel | During Execution | After Completion |
|-------------------|-----------------|-----------------|
| `leftPanel` | Hidden (`display: none`) | Restored |
| `contentPanel` | `FullscreenTimer` (`fixed inset-0 z-50`) | Redirected away |
| `rightPanel` | Hidden | — |
| `contentHeader` | Hidden | — |

The template signals `AppLayoutContext` to suppress panels while the timer is active.

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| Pending runtime lookup + cleanup | ✅ | — |
| Result persistence on complete | ✅ | — |
| Post-complete navigation | ✅ (configurable) | Override `onComplete` to change destination |
| Close / back navigation | ✅ (configurable) | Override `onClose` to change destination |
| Panel suppression during execution | ✅ | — |
| Timer UI | ✅ — `FullscreenTimer` | — |
| Auto-start | ✅ — `autoStart` prop passed to timer | Set `autoStart={false}` to require user confirmation |
| Not-found error state | ✅ | `notFoundContent?: ReactNode` — custom error UI |

---

## Layout Structure

```
AppTemplate (panels suppressed during execution)
└── contentPanel
      └── [FullscreenTimer]  fixed inset-0 z-50
            ├── [WorkoutClock]     counting down / up
            ├── [SegmentProgress]  current movement + rep count
            ├── [Controls]         pause / stop
            └── onComplete →  indexedDB.saveResult  →  /review/:id
                onClose    →  back-navigate to origin note
```