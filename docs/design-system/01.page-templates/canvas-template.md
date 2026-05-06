# Template: Canvas

**Component:** `CanvasTemplate` (Template)
**Atomic Level:** Template — scroll-driven editorial lifecycle + markdown content shell
**Status:** Design Draft
**Parent Template:** [AppTemplate](../00.layout-template/app-template.md)
**Last Updated:** 2026-04-30

---

## Overview

`CanvasTemplate` is the page-type shell for scroll-driven editorial content. It owns markdown loading, section parsing (heading → section model), IntersectionObserver-based scroll tracking, and sticky panel assignment. It exposes a typed `CanvasContext` to child pages. The signature affordances are: full-width prose sections, optional two-column sticky view panels, and command pipelines fired on scroll.

This template sits between `AppTemplate` (layout panels) and individual canvas pages (e.g. `HomeView`, `MarkdownCanvasPage`, syntax guides) that supply a markdown source path and optional command handlers.

---

## Pages Using This Template

| Page | Route | Current File |
|------|-------|------|
| Home | `/` | `playground/src/views/HomeView.tsx` |
| Markdown Canvas | `/canvas/*` | `playground/src/canvas/MarkdownCanvasPage.tsx` |
| Syntax guide | `/syntax` | TBD (markdown-driven) |
| Collection READMEs | `/collections/:slug` | markdown source via `README.md` |

---

## Routing & URL State

| Param | nuqs type | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?h=` | `string` | `replace` + `shallow` | Slug of the most-visible content section. Written continuously by the IntersectionObserver; read once on mount to restore scroll position. |

### Hook: `useCanvasQueryState`

```ts
interface CanvasQueryState {
  activeSection: string | null       // current ?h= value
  setActiveSection: (slug: string) => void
}
```

---

## Data Loading

| Data | Source | How |
|------|--------|-----|
| Markdown source | Static file (`markdown/canvas/`, `markdown/collections/`, `wod/`) | `fetch()` or Vite `?raw` import — path provided by the page |
| Parsed section model | Derived from markdown | `parseCanvasMarkdown(source)` → `CanvasSection[]` |

Loading is triggered on mount and re-runs only when the `sourcePath` prop changes. No IndexedDB access at the template level.

### Typed Output: `CanvasContext`

```ts
interface CanvasContext {
  // Query state
  activeSection: string | null

  // Content
  sections: CanvasSection[]          // parsed from markdown
  isLoading: boolean
  error: string | null

  // View panel state
  viewSource: string | null          // current sticky panel source
  viewAlignment: 'left' | 'right'

  // Actions (event hub)
  onSectionEnter: (section: CanvasSection) => void
  onSectionLeave: (section: CanvasSection) => void
  onSetSource: (path: string) => void
  onNavigate: (route: string) => void
  onRunWorkout: (path: string, mode: 'view' | 'dialog' | 'route') => void
}
```

---

## Event Hub

| Event | Default Behaviour | Page Override Purpose |
|-------|-------------------|-----------------------|
| `onSectionEnter(section)` | Fires section's `command` pipeline; updates `?h=` | Trigger analytics, animate custom elements |
| `onSectionLeave(section)` | Fires section's scroll-out pipeline (when defined) | Teardown section-specific state |
| `onSetSource(path)` | Swaps the sticky view panel source | Intercept to pre-transform the path or validate permissions |
| `onNavigate(route)` | `useNavigate()(route)` | Confirm before navigating away |
| `onRunWorkout(path, mode)` | Resolves path → `WodBlock`, routes to tracker or opens overlay | Override to inject custom launch options |

---

## AppTemplate Slot Assignments

| AppTemplate Panel | Default Content | Provided By |
|-------------------|-----------------|-------------|
| `leftPanel` | Section TOC (generated from headings) | Template — `CanvasTOC` |
| `contentPanel` | Sectioned markdown content | Template shell |
| `rightPanel` | Not used by default | — |
| `contentHeader` | Page title (from first `##` hero section) | Template — `CanvasHeader` |

The sticky view panel (two-column layout) lives **inside** `contentPanel`, not in a separate AppTemplate panel.

---

## Page Contract

