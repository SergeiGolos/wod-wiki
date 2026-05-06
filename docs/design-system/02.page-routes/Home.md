# Page: Home

**Route:** `/`
**Template:** [CanvasTemplate](../01.page-templates/canvas-template.md)
**Layout:** [AppTemplate](../00.layout-template/app-template.md)
**Status:** Implemented
**Source:** `playground/src/views/HomeView.tsx`

---

## Overview

The Home page is the entry point to wod-wiki. It is a Canvas page driven by `markdown/canvas/home/README.md` with a live WhiteboardScript editor in the first sticky view panel. The user can type, load, run, share, and go fullscreen — all without leaving the page.

---

## Route & Params

| Detail | Value |
|--------|-------|
| Route | `/` |
| Path params | none |
| URL state (`?h=`) | Active section slug — written by IntersectionObserver, read on mount to restore scroll |

---

## Template Overrides

| CanvasTemplate behaviour | Home override |
|--------------------------|--------------|
| `sourcePath` | `markdown/canvas/home/README.md` |
| `leftPanel` | Default CanvasTOC (section headings) |
| `contentHeader` | Title from hero section |
| `panelHeaderActions` | Edit / Track / Results segmented control + Reset + Run + Share + Fullscreen buttons (injected into MacOSChrome header of the sticky view panel) |
| `onRunWorkout` | Opens `FullscreenTimer` in `dialog` mode (`fixed inset-0 z-50`) |
| `contentOverride` | Populated when user selects a workout via the command palette search bar — replaces editor content without changing source file |

---

## Unique Behaviours

### Command Palette Integration
The sticky panel's "search" affordance opens the app command palette in "load workout" mode. The selected workout content is injected via `contentOverride` prop — the source path is not changed.

### Share Link
The "Share" button base64-encodes the current editor content into a `?z=` query param and copies a URL to the clipboard. On load the `LoadZipPage` (`/load?z=…`) decodes and redirects back here with the content pre-loaded.

### Panel Actions (imperative)
`HomeView` holds a `ref` to `PanelActions` from `MarkdownCanvasPage`:
- `reset()` — restores editor to the canonical source file content
- `run()` — fires the section's `set-state: track` pipeline (launches timer)
- `results()` — fires the section's `set-state: review` pipeline
- `fullscreen()` — enters browser fullscreen mode
- `getSource()` — returns current editor content (used by Share)

---

## AppTemplate Slot Assignments

| Panel | Content | Notes |
|-------|---------|-------|
| `leftPanel` | Section TOC (canvas headings) | Highlights active section on scroll |
| `contentHeader` | Page title ("Home") | From hero `##` heading |
| `contentPanel` | Sectioned markdown canvas | First section: two-column with sticky WhiteboardScript editor |
| `rightPanel` | — | Not used |

---

## Data

No IndexedDB or network loading at the page level. Workout content is bundled at build time from `markdown/canvas/home/README.md`.

---

## Navigation From This Page

| Action | Destination |
|--------|-------------|
| Run workout (dialog mode) | `FullscreenTimer` overlay (`fixed inset-0 z-50`) |
| Navigate section link | Internal scroll (`?h=` update) |
| "New workout note →" button | `/playground/<new-uuid>` |
| Share URL copied | user's clipboard |
