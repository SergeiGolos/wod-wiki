# Page: Journal Note

**Route:** `/journal/:id`
**Template:** [NoteTemplate](../01.page-templates/note-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/pages/JournalPage.tsx`

---

## Overview

The Journal Note page is the primary editing surface for a single journal entry identified by its date key (`YYYY-MM-DD`). It combines the WhiteboardScript editor with an inline timer launch flow, making it the natural home for logging a daily workout. Results from workouts run here are linked to this note.

Journal notes are editable on any date but the UI can surface edit-lock affordances for past entries in a future iteration.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/journal/:id` |
| `:id` | Date key — `YYYY-MM-DD` — also used as the IndexedDB key suffix (`journal/YYYY-MM-DD`) |
| `?s=` (nuqs, `history: 'push'`) | Active section anchor — used by `JournalPageShell` for TOC scroll tracking |
| `?autoStart=<runtimeId>` | Transient — consumed on mount, deleted from URL. Set by `WorkoutEditorPage` when it appends a block to this journal note and wants the timer to auto-launch. |

---

## Template Overrides

| NoteTemplate behaviour | Journal Note override |
|-----------------------|----------------------|
| `category` | `'journal'` |
| `name` | `:id` param (date key) |
| `defaultContent` | `new-playground.md` template with `$CURSOR` token |
| `timerMode` | `'overlay'` — `FullscreenTimer` opens as inline overlay (`fixed inset-0 z-50`), not a route navigation |
| `reviewMode` | `'overlay'` — `FullscreenReview` opens inline |
| `onStartWorkout(block)` | Stores result link via `setActiveRuntimeId`; opens `FullscreenTimer` overlay (does **not** navigate to `/tracker`) |
| `onOpenReview(runtimeId)` | Loads result from IndexedDB; opens `FullscreenReview` overlay (does **not** navigate to `/review`) |

The Journal Note is the **only** note page that keeps the timer and review as in-page overlays rather than full-page routes. This allows the editor content to remain visible behind the overlay.

### `?autoStart` Flow

When `WorkoutEditorPage` appends a block to a journal note, it:
1. Stores the pending runtime in `pendingRuntimes`
2. Navigates to `/journal/:dateKey?autoStart=<runtimeId>`
3. This page detects `?autoStart`, retrieves the pending runtime, removes the param, and immediately opens the timer overlay

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Section index (headings + wod block anchors) from `useNotePageNav` |
| `contentHeader` | Date title (e.g. "Thursday, 1 May 2026") + `NotePageActions` (Start Workout, Cast, Theme) |
| `contentPanel` | `NoteEditor` (CodeMirror 6) — full height |
| `rightPanel` | Results list for this date (planned) |

---

## Data

| Data | Source | When |
|------|--------|------|
| Note content | `usePlaygroundContent({ category: 'journal', name: dateKey })` | On mount; auto-creates with template if missing |
| Workout results | `indexedDBService.getResultsForNote(noteId)` | On mount + after each timer close |
| `?autoStart` runtime | `pendingRuntimes.get(runtimeId)` | On mount (transient) |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Start workout | Opens `FullscreenTimer` overlay (stays on `/journal/:id`) |
| Timer complete | Opens `FullscreenReview` overlay (stays on `/journal/:id`) |
| Review close | Dismisses overlay; stays on `/journal/:id` |
| Back navigation | `/journal` (calendar) |
