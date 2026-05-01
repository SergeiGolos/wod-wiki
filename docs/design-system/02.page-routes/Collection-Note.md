# Page: Collection Note (Workout Editor)

**Route:** `/workout/:category/:name`  *(also `/note/:category/:name`)*
**Template:** [NoteTemplate](../01.page-templates/note-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/pages/WorkoutEditorPage.tsx`

---

## Overview

A Collection Note is an individual workout file rendered in the WodScript editor. The content source is the bundled `wods/` markdown file, but changes are persisted to IndexedDB so personal edits survive. This page is the editing surface for named workout scripts — it handles both the "read a collection workout" and "run it" use cases.

The workout launch behaviour differs based on category:
- **Inline categories** (`INLINE_RUNTIME_CATEGORIES`): navigate directly to `/tracker/:id`
- **Collection categories**: append the workout to today's journal note, then navigate to `/journal/:dateKey?autoStart=<id>`

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/workout/:category/:name` |
| `:category` | Workout category string (e.g. `crossfit-girls`, `dan-john`) |
| `:name` | Workout name / filename (e.g. `fran`, `angie`) |
| URL state | None (no nuqs params) |

---

## Template Overrides

| NoteTemplate behaviour | Collection Note override |
|-----------------------|------------------------|
| `category` | `:category` path param |
| `name` | `:name` path param |
| `mdContent` | Bundled markdown from `wods/` glob — passed as `mdContent` prop from `App.tsx` |
| `timerMode` | `'route'` for inline categories; `'journal-append'` for collection categories |
| `onStartWorkout(block)` — inline | `navigate('/tracker/:runtimeId')` directly |
| `onStartWorkout(block)` — collection | Appends to journal note → `navigate('/journal/:dateKey?autoStart=<id>')` |
| `onScheduleBlock(block, date)` | Appends to a specified date's journal note; shows a toast with an undo link |
| Schedule calendar | `CalendarCard` widget — allows picking a future date for the workout |

### Schedule Flow
`WorkoutEditorPage` adds a "Schedule" action that opens a `CalendarCard` date picker. On date selection it calls `appendWorkoutToJournal({ date })` and shows a toast notification with the date and an "Open Journal" shortcut link.

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Section index (headings + wod block anchors) |
| `contentHeader` | Workout name + `NotePageActions` (Start Workout, Schedule, Cast, Theme) |
| `contentPanel` | `NoteEditor` (CodeMirror 6) — full height |
| `rightPanel` | — (not used) |

---

## Data

| Data | Source | When |
|------|--------|------|
| Initial content | Bundled `wods/` file — passed as `mdContent` prop | Build time |
| Persisted edits | `usePlaygroundContent({ category, name, mdContent })` — IndexedDB with file fallback | On mount |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Start workout (inline category) | `/tracker/:runtimeId` |
| Start workout (collection) | `/journal/:dateKey?autoStart=<id>` |
| Schedule workout | Appends to journal → toast notification |
| Back navigation | `/collections/:slug` or previous history |

---

## Collection vs. Non-Collection Distinction

`INLINE_RUNTIME_CATEGORIES` and `NON_COLLECTION_CATEGORIES` sets in `pageUtils.ts` control routing behaviour. This distinction will be replaced by explicit per-page template config when the template system is implemented.
