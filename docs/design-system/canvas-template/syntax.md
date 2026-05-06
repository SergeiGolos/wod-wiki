# Route: `/syntax`

| | |
|--|--|
| **Route Pattern** | `/syntax`, `/syntax/basics`, `/syntax/structure`, `/syntax/protocols`, `/syntax/complex` |
| **Template** | [Canvas Page](canvas-template.md) |
| **Source Files** | `markdown/canvas/syntax/README.md` (index), `markdown/canvas/syntax/{topic}.md` (sub-pages) |

## Page Outline

This route serves as the central documentation for the WhiteboardScript syntax. It features an interactive index page plus four consolidated guide pages: core concepts, structure, protocols, and complex examples.

### Header Navigation (TSX Hardcoded)
The global `PageNavDropdown` (defined in `App.tsx`) shows the following links when on the `/syntax` index route:
- **Introduction** (id: `introduction`)
- **Statement Anatomy** (id: `anatomy`)
- **Timers & Direction** (id: `timers`)
- **Measuring Effort** (id: `metrics`)
- **Groups & Repeaters** (id: `groups`)
- **Protocols** (id: `protocols`)
- **Supplemental** (id: `supplemental`)
- **Document** (id: `document`)

*Note: There is a discrepancy between these hardcoded IDs and the actual slugified heading IDs in the markdown (e.g., `the-basics` vs `anatomy`).*

## Sections Outline (Index Page)

Sections are derived from `markdown/canvas/syntax/README.md`.

| Section | Slug (ID) | Sticky/Dark | Alignment | View Target |
|---------|-----------|-------------|-----------|-------------|
| **Syntax Reference** | `syntax-reference` | Sticky, Dark, Full-Bleed | Right | `preview` |
| **Core Concepts** | `core-concepts` | Sticky | Right | `preview` |
| **Structure & Rep Schemes** | `structure--rep-schemes` | Sticky | Right | `preview` |
| **Timers & Protocols** | `timers--protocols` | Sticky | Right | `preview` |
| **Complex Workouts** | `complex-workouts` | Sticky | Right | `preview` |
| **Start Writing** | `start-writing` | Sticky, Dark, Full-Bleed | - | - |

## Special Actions & Pipelines (Index Page)

### Loading Actions (Commands)
Each section swaps the `preview` view's source to the corresponding syntax example.

| Target | Pipeline Action | Value |
|--------|-----------------|-------|
| `preview` | `set-source` | `wods/syntax/basics.md`, `wods/examples/getting-started/groups-1.md`, `wods/examples/syntax/timers-1.md`, `wods/syntax/complex.md` |

### Button Actions
Buttons navigate to the detailed sub-page for each topic.

| Label | Pipeline Action | Value |
|-------|-----------------|-------|
| **Open Core Concepts →** | `navigate` | `/syntax/basics` |
| **Open Structure & Reps →** | `navigate` | `/syntax/structure` |
| **Open Timers & Protocols →** | `navigate` | `/syntax/protocols` |
| **New Workout Note →** | `set-source`, `set-state`, `launch` | `query:new`, `note`, `dialog` |
| **← Back to Home** | `navigate` | `/` |

## Sub-pages
Detailed sub-pages are rendered using the Canvas template and now group related topics into four guides: `/syntax/basics`, `/syntax/structure`, `/syntax/protocols`, and `/syntax/complex`. These pages follow the same scroll-driven pattern with interactive examples in the sticky view panel.

## State Management

Inherits the standard Canvas state model — see [Canvas Page](canvas-template.md#state-management). No page-specific overrides.

Sub-pages (`/syntax/:topic`) each create an independent `MarkdownCanvasPage` instance with their own `?h=` tracking and independent `panelMode` state — there is no shared URL state between the index and sub-pages.

## Layout Notes

Inherits all standard Canvas layout behaviour from [Canvas Page](canvas-template.md#layout-system-integration). No structural overrides on this route.

| Detail | Value |
|--------|-------|
| **Navigation IDs** | The `PageNavDropdown` in `App.tsx` hardcodes IDs (`introduction`, `anatomy`, `timers`, `metrics`, `groups`, `protocols`, `supplemental`, `document`). These must stay aligned with slugified headings in `syntax/README.md` — a current discrepancy exists (e.g. `anatomy` vs `the-basics`). |
| **`launch: dialog`** | The "New Workout Note →" button uses `launch: dialog` — opens `FullscreenTimer` at `z-50` per [layout.md §8](../../layout.md#8-overlay--dialog-layer). |
| **Sub-page shell** | Each `/syntax/:topic` sub-page is an independent `MarkdownCanvasPage` instance with its own IntersectionObserver; it shares the same `SidebarLayout` wrapper as the index page. |
