# Route: `/getting-started`

| | |
|--|--|
| **Route** | `/getting-started` |
| **Template** | [Canvas Page](../templates/canvas.md) |
| **Source File** | `markdown/canvas/getting-started/README.md` |

## Page Outline

This route provides an interactive tutorial ("Zero to Hero") using the Canvas template to guide users through the WodScript syntax and runtime.

### Header Navigation (TSX Hardcoded)
The global `PageNavDropdown` (defined in `App.tsx`) shows the following links when on the `/getting-started` route:
- **Introduction** (id: `introduction`)
- **First Statement** (id: `statement`)
- **Timers** (id: `timer`)
- **Metrics** (id: `metrics`)
- **Groups** (id: `groups`)
- **Protocols** (id: `protocols`)
- **Notebook** (id: `notebook`)

*Note: There is a discrepancy between these hardcoded IDs and the actual slugified heading IDs in the markdown (e.g., `step-1-your-first-movement` vs `statement`).*

## Sections Outline

Sections are derived from `markdown/canvas/getting-started/README.md`.

| Section | Slug (ID) | Sticky/Dark | Alignment | View Target |
|---------|-----------|-------------|-----------|-------------|
| **Zero to Hero** | `zero-to-hero` | Sticky, Dark, Full-Bleed | Right | `z2h` |
| **Step 1 — Your First Movement** | `step-1-your-first-movement` | Sticky | Right | `z2h` |
| **Step 2 — Add Reps and Load** | `step-2-add-reps-and-load` | Sticky | Right | `z2h` |
| **Step 3 — Your First Timer** | `step-3-your-first-timer` | Sticky | Right | `z2h` |
| **Step 4 — Rounds and Groups** | `step-4-rounds-and-groups` | Sticky | Right | `z2h` |
| **Step 5 — Your First AMRAP** | `step-5-your-first-amrap` | Sticky | Right | `z2h` |
| **Step 6 — Save and Review** | `step-6-save-and-review` | Sticky | Right | `z2h` |
| **What's Next** | `whats-next` | Sticky, Dark, Full-Bleed | - | - |

## Special Actions & Pipelines

The following interactive actions are defined within the markdown blocks:

### Loading Actions (Commands)
Executed automatically when the section scrolls into view.

| Target | Pipeline Actions |
|--------|------------------|
| `z2h` | `set-source: wods/examples/getting-started/statement-1.md`, `set-state: note` |
| `z2h` | `set-source: wods/examples/getting-started/metrics-1.md`, `set-state: note` |
| `z2h` | `set-source: wods/examples/getting-started/timer-1.md`, `set-state: note` |
| `z2h` | `set-source: wods/examples/getting-started/groups-1.md`, `set-state: note` |
| `z2h` | `set-source: wods/examples/getting-started/protocols-1.md`, `set-state: note` |
| `z2h` | `set-source: wods/examples/getting-started/protocols-1.md`, `set-state: review` |

### Button Actions
Rendered as interactive buttons within or below the prose.

| Label | Target | Pipeline Actions |
|-------|--------|------------------|
| **Try This →** | `z2h` | `set-state: track` |
| **See the Results View** | `z2h` | `set-state: review` |
| **Explore the Full Syntax →** | `z2h` | `navigate: /syntax` |
| **Open a New Note →** | `z2h` | `set-source: query:new`, `set-state: note`, `launch: dialog` |
