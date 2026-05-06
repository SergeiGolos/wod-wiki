# Page: Playground Note

**Route:** `/playground/:id`
**Template:** [NoteTemplate](../01.page-templates/note-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/pages/PlaygroundNotePage.tsx`

---

## Overview

The Playground Note is a personal scratchpad note identified by a UUID. It is functionally identical to a Journal Note but without the date-keyed identity — it's for ad-hoc workout authoring that isn't tied to a specific day. Starting a workout from a Playground Note navigates to the Tracker (`/tracker/:id`) rather than opening an inline overlay.

A bare `/playground` route (no `:id`) triggers `PlaygroundRedirect` which generates a new UUID and redirects to `/playground/<uuid>`.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/playground/:id` |
| `:id` | UUID — used as IndexedDB key (`playground/<id>`) |
| URL state | None (no nuqs params) |

---

## Template Overrides

| NoteTemplate behaviour | Playground Note override |
|-----------------------|------------------------|
| `category` | `'playground'` |
| `name` | `:id` param (UUID) |
| `defaultContent` | `new-playground.md` template with `$CURSOR` token |
| `timerMode` | `'route'` — `onStartWorkout` navigates to `/tracker/:runtimeId` |
| `onStartWorkout(block)` | Stores in `pendingRuntimes` → `navigate('/tracker/:runtimeId')` |
| Cursor placement | First mount: editor cursor placed at `$CURSOR` token position in the template |
| Page title | `document.title` set to `"Wod.Wiki - <formatted-id>"` |

### `$CURSOR` Token
On first mount, `PlaygroundNotePage` reads the cursor offset from `applyTemplate()` and dispatches a CodeMirror `setSelection` to place the cursor at the template's intended starting position. This only runs once (guarded by `cursorPlaced` ref).

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Section index (headings + wod block anchors) from `useNotePageNav` |
| `contentHeader` | Formatted page title + `NotePageActions` (Start Workout, Cast, Theme) |
| `contentPanel` | `NoteEditor` (CodeMirror 6) — full height |
| `rightPanel` | — (not used) |

---

## Data

| Data | Source | When |
|------|--------|------|
| Note content | `usePlaygroundContent({ category: 'playground', name: id })` | On mount; auto-creates with template if missing |

No results loading — playground notes route to TrackerPage for execution, so results are linked to the tracker runtimeId, not surfaced here.

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Start workout | `/tracker/:runtimeId` |
| Back navigation | Previous history entry |

---

## Relationship to Journal Note

| Feature | Playground Note | Journal Note |
|---------|----------------|-------------|
| Identity | UUID | Date key (YYYY-MM-DD) |
| Timer flow | Route to TrackerPage | Inline overlay |
| Review flow | Route to ReviewPage | Inline overlay |
| Default content | `new-playground.md` template | `new-playground.md` template |
| Results surfaced | No | Yes (results panel) |
