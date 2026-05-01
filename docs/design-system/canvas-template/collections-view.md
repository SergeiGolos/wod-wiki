# Route: `/collection/:slug`

|                   |                                                                       |
| ----------------- | --------------------------------------------------------------------- |
| **Route Pattern** | `/collection/:slug` (e.g., `/collections/dan-john`)                   |
| **Template**      | [Canvas Page](design-system/canvas-template/_template.md)                                           |
| **Shell**         | `CanvasPage` (title-bar mode) via `App.tsx`                           |
| **Component**     | `MarkdownCanvasPage` (`playground/src/canvas/MarkdownCanvasPage.tsx`) |
| **Source File**   | `markdown/collections/{slug}/README.md`                               |

## Description

Each collection slug resolves to a scroll-driven Canvas page built from its `README.md`. The page acts as a **curated tutorial or catalog** for a specific training methodology — introducing the philosophy, walking through individual workouts with inline WodScript blocks, and finishing with a full list of the collection's files.

Unlike other Canvas pages, collection routes are **auto-generated from folder structure** — no `route:` key in frontmatter is needed.

## Automatic Routing

Collection routes are derived at build time from the `markdown/collections/` directory:

```
markdown/collections/dan-john/README.md  →  /collections/dan-john
markdown/collections/crossfit-girls/README.md  →  /collections/crossfit-girls
```

`App.tsx` uses `findCanvasPage(location.pathname)` to match the current path against all parsed canvas pages and passes the result to `MarkdownCanvasPage` as the `page` prop.

## Page Outline

### Shell — `CanvasPage` (title-bar mode)
`App.tsx` wraps `MarkdownCanvasPage` in `CanvasPage` with the collection name as the title and the standard nav-link index:

```tsx
<CanvasPage title={currentWorkout.name} index={currentNavLinks} …>
  <MarkdownCanvasPage page={canvasPage} wodFiles={…} … />
</CanvasPage>
```

### Hero Section
The **first `##` heading** in the collection's `README.md` is treated as the Canvas hero — it supplies page metadata (`title`, `route`, optional `description`) and is not rendered in the scrollable content flow. All subsequent headings become scrollable content sections.

### Layout Mode
Most collection READMEs contain **no `view` block**, so every section renders in **full-width Canvas mode** (100% width, `max-w-4xl` centred prose). There is no sticky split-panel and IntersectionObserver `command` pipelines do not fire unless a `{sticky}` attribute is present.

### Section Pattern
A typical collection `README.md` follows this structure:

| Section | Content |
|---------|---------|
| **Collection Header** (`##`) | Hero section — title, author, philosophy. Not rendered in content flow. |
| **Overview** (`##`) | Introduction to the training methodology. Full-width prose. |
| **Workout entries** (`##` per workout) | Description, `wod` block (rendered as code), optional summary table. |
| **"Collection Workouts" (auto)** | Injected by `MarkdownCanvasPage.tsx` — see below. |

### Auto-Injected "Collection Workouts" Section

`MarkdownCanvasPage` automatically appends a **Collection Workouts** list at the bottom of every collection page:

```
isCollection && workoutItems.filter(item => item.category === slug)
```

Each item in the list is a clickable row. Clicking triggers the `onSelect` callback in `App.tsx`, which navigates to the [Workout Editor](workout.md) for that file. This navigation is handled at the router level — it is not a Canvas pipeline action.

## Active Collections

| Slug | Methodology |
|------|-------------|
| `dan-john` | Kettlebell strength & simplicity. |
| `geoff-neupert` | Kettlebell complexes and "Easy Muscle". |
| `crossfit-girls` | Classic CrossFit "Girl" benchmarks. |
| `crossfit-games - 20xx` | Annual CrossFit Games workouts (2020–2024). |
| `swimming-*` | Specialized swim programming (7 skill-level categories). |
| `syntax` | Interactive examples of every WodScript feature. |

## DSL Usage in Collections

Collection `README.md` files use a constrained subset of the Canvas DSL:

### Inline WodScript (`wod` block)
WodScript is fenced as a `wod` block inside the markdown. `CanvasProse` renders it as a styled code block — it is **not** compiled at read time.

```markdown
```wod
5 Rounds
10 KB Swings 24kg
5 Push Press 24kg
```
```

### Link Patterns
- `[Label](wod:path/to/workout)` — deep link to a specific workout file.
- `[Label](file:path/to/file)` — link to a supplemental file (e.g., GPX/TCX for swim/run routes).

### Button Pipelines (rare)
Some collections include `button` DSL blocks to load a workout into the sticky editor panel or launch it directly:

```markdown
```button
label: Try This →
set-source: wods/collections/dan-john/simple-sinister.md
set-state: track
```
```

## State Management

### URL State

| Param | Mechanism | `history` | Purpose |
|-------|-----------|-----------|---------|
| `?s=` | `nuqs` via `CanvasPage` | `push` | Active TOC section ID; written by `scrollToSection` and the IntersectionObserver. |
| `?h=` | `nuqs` via `MarkdownCanvasPage` | `replace` + shallow | Most-visible content section slug; updated by IntersectionObserver. |

### Local State (outside URL)

Inherits the standard Canvas local state — see [Canvas Page](_template.md#state-management).

Because most collection pages have no `view` block, `panelMode` stays permanently at `'editor'` and `editorSource` is never updated by `set-source:` commands — the sticky view panel is absent from the render tree.

| State | Type | Value in collections |
|-------|------|---------------------|
| `panelMode` | `'editor' \| 'running' \| 'review'` | Always `'editor'` (no `view` block to trigger transitions). |
| `editorSource` | `string` | Initialised from the first `view` block source; empty when none is present. |
| `viewTimerBlock` | `WodBlock \| null` | `null` — no inline runtime in standard collection pages. |
| `fullscreenBlock` | `WodBlock \| null` | Set when a `button` with `launch: dialog` is clicked. |

## Layout Notes

Inherits all standard Canvas layout behaviour from [Canvas Page](_template.md#layout-system-integration). The following notes apply specifically to collection routes.

| Detail | Value |
|--------|-------|
| **Full-width default** | No `view` block → full-width Canvas mode, `max-w-4xl` centred prose, no sticky split-panel. |
| **Auto-routing** | Route is derived from folder name at build time. No `route:` frontmatter key is needed or used. |
| **`SidebarLayout` wrapper** | The outer `SidebarLayout` shell is still applied by `App.tsx` — the sidebar, sticky nav, and theme controls are all present. |
| **"Collection Workouts" injection** | Appended by `MarkdownCanvasPage.tsx`; navigation is a router-level `onSelect` callback, not a Canvas pipeline action. |

## Related

- [Collections Index](../queriable-list/collections-list.md) — the `/collections` directory page that lists all collections
- [Workout Editor](../note-workspace/workout.md) — the destination when a workout row is selected
- [Canvas Page template](_template.md) — the full Canvas DSL reference
