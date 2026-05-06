# Page: Syntax Guide

**Route:** `/syntax`, `/syntax/:topic`, `/getting-started`, `/getting-started/:topic`
**Template:** [CanvasTemplate](../01.page-templates/canvas-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `markdown/canvas/syntax/README.md`, `markdown/canvas/syntax/*.md`, `markdown/canvas/getting-started/*.md`

---

## Overview

The Syntax Guide is the documentation section of wod-wiki. Each page is a scroll-driven Canvas page with prose explanations and a sticky WhiteboardScript editor panel. Code examples are interactive — the user can edit them and run the workout inline. Pages are sourced entirely from markdown and auto-routed.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/syntax` (index), `/syntax/:topic` (sub-pages), `/getting-started`, `/getting-started/:topic` |
| `?h=` (nuqs) | Active section slug. `history: 'replace'` + `shallow`. Each page instance tracks its own `?h=` independently. |

---

## Template Overrides

| CanvasTemplate behaviour | Syntax override |
|-------------------------|----------------|
| `sourcePath` | Resolved by `findCanvasPage(pathname)` — matches `route:` frontmatter in the markdown file |
| `onRunWorkout(path, mode)` | Default dialog mode — opens `FullscreenTimer` at `fixed inset-0 z-50` |
| `leftPanel` | Section TOC from headings |
| L2 navigation | Syntax sub-pages are auto-registered as L2 nav items under the "Home" L1 group in `appNavTree.ts` |

---

## Unique Behaviours

### Auto-routing
All `markdown/canvas/**/*.md` files with `route:` frontmatter are registered at build time. Syntax pages require no code changes when new markdown files are added.

### L2 Nav Auto-registration
`appNavTree.ts` reads `canvasRoutes` and maps each non-collection route to an L2 nav item under the "Home" L1 group. The label is derived from the first `##` heading of the page.

### Navigation ID Alignment
The `PageNavDropdown` in `App.tsx` hardcodes nav IDs (`introduction`, `anatomy`, `timers`, etc.) that must match the slugified headings in the markdown files. A discrepancy (e.g. `anatomy` vs `the-basics`) breaks the TOC highlight. This is a known fragile coupling.

### Sub-page Independence
Each `/syntax/:topic` is an independent `MarkdownCanvasPage` instance with its own `?h=` URL state and `panelMode` state. There is no shared context between the index and sub-pages.

---

## AppTemplate Slot Assignments

| Panel | Content |
|-------|---------|
| `leftPanel` | Section TOC + L2 sub-page navigation |
| `contentHeader` | Page title (from hero `##` heading) |
| `contentPanel` | Canvas sections: prose + sticky interactive editor |
| `rightPanel` | — (not used) |

---

## Data

All content is bundled at build time from `markdown/canvas/`. No network or IndexedDB calls.

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| TOC link | Internal scroll (`?h=` update) |
| Sub-page L2 link | `/syntax/:topic` |
| "New Workout Note →" button | `/playground/<new-uuid>` |
| Run inline example (dialog) | `FullscreenTimer` overlay |
