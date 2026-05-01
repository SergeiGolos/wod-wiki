# Page: Reports (Review)

**Route:** `/review/:runtimeId`
**Template:** [ReportTemplate](../01.page-templates/report-template.md)
**Layout:** [FocusTemplate](../00.layout-template/focus-template.md)
**Status:** Implemented
**Source:** `playground/src/pages/ReviewPage.tsx`

---

## Overview

`ReviewPage` (Reports) is the post-workout analytics display. It loads the persisted `WorkoutResult` from IndexedDB using the `:runtimeId` written by `TrackerPage` on completion, computes segment analytics from the raw logs, and renders `FullscreenReview` which fills the entire content area.

Like `TrackerPage`, this page runs inside `FocusTemplate` — full viewport, no nav shell. It can also render inside `AppTemplate` when accessed from a note that launched the workout inline.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/review/:runtimeId` |
| `:runtimeId` | IndexedDB result key. Written by `RuntimeTemplate.onComplete`. Stable and bookmarkable. |
| URL state | None (no nuqs params) |

---

## Template Overrides

This page provides no overrides to `ReportTemplate` — it is the canonical implementation of the template.

| ReportTemplate behaviour | ReviewPage behaviour |
|-------------------------|----------------------|
| `onClose()` | Default: `navigate(-1)` |
| `onReplay(runtimeId)` | Default: re-creates pending runtime → `navigate('/tracker/:newId')` |
| `onViewNote(noteId)` | Default: resolves path → `navigate` to origin note |
| Error state (not found) | Default: "Result not found" + go-back action |

---

## Unique Behaviours

### Three-State Loading
`ReportTemplate` manages: `isLoading` (initial) → loaded (`segments` populated) → `error` (result not found or corrupt).

### Bookmarkable URL
Unlike `/tracker/:runtimeId`, the review URL is durable — the result is in IndexedDB and survives page refresh. Users can return to a past workout result by navigating directly to the URL.

### Segment Analytics Derivation
Raw log events → `getAnalyticsFromLogs(logs, startTime)` → `Segment[]`. Computed on the client at load time; not stored separately.

### Title Derivation
Display title is the last path segment of `result.noteId` (e.g. `fran` from `playground/fran`).

---

## AppTemplate / FocusTemplate Slot Assignments

| Panel | Content |
|-------|----------|
| `contentHeader` | Workout title + close/replay actions |
| `contentPanel` | `FullscreenReview` — fills 100% of content area |
| `leftPanel` | no-op (FocusTemplate silently discards) |
| `rightPanel` | no-op (FocusTemplate silently discards) |

---

## Data

| Data | Source | How |
|------|--------|-----|
| `WorkoutResult` | IndexedDB | `indexedDBService.getResultById(runtimeId)` on mount |
| `Segment[]` | Derived | `getAnalyticsFromLogs(result.data.logs, result.data.startTime)` |
| `title` | Derived | Last segment of `result.noteId` |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Close | Previous history entry |
| Replay | `/tracker/:newRuntimeId` |
| View note | Origin note (`/journal/:id`, `/workout/:cat/:name`, etc.) |
| Error state | Previous history entry |
