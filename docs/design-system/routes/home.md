# Route: `/` (Home)

| | |
|--|--|
| **Route** | `/` |
| **Template** | [Canvas Page](../templates/canvas.md) |
| **Source File** | `markdown/canvas/home/README.md` |
| **Component** | `HomeView` (wraps `HomeHero` + `CanvasPage`) |

## Page Outline

The Home route is unique as it uses a wrapper component `HomeView` to prepend a specialized Hero section before the standard Canvas content.

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `HomeView` | `playground/src/views/HomeView.tsx` | Main view wrapper; renders `HomeHero` and `CanvasPage`. |
| `HomeHero` | `playground/src/components/HomeHero.tsx` | Visual splash with feature cards; provides quick-scroll links to content sections. |
| `CanvasPage`| `playground/src/canvas/CanvasPage.tsx` | Renders the scroll-driven interactive markdown content. |

### Header Navigation (TSX Hardcoded)
The global `PageNavDropdown` (defined in `App.tsx`) shows the following links when on the Home route:
- **Plan** (id: `editor`)
- **Track** (id: `tracker`)
- **Metrics** (id: `review`)
- **Notebook** (id: `notebook`)
- **Next Steps** (id: `next-steps`)

*Note: There is a discrepancy between these hardcoded IDs and the actual slugified heading IDs in the markdown (e.g., `write` vs `editor`).*

## Sections Outline

Sections are derived from `markdown/canvas/home/README.md`.

| Section | Slug (ID) | Sticky/Dark | Alignment | View Target |
|---------|-----------|-------------|-----------|-------------|
| **WOD Wiki** | `wod-wiki` | Sticky, Dark, Full-Bleed | Right | `hero-demo` |
| **Write** | `write` | Sticky | Right | `write-demo` |
| **Track** | `track` | Sticky | Right | `track-demo` |
| **Review** | `review` | Sticky | Right | `review-demo` |
| **Get Started** | `get-started` | Sticky, Dark, Full-Bleed | - | - |

## Special Actions & Pipelines

The following interactive actions are defined within the markdown blocks:

### Loading Actions (Commands)
Executed automatically when the section scrolls into view.

| Target        | Pipeline Actions                                                              |
| ------------- | ----------------------------------------------------------------------------- |
| `write-demo`  | `set-source: wods/examples/getting-started/statement-1.md`, `set-state: note` |
| `track-demo`  | `set-source: wods/examples/getting-started/timer-1.md`, `set-state: track`    |
| `review-demo` | `set-source: wods/examples/getting-started/groups-1.md`, `set-state: review`  |

### Button Actions
Rendered as interactive buttons within or below the prose.

| Label | Target | Pipeline Actions | Open Mode |
|-------|--------|------------------|-----------|
| **Try It Live** | `hero-demo` | `set-state: track` | - |
| **Open Today's Workout** | `hero-demo` | `set-source: query:today`, `set-state: note` | `dialog` |
| **See It Run** | `track-demo` | `set-state: track` | `view` |
| **Zero to Hero →** | `hero-demo` | `navigate: /zero-to-hero` | - |
| **Browse the Syntax →** | `hero-demo` | `navigate: /syntax` | - |