| Concern | Template Handles | Page Provides |
|---------|-----------------|---------------|
| URL state (`?h=`) | ✅ | — |
| Markdown load + parse | ✅ | `sourcePath: string` — the markdown file to load |
| IntersectionObserver scroll tracking | ✅ | — |
| Section command pipeline execution | ✅ | — |
| Default TOC in leftPanel | ✅ | — |
| Hero section extraction | ✅ | — |
| Two-column sticky view panel | ✅ (when `view` block present) | — |
| Custom command handlers | Configurable via event hub | Override `onRunWorkout`, `onNavigate`, etc. |
| Extra right panel content | Optional override | `rightPanel?: ReactNode` |
| Custom TOC | Optional override | `leftPanel?: ReactNode` |

---

## Layout Structure

```
AppTemplate
├── leftPanel     → [CanvasTOC]  section headings, active highlighted
├── contentHeader → [CanvasHeader]  page title from hero section
└── contentPanel
      ├── [Section: hero]   extracted, not rendered in scroll flow
      ├── [Section: full-width prose]
      │     └── [CanvasProse]  markdown, tables, images, code
      ├── [Section: two-column]
      │     ├── [CanvasProse 40%]
      │     └── [StickyViewPanel 60%]  NoteEditor or RuntimeTimerPanel
      └── [Section: full-bleed]
            └── [CanvasProse]  edge-to-edge, prose centred max-w-md
```

---



## Description

Scroll-driven editorial layout. Sections are parsed from markdown headings. Each section can have a sticky editor panel (a `view` block) on the left or right, prose in the main column, embedded buttons, and scroll-triggered command pipelines. When a section has **no `view` block**, the full viewport width is used with rich markdown prose rendering (tables, images, code blocks, frontmatter cards, file links).

## Layout Modes

| Mode       | When                            | Column split                                                               | NOTE                                                                                                                                                                          |
| ---------- | ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two-column | Section contains a `view` block | 40% prose + 60% sticky editor (`NoteEditor` or `RuntimeTimerPanel`)        | ==This should account for the reorder on mobile for the position<br>sticky view, when in mobile on the canvas section we should not see the %40 with for the prose seciton.== |
| Full-width | Section has no `view` block     | 100% width, `max-w-4xl` content container with rich `CanvasProse` markdown |                                                                                                                                                                               |

## Heading Attributes

| Attribute      | Effect                                                             |
| -------------- | ------------------------------------------------------------------ |
| `{sticky}`     | Fires the section's `command` pipeline when it enters the viewport |
| `{dark}`       | Dark tint background for this section                              |
| `{full-bleed}` | Section stretches edge-to-edge; content centred at `max-w-md`      |

## DSL Blocks

Stripped from prose, never rendered as code.

