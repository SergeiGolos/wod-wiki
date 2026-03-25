# Route: `/` (Home)

| | |
|--|--|
| **Route** | `/` |
| **Template** | [Canvas Page](../templates/canvas.md) |
| **Source File** | `markdown/canvas/home/README.md` |
| **Component** | `HomeView` (wraps `HomeHero` + `CanvasPage`) |

## Page Outline

The Home route uses a wrapper component `HomeView` to prepend a specialized Hero section before the standard Canvas content.

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `HomeView` | `playground/src/views/HomeView.tsx` | Main view wrapper; renders `HomeHero` and `CanvasPage`. |
| `HomeHero` | `playground/src/components/HomeHero.tsx` | Visual splash with value pillars; provides quick-scroll links to content sections. |
| `CanvasPage`| `playground/src/canvas/CanvasPage.tsx` | Renders the scroll-driven interactive markdown content. |

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
