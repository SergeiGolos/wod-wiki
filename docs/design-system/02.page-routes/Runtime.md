# Page: Runtime (Tracker)

**Route:** `/tracker/:runtimeId`
**Template:** [RuntimeTemplate](../01.page-templates/runtime-template.md)
**Layout:** [FocusTemplate](../00.layout-template/focus-template.md)
**Status:** Implemented
**Source:** `playground/src/pages/TrackerPage.tsx`

---

## Overview

`TrackerPage` is the live workout execution page. It takes a `:runtimeId`, resolves the compiled `WodBlock` from the in-memory `pendingRuntimes` map, and hands it to `FullscreenTimer` which drives the entire full-screen display. On completion the runtime template persists the result to IndexedDB and navigates to `/review/:runtimeId`.

This page runs inside `FocusTemplate` — full viewport, no nav shell, no sidebar. On desktop it can also appear as an overlay inside `AppTemplate` when launched from a note with `timerMode: 'inline'`.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/tracker/:runtimeId` |
| `:runtimeId` | In-memory key into `pendingRuntimes` Map. Consumed (deleted) on mount. Not persisted. |
| URL state | None (no nuqs params) |

---

## Template Overrides

This page provides no overrides to `RuntimeTemplate` — it is the canonical implementation of the template. The template's `onComplete` default handles everything:

| RuntimeTemplate behaviour | TrackerPage behaviour |
|--------------------------|-----------------------|
| `onComplete(blockId, results)` | Default: persist → `navigate('/review/:runtimeId', { replace: true })` |
| `onClose()` | Default: `navigate(-1)` |
| Error state (no pending runtime) | Default: "Workout not found" + go-back action |

---

## Unique Behaviours

### Pending Runtime Consumption
On mount `TrackerPage` calls `pendingRuntimes.get(runtimeId)` and **immediately deletes the entry** from the map. If the user refreshes the page the runtime is gone and the error state is shown. This is by design — tracker URLs are not bookmarkable.

### No Persistent URL State
All state is in-memory. The URL carries only the transient identity token. Browser back or refresh discards the session.

---

## AppTemplate / FocusTemplate Slot Assignments

| Panel | Content |
|-------|----------|
| `contentHeader` | — (hidden during active execution) |
| `contentPanel` | `FullscreenTimer` — fills 100% of viewport |
| `leftPanel` | no-op (FocusTemplate silently discards) |
| `rightPanel` | no-op (FocusTemplate silently discards) |

---

## Data

| Data | Source | How |
|------|--------|-----|
| `WodBlock` | In-memory `pendingRuntimes` Map | Consumed on mount |
| `noteId` | Carried inside `PendingRuntime` entry | Used by `onComplete` to link result to origin note |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Workout completes | `/review/:runtimeId` (replace) |
| Close / back | Previous history entry |
| Error state (no runtime) | Previous history entry |
