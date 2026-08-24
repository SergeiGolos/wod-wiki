# Screens and Workflow

WOD Wiki is built around a continuous loop: **Plan → Track → Analyze**. The same metric shape flows through every phase.

## Plan

### Editor

- `/note/:category/:name`
- `/playground/:id`

Freeform Markdown plus runnable `time` blocks. The CodeMirror editor provides syntax highlighting, autocomplete, and inline error hints.

### Plan screen

- `/plan`

Assemble a session by combining notes, blocks, and recent work.

### Library

- `/library` (replaces `/journal`, `/collections`, `/feeds` as the entry point)

Browse three kinds of **entries**:

- **Note** — a user-owned journal note
- **Session** — a named, undated workout from a catalog
- **Post** — a dated workout entry from a feed catalog

The WQL Composer Panel lets you filter by source, text, time range, and tags.

### Efforts

- `/efforts`
- `/effort/:slug`

The Movement Registry. Define exercises with MET, discipline, aliases, and derivation rules. Used by autocomplete and analytics.

## Track

### Run / Clock

- `/run/:runtimeId`

The JIT-compiled block runs on the runtime clock. The screen shows:

- Current movement / timer
- Next preview
- Round counter
- **Next** button to advance
- **Cast** button to mirror to a Chromecast or local tab

Every advance records elapsed time and any logged values as runtime/user metrics.

### Cast

- `ChromecastBackend` — production; native device picker + WebRTC over Cast message channel
- `LocalTabBackend` — dev/dual-pane preview; opens a popup tab

Controlled by `VITE_CAST_BACKEND` at build time.

## Analyze

### Review

- `/review/:runtimeId`

Per-segment results table with planned vs actual metrics.

### Analytics

- `/analytics`
- `/analytics/dashboard`

Query the journal with WQL, compose dashboards, and view trends.

### Journal / Library

Long-term history. Results for the same **Block Content Id** aggregate across notes and dates.

## Core app modules

### Workbench Session

A pure Zustand store that owns:

- open note content and parsed document
- active view and selected block
- running runtime and execution state
- accumulated analytics and results

It delegates lifecycle-bound work to **Workbench Effects**.

### Workbench Effect

A renderless React adapter for things a plain store cannot own:

- runtime create / dispose
- wake lock
- before-unload guards
- unmount reset
- reading route params into the session

### Result Recorder

`createResultRecorder(sink)` is the single seam for persisting a `WorkoutResult`. It resolves:

- note identity
- block content id
- section id against the destination note

### Block Content Id

A content-stable hash of a block's fenced content. It survives clone/reorder/edit-above, so results keyed by it stay linked to the right workout.

## Routing quick reference

| Route | Purpose |
| ------- | --------- |
| `/` | Home page / product walkthrough |
| `/library` | Unified browse/search entry point |
| `/journal/:date` | Journal date detail |
| `/journal/:date/:uuid` | Specific journal note |
| `/collections/:cat` | Catalog listing |
| `/collections/:cat/:workout` | Catalog workout detail |
| `/feeds/:feedSlug` | Feed listing |
| `/feeds/:feedSlug/:date/:item` | Feed post detail |
| `/note/:category/:name` | Open a note in the editor |
| `/playground/:id` | Open a playground note |
| `/run/:runtimeId` | Execute a workout |
| `/review/:runtimeId` | Review a completed workout |
| `/analytics` | Analytics explorer |
| `/analytics/dashboard` | Dashboard grid |
| `/efforts` | Movement registry list |
| `/effort/:slug` | Movement detail |

## See also

- [`home-page-walkthrough.md`](./home-page-walkthrough.md) — detailed home page slide reference
