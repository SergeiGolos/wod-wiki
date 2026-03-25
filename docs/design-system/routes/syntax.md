# Route: `/syntax`

| | |
|--|--|
| **Route Pattern** | `/syntax`, `/syntax/:topic` |
| **Template** | [Canvas Page](../templates/canvas.md) |
| **Source Files** | `markdown/canvas/syntax/README.md` (index), `markdown/canvas/syntax/{topic}.md` (sub-pages) |

## Page Outline

This route serves as the central documentation for the WodScript syntax. It features an interactive index page and over 60 detailed sub-pages.

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
| **The Basics** | `the-basics` | Sticky | Right | `preview` |
| **Timers and Intervals** | `timers-and-intervals` | Sticky | Right | `preview` |
| **Rep Schemes** | `rep-schemes` | Sticky | Right | `preview` |
| **Rounds and Groups** | `rounds-and-groups` | Sticky | Right | `preview` |
| **AMRAP** | `amrap` | Sticky | Right | `preview` |
| **EMOM** | `emom` | Sticky | Right | `preview` |
| **Tabata and Intervals** | `tabata-and-intervals` | Sticky | Right | `preview` |
| **Rest Periods** | `rest-periods` | Sticky | Right | `preview` |
| **Measurements** | `measurements` | Sticky | Right | `preview` |
| **Supplemental Data** | `supplemental-data` | Sticky | Right | `preview` |
| **Complex Workouts** | `complex-workouts` | Sticky | Right | `preview` |
| **Start Writing** | `start-writing` | Sticky, Dark, Full-Bleed | - | - |

## Special Actions & Pipelines (Index Page)

### Loading Actions (Commands)
Each section swaps the `preview` view's source to the corresponding syntax example.

| Target | Pipeline Action | Value |
|--------|-----------------|-------|
| `preview` | `set-source` | `wods/syntax/basics.md`, `wods/syntax/timers.md`, etc. |

### Button Actions
Buttons navigate to the detailed sub-page for each topic.

| Label | Pipeline Action | Value |
|-------|-----------------|-------|
| **Open Basics Guide →** | `navigate` | `/syntax/basics` |
| **Open Timers Guide →** | `navigate` | `/syntax/timers` |
| **New Workout Note →** | `set-source`, `set-state`, `launch` | `query:new`, `note`, `dialog` |
| **← Back to Home** | `navigate` | `/` |

## Sub-pages (`/syntax/:topic`)
Detailed sub-pages (e.g., `/syntax/basics`) are also rendered using the Canvas template, typically loading a specific markdown file from `markdown/canvas/syntax/`. These pages follow the same scroll-driven pattern with interactive examples in the sticky view panel.
