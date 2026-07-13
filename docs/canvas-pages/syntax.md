# Syntax Reference Index — `/guide/syntax`

**Source:** `markdown/canvas/syntax/README.md`  
**Frontmatter type:** `syntax`  
**Template:** canvas (split-canvas: sticky prose left, live editor right)

The `/guide/syntax` page is the **reference map** for WOD Wiki's workout syntax. It has no chapter badge and no quests of its own; instead, each section previews a concept and links to the matching tutorial page, where the actual quests and badge progression live.

> The index is distinct from the tutorial pages (`/guide/syntax/basics`, `/guide/syntax/structure`, etc.) and from the home page (`/`), which is the main quest-driven entry point.

---

## Live example panel

The page declares a single shared `preview` view on the right-hand panel:

```view
name:    preview
state:   note
source:  wods/examples/syntax/core-rules.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

Every section uses a `command` block to swap the editor source into that `preview` panel, and a `button` block to navigate to the related tutorial page. There is no "Try It →" timer start on the index itself.

---

## Index sections

| Section | Summary | Source swapped into `preview` | Links to |
|---|---|---|---|
| **Syntax Reference** | Page header and orientation. | default `wods/examples/syntax/core-rules.md` | — |
| **Core Concepts** | `wod` fences, one statement per line, measurements, effort notes, actions, comments, timer modifiers. | `wods/examples/syntax/core-rules.md` | `/guide/syntax/basics` |
| **Dialect Examples** | Fence types as intent signals: `wod`, `log`, `plan`, `climb`. | `wods/examples/syntax/dialect-climb-bouldering.md` | `/guide/syntax/dialects` |
| **Structure & Rep Schemes** | Rounds, named groups, nested groups, mixed sections, rep schemes. | `wods/examples/getting-started/groups-1.md` | `/guide/syntax/structure` |
| **Timers & Protocols** | Time prefixes, rest, AMRAP, EMOM, Tabata, custom intervals, distance intervals. | `wods/examples/syntax/timers-rest.md` | `/guide/syntax/protocols` |
| **Advanced · Complex Workouts** | Nested protocols, full sessions, barbell cycling, partner workouts. | `wods/examples/syntax/complex-nested-protocols.md` | `/guide/syntax/complex` |
| **Custom Metrics & Calculations** | Inline JSON metrics and document-level `calculate` blocks. | `wods/examples/syntax/custom-metrics-1.md` | `/guide/syntax/custom-metrics` |
| **Start Writing** | Call to action to open a blank note. | `query:new` (dialog) | new workout note dialog |

The final section also includes a **← Back to Home** button that navigates to `/`.

---

## Example pattern: source swap + navigation

Each index section follows the same two-block pattern. For example, the Core Concepts section:

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/core-rules.md
```

```button
label:  Open Core Concepts →
target: preview
pipeline:
  - navigate: /guide/syntax/basics
```

The `command` block loads a representative example file into the `preview` panel. The `button` block navigates the user to the tutorial page where the full section, runnable examples, and quests are located.

---

## Crosslinks to tutorial pages

The index maps one-to-one to the six tutorial pages that carry quests and chapter badges:

| Index section | Tutorial page | Chapter badge | Quests |
|---|---|---|---|
| Core Concepts | `/guide/syntax/basics` | basics (`trophy`) | `basics-movement`, `basics-reps`, `basics-load` |
| Structure & Rep Schemes | `/guide/syntax/structure` | structure (`blocks`) | `structure-rounds`, `structure-repscheme` |
| Timers & Protocols | `/guide/syntax/protocols` | protocols (`timer`) | `protocols-timer`, `protocols-rounds`, `protocols-tag` |
| Advanced · Complex Workouts | `/guide/syntax/complex` | complex (`puzzle`) | `complex-time`, `complex-rounds` |
| Custom Metrics & Calculations | `/guide/syntax/custom-metrics` | custom-metrics (`activity`) | `metrics-custom`, `metrics-calc` |
| Dialect Examples | `/guide/syntax/dialects` | dialects (`file-text`) | `dialects-log`, `dialects-climb` |

---

## Challenges and accomplishment

- **Quests defined on the index:** none.
- **Chapter blocks on the index:** none.
- **Accomplishment on the index itself:** none directly.
- **How progress is measured:** quests are completed on the linked tutorial pages via `useSyntaxChallenge` validating live editor content against each quest schema. The index only routes users to those pages; it does not track completion.

The tutorial pages use a shared `ex` view (instead of the index's `preview` view) and pair each `command` source swap with a `button` that calls `set-state: track` to run the example.
