# Route: `/` (Home)

| | |
|--|--|
| **Route** | `/` |
| **Template** | [Canvas Page](canvas-template.md) |
| **Source File** | `markdown/canvas/home/README.md` |
| **Component** | `HomeView` (wraps `HomeHero` + `MarkdownCanvasPage`) |

## Page Outline

The Home route uses a wrapper component `HomeView` to prepend a specialized Hero section before the standard Canvas content.

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `HomeView` | `playground/src/views/HomeView.tsx` | Main view wrapper; renders `HomeHero` and `MarkdownCanvasPage`. |
| `HomeHero` | `playground/src/components/HomeHero.tsx` | Visual splash with value pillars; provides quick-scroll links to content sections. |
| `MarkdownCanvasPage`| `playground/src/canvas/MarkdownCanvasPage.tsx` | Renders the scroll-driven interactive markdown content. |

### Header Navigation (TSX Hardcoded)
The global `PageNavDropdown` (defined in `App.tsx`) shows the following links when on the Home route:
- **Live Demo** (id: `editor`)
- **Features** (id: `features`)
- **Library** (id: `explore`)
- **Getting Started** (id: `deep-dive`)

## Sections Outline

Sections are derived from `markdown/canvas/home/README.md`.

| Section | Slug (ID) | Sticky/Dark | Alignment | View Target |
|---------|-----------|-------------|-----------|-------------|
| **WOD Wiki** | `wod-wiki` | Sticky, Dark, Full-Bleed | Right | `hero-demo` |
| **Live Demo** | `editor` | Sticky | Right | `write-demo`, `track-demo`, `review-demo` |
| **Features** | `features` | Full-Bleed, Dark | - | - |
| **Browse the Library** | `explore` | Sticky | Full | `browse-demo` |
| **Ready to write your own?** | `deep-dive` | Full-Bleed, Dark | - | - |
| **Start your training journal** | `journal-cta` | Full-Bleed | - | - |

## Tone & Voice

- **Confident, direct.** Coaches don't hedge.
- **Specific.** "10 Kettlebell Swings 24kg" not "your exercise."
- **No jargon** until the syntax docs section.
- **Short sentences.** Write like a whiteboard, not a manual.

## State Management

Inherits the standard Canvas state model — see [Canvas Page](canvas-template.md#state-management). No page-specific overrides.

`HomeView` adds no additional state; `HomeHero` is a purely presentational component with no URL or local state of its own.

Inherits all standard Canvas layout behaviour from [Canvas Page](canvas-template.md#layout-system-integration). The following overrides apply to this route specifically:

| Override | Detail |
|----------|--------|
| **Wrapper component** | `HomeView` (`playground/src/views/HomeView.tsx`) wraps `HomeHero` **above** `MarkdownCanvasPage`. `HomeHero` is a React component — not a Canvas section — and renders before any Canvas content begins. |
| **Hero section** | The `WOD Wiki` heading in `home/README.md` is the Canvas hero (`sections[0]`). It is **not** rendered in the scrollable content flow — `HomeHero` visually substitutes it. |
| **Navigation IDs** | The `PageNavDropdown` in `App.tsx` hardcodes anchor IDs (`editor`, `features`, `explore`, `deep-dive`). These must match the slugified headings in `home/README.md`. |
