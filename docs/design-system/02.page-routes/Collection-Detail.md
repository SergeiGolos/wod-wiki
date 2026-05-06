# Page: Collection Detail

**Route:** `/collections/:slug`
**Template:** [CanvasTemplate](../01.page-templates/canvas-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/canvas/MarkdownCanvasPage.tsx` (via `findCanvasPage`)

---

## Overview

A Collection Detail page renders the `README.md` of a specific collection as a scroll-driven Canvas page. The README introduces the collection philosophy, walks through individual workouts with prose and WhiteboardScript code blocks, and typically includes a `{{workouts}}` tag that injects a sortable list of all workouts in that collection.

Routes are **auto-generated at build time** from the folder structure of `markdown/collections/`. No `route:` frontmatter key is required — the route is derived from the folder name.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/collections/:slug` |
| `:slug` | Collection folder name (e.g. `dan-john`, `crossfit-girls`) |
| `?h=` (nuqs) | Active section slug. `history: 'replace'` + `shallow`. Written by IO, read on mount. |

---

## Template Overrides

| CanvasTemplate behaviour | Collection Detail override |
|-------------------------|--------------------------|
| `sourcePath` | `markdown/collections/:slug/README.md` — auto-resolved by `canvasRoutes` |
| `heroSlot` | Collection title + workout count (from first `##` heading) |
| `onRunWorkout(path, mode)` | Default: opens `FullscreenTimer` in `dialog` mode. Button `launch:` attribute can override to `view` or `route`. |
| `{{workouts}}` tag | Renders `CollectionWorkoutsList` — sortable table of all workouts in the collection |

---

## Unique Behaviours

### Auto-routing
`canvasRoutes.ts` reads all `markdown/collections/**/README.md` files at build time. Each file is parsed and registered in the route map with the key `/collections/<slug>`. `findCanvasPage(pathname)` performs an O(1) map lookup at render time.

### `{{workouts}}` Tag
When a section's prose contains `{{workouts}}`, `MarkdownCanvasPage` replaces it with `CollectionWorkoutsList` — a sortable, filterable table of workout files from that collection's folder. Each row links to `/workout/:category/:name`.

### Collection Category
`getCategoryForCollection(slug)` maps the slug to its category string (e.g. `'dan-john'` → `'strength'`). This category is used when navigating to individual workouts from the list.

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Section TOC (headings in the README) |
| `contentHeader` | Collection title |
| `contentPanel` | Sectioned canvas content: prose + sticky editor panel (when `view` block present) |
| `rightPanel` | — (not used) |

---

## Data

All content is bundled at build time. No runtime network or IndexedDB loading at the page level.

| Data | Source |
|------|--------|
| README markdown | `markdown/collections/:slug/README.md` — Vite `?raw` import |
| Workout file list | `markdown/collections/:slug/*.md` glob (for `{{workouts}}`) |

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Tap workout in `{{workouts}}` list | `/workout/:category/:name` |
| Run workout button (`launch: dialog`) | `FullscreenTimer` overlay |
| Run workout button (`launch: route`) | `/tracker/:runtimeId` |
| Back navigation | `/collections` |
