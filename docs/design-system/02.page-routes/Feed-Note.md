# Page: Feed Note (Workout Editor)

**Route:** `/feed/:category/:name`  *(planned)*
**Template:** [NoteTemplate](../01.page-templates/note-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Planned
**Source:** `playground/src/pages/WorkoutEditorPage.tsx` *(shared, to be parameterised)*

---

## Overview

A Feed Note is the per-workout editing surface for workouts discovered through the Feed. It is structurally identical to a [Collection Note](./Collection-Note.md) — same `NoteTemplate`, same editor, same timer launch flow — but its identity comes from the Feed's content namespace rather than the bundled `wods/` collection.

The key difference is the **timer mode**: Feed workouts always navigate directly to `/tracker/:id` (same as `INLINE_RUNTIME_CATEGORIES` in Collection Note). There is no journal-append path because feed content is not assumed to be part of the user's personal training journal.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/feed/:category/:name` |
| `:category` | Feed source category (e.g. `competition`, `open`) |
| `:name` | Workout name / slug |
| URL state | None (no nuqs params) |

---

## Differences from Collection Note

| Feature | Collection Note | Feed Note |
|---------|-----------------|-----------|
| Content source | Bundled `wods/` markdown | Feed content namespace |
| Timer mode | Inline OR journal-append (category-dependent) | Always inline → `/tracker/:id` |
| Schedule action | ✅ (CalendarCard) | ❌ |
| Journal append | ✅ (collection categories) | ❌ |
| IndexedDB persistence | Personal edits survive | Same |

---

## Template Overrides

| NoteTemplate behaviour | Feed Note override |
|-----------------------|-------------------|
| `category` | `:category` path param (feed namespace) |
| `name` | `:name` path param |
| `mdContent` | Loaded from feed content store |
| `timerMode` | Always `'route'` — navigate directly to `/tracker/:id` |
| `onStartWorkout(block)` | `navigate('/tracker/:runtimeId')` directly |
| `onScheduleBlock` | Not applicable |

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|----------|
| `leftPanel` | Section index (headings + wod block anchors) |
| `contentHeader` | Workout name + `NotePageActions` (Start Workout, Cast, Theme) |
| `contentPanel` | `NoteEditor` (CodeMirror 6) — full height |
| `rightPanel` | — (not used) |

---

## Data

| Data | Source | How |
|------|--------|-----|
| Markdown content | Feed content namespace | Loaded by `NoteTemplate` content resolver |
| User edits | IndexedDB | Overlaid on top of feed content |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Start Workout | `/tracker/:runtimeId` |
| Back | `/feed/:category` or Feed List |
