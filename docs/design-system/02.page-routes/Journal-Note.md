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

> **Design Decision — Overlay Timer is Intentional (not an inconsistency)**
>
> The Journal Note deliberately diverges from Playground, Collection, and Feed notes, which all use `timerMode: 'route'` (navigating to `/tracker/:id`). This divergence is a product decision, not an oversight. See [Design Decision](#design-decision--overlay-timer) below.

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

---

## Design Decision — Overlay Timer

**Status:** Deliberate — do not standardize away from this.

### Context

All other note surfaces (Playground, Collection, Feed) use `timerMode: 'route'`, navigating the user to `/tracker/:id` when a workout starts. The Journal Note instead keeps `FullscreenTimer` and `FullscreenReview` as in-page overlays (`fixed inset-0 z-50`). This was questioned as a potential inconsistency during UI alignment work ([WOD-283](/WOD/issues/WOD-283)).

### Decision

The overlay timer on the Journal Note is **a deliberate product decision** and should be preserved. Standardising to route-based navigation would be a regression for journal users.

### Rationale

| Lens | Reasoning |
|------|-----------|
| **Context preservation** | The journal note is the user's daily training log, often containing multiple workout blocks for the same session. An overlay keeps the full note visible behind the timer, so after completing one block the next block is immediately in view — no back-navigation required. Route navigation loses that ambient context. |
| **Mobile UX (Fitts's Law / thumb zones)** | On mobile, navigating away from the journal requires an explicit back gesture to return. An overlay dismisses with a single close tap and returns the user to exactly where they were in the note. This is strictly fewer steps for the most common post-workout action (log next block or review note). |
| **Journal as daily anchor (Mental Model)** | The journal note functions as the user's "hub" for the day. The overlay preserves this mental model: the timer is a focused layer *on top of* the journal, not a separate destination. Route navigation would frame the timer as a peer context, fragmenting the day's session across browser history entries. |
| **autoStart flow continuity** | Collection and Playground notes redirect to `/journal/:dateKey?autoStart=<id>` when sending a workout to the journal. If the journal then routed to `/tracker`, the `?autoStart` handoff would chain two navigations and break the "send to journal" mental model entirely. |
| **Result linking** | Results generated while the overlay is open are automatically linked to the journal note via `setActiveRuntimeId`. A route-based timer returns to a different origin; result linking would require extra bookkeeping and risks orphaned results. |
| **Occam's Razor** | The overlay achieves all goals with less indirection. There is no user benefit to the extra route hop for a user already in their journal. |

### Tradeoffs Accepted

- **Visible inconsistency** across note surfaces. Mitigated by the fact that the Journal and Playground are distinct user contexts (daily log vs. ad-hoc authoring) — users are unlikely to compare them side-by-side.
- **Overlay-specific accessibility work** (focus trap, reduced-motion). This is required regardless of route vs. overlay and is tracked separately.
- **Deep-linking to a timer state is not possible** in the overlay model. Acceptable because timer sessions are transient and not meant to be bookmarked.

### Alternatives Considered

| Alternative | Verdict |
|-------------|---------|
| Standardise Journal to `timerMode: 'route'` like Playground/Feed | **Rejected** — degrades mobile UX and breaks the daily-anchor mental model. |
| Standardise all notes to `timerMode: 'overlay'` | **Deferred** — Playground/Feed users expect route navigation and back-button to return to editor; overlay adds complexity there without clear benefit. Revisit if mobile becomes the primary platform. |
| Route navigation with "back to journal" deep link | **Rejected** — two navigations, extra browser history entries, fragile if the user manually navigates away before returning. |