| Block            | Purpose                                                                        |                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `` ```view ``    | Declares the sticky editor panel — source file, alignment, inline buttons      |                                                                                                                                                                                                                                                                                |
| `` ```command `` | Pipeline that fires automatically when the section scrolls into view           | ==this needs some work, right now we call this commend instead we need tow version, on scroll in, on scroll out.  (making sure the scroll out of the existing seciton alwasy fires before the scroll in of the next when scrolling down and the previous when scrolling up.)== |
| `` ```button ``  | Clickable button that fires a pipeline on click — rendered below section prose |                                                                                                                                                                                                                                                                                |

## Pipeline Actions

| Action | Effect |
|--------|--------|
| `set-source: <path>` | Swaps the editor content (supports `markdown/canvas/`, `markdown/collections/`, `wod/` paths) |
| `set-state: track` | Runs the compiled WOD block (opens in `view`, `dialog`, or `route` mode) |
| `navigate: <route>` | Pushes a new browser route |

### Open Modes

The `launch:` modifier on a button or pipeline step controls how the WOD block is surfaced.

| Value | Effect | Layout Layer |
|-------|--------|--------------|
| `view` *(default)* | Block runs inside the sticky editor panel in the current section | §7 — sticky panel, natural scroll |
| `dialog` | Block opens in a fullscreen overlay (`FullscreenTimer`) | §8 — `fixed inset-0 z-50` |
| `route` | Navigates to a new browser route via `useNavigate` | — |

## Layout System Integration

Canvas is a **content system** that sits inside the standard WOD Wiki layout primitives. The table below maps each Canvas layout concern to the corresponding rule in [`/docs/layout.md`](../../layout.md).

| Canvas Concern | Behaviour | `layout.md` Reference |
|---|---|---|
| **Outer shell** | Every Canvas route is rendered inside `SidebarLayout` — sticky sidebar on desktop, hamburger + inline nav on mobile | [§4.1 SidebarLayout](../../layout.md#41-web-app--sidebarlayout) |
| **Content column** | Canvas content renders inside the standard content card (`shadow-xl`, `ring-1`, `lg:rounded-[2.5rem]`, `3xl:max-w-7xl`) | [§5 Content Column & Max-Width](../../layout.md#5-content-column--max-width) |
| **`{full-bleed}` attribute** | Removes the content card's max-width constraint; canvas section stretches edge-to-edge with prose centred at `max-w-md` | [§5 Content Column & Max-Width](../../layout.md#5-content-column--max-width) |
| **Hero section** | The **first** `##` heading in the source markdown is treated as the page hero — it provides page metadata and is not rendered in the scrollable content flow; `sections.slice(1)` feeds the IntersectionObserver | [§4.2 Page-Shell Sticky Header](../../layout.md#42-page-shell-sticky-header) |
| **Section scroll tracking** | `{sticky}` triggers the section's `command` pipeline when it becomes the most-visible section. Uses `IntersectionObserver` with `rootMargin: -30% 0px -30% 0px` and thresholds `[0, 0.1, 0.25, 0.5, 0.75]` | [§6 Active Section Tracking](../../layout.md#6-active-section-tracking-intersectionobserver) |
| **Two-column sticky panel (desktop)** | The `view` panel uses `position: sticky` (`w-[60%] self-start sticky lg:flex`). The `SidebarLayout` parent applies `lg:overflow-clip` — **not** `overflow: hidden` — to preserve sticky behaviour while containing rounded corners | [§7 Scrolling Behaviour](../../layout.md#7-scrolling-behaviour) |
| **Two-column sticky panel (mobile)** | On mobile the desktop sticky panel is hidden (`lg:hidden`); a compact sticky bar appears at `sticky z-20` instead. Content flows in a single column | [§7 Scrolling Behaviour](../../layout.md#7-scrolling-behaviour) |
| **`launch: dialog`** | Opens `FullscreenTimer` at `fixed inset-0 z-50` with `bg-background/95 backdrop-blur-sm` — shares the overlay layer with timer and review dialogs | [§8 Overlay / Dialog Layer](../../layout.md#8-overlay--dialog-layer) |
| **Scrolling zone** | The main canvas scroll is natural document scroll (`window.scrollY`); the sticky view panel scrolls internally with `overflow-auto flex-1 min-h-0` | [§7 Scrolling Behaviour](../../layout.md#7-scrolling-behaviour) |

## State Management

`MarkdownCanvasPage` manages two tiers of state.

### URL State (`nuqs`)

| Param | Type | `history` | Purpose |
|-------|------|-----------|---------|
| `?h=` | `string` | `replace` + `shallow` | Slug of the most-visible content section. Written continuously by the IntersectionObserver; read once on mount to restore scroll position. |

### Local State (outside URL)

| State | Type | Purpose |
|-------|------|---------|
| `panelMode` | `'editor' \| 'running' \| 'review'` | Which panel is shown in the sticky view column. Resets to `'editor'` on navigation or page refresh — not persisted to the URL. |
| `viewTimerBlock` | `WodBlock \| null` | Block currently running inline in the view panel (triggered by `set-state: track` without `launch: dialog`). |
| `fullscreenBlock` | `WodBlock \| null` | Block open in the fullscreen dialog overlay (triggered by `launch: dialog`). |
| `reviewSegments` | `Segment[]` | Post-workout analytics segments; populated when a block completes in view mode. |
| `editorSource` | `string` | Current markdown/WhiteboardScript content in the `NoteEditor`. Updated by `set-source:` pipeline commands. |
| `editorOpacity` | `number` | Fade-transition value (0 → 1) during source swaps; provides smooth content crossfades. |

> **Note:** `panelMode` is deliberately ephemeral — a running workout is not bookmarkable via URL. If `launch: route` is used instead, the URL does change (new route).

## Collection README Pattern

Collection pages (`markdown/collections/{slug}/README.md`) use Canvas as a structured tutorial/walkthrough format:
- No `route:` frontmatter — route is auto-derived from folder name at build time
- Prose sections introduce each workout in the collection
- Each workout gets its own `##` heading with description, the WhiteboardScript as a fenced `wod` block (preserved as a code block in the prose via `CanvasProse`), and optionally a `button` to load/run it
- The sticky editor panel (`view` block) loads workout content on scroll via `command` blocks
