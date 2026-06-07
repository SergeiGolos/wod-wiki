# Landing Hero Redesign — "The Whiteboard Script" First Load

## What the user sees today

The first thing a visitor hits on `/` is the `PlaygroundLandingPage`, which renders
inside `LandingTemplate` (centered max-width, `max-w-7xl`). The top of the page is
the `AttentionWidget` ("Build and preview widget-driven workout pages…") followed by
a single grid section that pairs the `CodeExampleWidget` (a CodeMirror editor
showing the classic 20-minute AMRAP) with a column of `SyntaxGroupWidget`s.

The user is asking specifically about the **first loading section** — the
AttentionWidget + the 2-up grid underneath it. The single line of editable code in
that section is `// Type an exercise here (e.g. Pushups)`-equivalent, which in the
current build is the AMRAP snippet (4 lines, 5 with the fence). It does not pack a
punch. The descriptive copy ("Build and preview widget-driven workout pages") is
generic and not the "Whiteboard Script" pitch the user wants.

The user wants:

1. A descriptive **left** panel that explains the pitch in plain English.
2. An interactive **right** panel: a markdown editor showing a markdown document
   that contains a real `wod` block, with syntax highlighting and a Run button.
3. The pair must be responsive — phone users get the editor on top, descriptive
   text under, both scrollable, neither cramped.

The underlying data model that makes this pair honest is the **metric pipeline**
described in `docs/01-overview.md` and `docs/04-metric-lifecycle.md`: every
`wod` block parses into `CodeStatement` trees carrying `origin: 'parser'`
metrics; dialects, the JIT compiler, the runtime, the user, and the analytics
engine each add their own `origin` metrics on top. That is the *single currency*
the hero should telegraph.

---

## Five design directions

The two panels are fixed; what changes is what the left panel *says*, what the
right panel *shows* alongside the live editor, and how the pair collapses to
phone width.

### Idea 1 — "One Markdown file, four stages of truth"

**Pitch:** WOD Wiki is a single Markdown file that grows in meaning as you
plan, run, and review it — same text, four layers of metrics stacked on top.

**Left panel (descriptive):**

- Eyebrow: `THE WHITEBOARD SCRIPT`.
- Headline (one line): *"Write the workout. Run the workout. Read the workout —
  in the same file."*
- Three short paragraphs, each anchored to one stage of the pipeline
  (`docs/01-overview.md`):
  1. **Plan.** Fence your workout in a `wod` block — rounds, timers, reps, load,
     distance. The parser reads each line and emits a tree of `CodeStatement`s
     carrying `origin: 'parser'` metrics: the *target*.
  2. **Track.** When you start, the JIT-compiled blocks open spans on the
     `RuntimeClock`. Every interval, round, and pause adds `origin: 'runtime'`
     metrics next to the plan. Anything you type — actual reps, load, RPE —
     becomes a `user`-origin metric that wins display.
  3. **Analyze.** After the run, the analytics engine reads the
     `OutputStatement` stream and projects volume, distance, MET-minutes,
     session-load, and TIS back into the same MetricContainer. One file, four
     layers, no data model change.
- One inline callout: "All three layers live in the same Markdown — the metric
  pipeline is closed under 'produces metrics'."

**Right panel (interactive):**

- A read-only-looking but actually editable CodeMirror editor showing one
  document that demonstrates all three stages in miniature:

  ````markdown
  ---
  title: Thursday Conditioning
  ---

  ## Plan

  ```wod
  20:00 AMRAP
    5 Pullups
    10 Pushups
    15 Air Squats
  ```

  > *Plan metrics: 1 Effort, 3 Rep, 1 Duration*

  ## Track

  Round 4 — 7:42 elapsed — 56 reps
  :   `5 Pullups` `10 Pushups` `15 Air Squats` — RPE 8

  ## Analyze

  | Volume  | MET-min | TIS  |
  |--------:|--------:|-----:|
  | 0 kg    | 13.6    | 42   |
  ````

- A green **▶ Run this workout** button (re-using the existing CTA) that
  pushes the document into the playground and spins up the runtime.
- A small toggle above the editor: `Plan` / `Track` / `Analyze` — switching
  *highlights* the corresponding block in the document so the reader sees how
  the same file supports all three stages.

**Phone layout:** `grid-cols-1` below `md`; the two-column split only kicks in at
`lg` (≥1024px). The editor is the first child; the descriptive column scrolls
under it. The Plan/Track/Analyze toggle stays pinned to the top of the editor,
never on the side.

**Why it works:** the copy directly mirrors the `plan → track → analyze`
narrative in `docs/07-screens-and-workflow.md`, and the right panel is *the
actual document* — not a fake demo — so the editor, the runtime, and the
review grid all get exercised.

---

### Idea 2 — "Markdown in, metrics out"

**Pitch:** Every `wod` line becomes a typed, origin-stamped Metric. The editor
is the source; the metrics surface is the consequence.

**Left panel (descriptive):**

- Headline: *"From one Markdown file: a stream of metrics."*
- A vertical stepper that lists, in plain English, the five origin tiers
  (`docs/03-domain-model.md` §3.3) with a tiny inline code fragment for each:
  1. `parser` — *the plan* (tier 3)
     `20:00 AMRAP` → `Duration{300000ms}`, `Rounds{0, indefinite}`
  2. `dialect` — *semantic hint* (tier 2)
     `EMOM` → `Hint: workout.emom`
  3. `compiler` — *synthesized defaults* (tier 2)
     `CurrentRound = 1`
  4. `runtime` — *the truth* (tier 1)
     `Spans = [{0, 7420}]`, `Elapsed = 7.42s`
  5. `user` — *what you actually did* (tier 0)
     `Rep = 7`, `SessionRPE = 8`
- One sentence at the bottom: "Lower tier wins. So your real reps (tier 0)
  replace the planned 10 (tier 3) the moment you log them."

**Right panel (interactive):**

- CodeMirror editor showing a tabbed view: `wod` / `Metrics`. The `wod` tab is
  the editor (4–6 lines, AMRAP snippet). The `Metrics` tab is a live read-out
  — a small table that updates as the user types — with columns
  `Type | Value | Origin | Tier`. The data is computed by feeding the
  CodeMirror document to the existing `WhiteboardScript` parser on every
  change and flattening the `MetricContainer` to the rows.

**Phone layout:** same two-up story — editor on top, descriptive stepper
under it. The stepper collapses to a single accordion (`Show how metrics
emerge`) on `<sm` to keep vertical space for the editor.

**Why it works:** the right panel is the *punch* — the user sees their text
become metrics in real time. The left panel is the explanation of *why* that
matters. The tier model is the deepest invariant of the system (the precedence
table in `docs/03-domain-model.md` §3.3) and is rarely surfaced in the UI.

---

### Idea 3 — "Three playgrounds, one document"

**Pitch:** The same Markdown file drives three screens — editor, tracker,
review — and the metrics carry the story between them.

**Left panel (descriptive):**

- Headline: *"One file. Three surfaces. No data loss between them."*
- Three rows, each with a small screen-screenshot thumbnail (or, if the design
  avoids images, a wireframe chip) and a one-line description:
  1. **Editor (`/playground/:id`).** The `NoteEditor` parses `wod` blocks into
     `CodeStatement`s; live grammar highlighting in CodeMirror.
  2. **Tracker (`/run/:runtimeId`).** JIT-compiled blocks run on the
     `RuntimeClock`; `OutputStatement`s stream out with runtime + user
     metrics.
  3. **Review (`/review/:runtimeId`).** The analytics engine projects
     `analyzed`-origin compound metrics (volume, MET-min, TIS) and lays them
     over the same timeline.
- One inline note: "All three screens read the same Markdown file from
  IndexedDB; metrics are the only thing that changes."

**Right panel (interactive):**

- The Markdown editor (CodeMirror) again, but the surrounding chrome now
  shows three small tabs/labels: `Editor` `Track` `Review`. Tapping one
  doesn't navigate — it *re-renders* the right side of the right panel
  (a 1:1 mini-preview of the corresponding playground screen) below the
  editor. Default: editor preview only. The CTA `▶ Run this workout`
  is replaced by `Open in editor`, which routes to `/playground/:id`.

**Phone layout:** editor pinned to the top of the right column; the three
screen labels stack into a horizontal scroll-snap row under it
(`overflow-x: auto; scroll-snap-type: x mandatory`); descriptive column
scrolls under both, also `grid-cols-1` on `<sm`.

**Why it works:** the user sees the same file feeding three distinct UIs at
once — a direct visual answer to the question "what does this app actually
do?"

---

### Idea 4 — "Live: parser → compiler → runtime"

**Pitch:** the hero shows the actual pipeline running, in miniature, on a
realistic snippet.

**Left panel (descriptive):**

- Headline: *"The runtime you can see — and the one running your workout."*
- A short diagram, hand-drawn in SVG (no third-party diagram deps), of the
  six layers from `docs/05-architecture.md`:
  `markdown → grammar/parser → dialects → JIT compiler → runtime → analytics`.
  Each box is a real path under `src/`. The runtime box (`src/runtime/`)
  pulses; the analytics box lights up only after a Run.
- One line of copy under the diagram: "Click Run. The same code path that
  powers a live workout powers this preview."

**Right panel (interactive):**

- Editor showing a 6-line AMRAP snippet (the existing classic AMRAP example)
  plus a small, fixed-height console log below it.
- **Run this example** triggers the existing `createPlaygroundPage` flow,
  and the console log appends the same statements the parser emits:
  `parser: Rep(5) Effort("Pullups")`, `dialect: hint workout.amrap`,
  `compiler: CurrentRound(1)`, `runtime: Spans=[{0,4621}] Elapsed=4.621s`,
  `analyzed: Volume=0kg MET-min=2.1 TIS=12`.
- A `Reset` button next to Run clears the console.

**Phone layout:** editor → console (collapsible `<details>`) → descriptive
column. The SVG diagram is the only piece of the left column that needs
care; it scales by `viewBox` and never exceeds 240px tall. The right
column on phone is the editor + a "Show pipeline log" disclosure.

**Why it works:** the most concrete pitch in the set — the visitor sees
the actual engine print statements as they happen. The console is a
one-glance "this is real" signal that a static hero image can never
deliver.

---

### Idea 5 — "From `wod` to workout results in one document"

**Pitch:** the right panel is *the workout result*, not a demo. The
left panel narrates it.

**Left panel (descriptive):**

- Headline: *"One Markdown note. One workout result. One chart."*
- A short, narrated story in three numbered beats that each link to a real
  doc:
  1. You write a `wod` block (`docs/02-syntax-reference.md`). The note
     lives in the `notes` IndexedDB store.
  2. You run it. The runtime emits `OutputStatement`s with spans, elapsed,
     and round metrics; the result lands in the `results` store
     (`docs/07-screens-and-workflow.md` §7.5).
  3. You review it. The `analyzed` metrics (volume, MET-min, TIS) join
     the result in the `analytics` store, and the journal chart reads
     them back.
- One CTA at the bottom: "Open the syntax guide" → `/guide/syntax`.

**Right panel (interactive):**

- A vertically split panel:
  - **Top half:** the editable Markdown note (CodeMirror) with a `wod`
    block — the same AMRAP snippet.
  - **Bottom half:** a mini-review-grid preview: three rows
    (`09 Jun`, `02 Jun`, `26 May`) showing `reps | volume | TIS`. The rows
    are placeholders (clearly labeled "Sample" in muted text) — they
    exist to telegraph the workflow, not to lie about real data.
- **Run this example** creates the playground page and routes to
  `/playground/:id`; **See review** routes to `/review/:demoId` of a
  seeded sample.

**Phone layout:** the vertical split becomes a tabbed split
(`Note | Review`) on `<sm` so each half gets a full-width view. The
descriptive column scrolls under both, again as a single `grid-cols-1`
stack.

**Why it works:** the user sees the *output* of the app on the same
screen as the *input* — the strongest possible "this is a real app"
signal without requiring them to log a workout first.

---

## Phone-first checklist (applies to all five)

1. `grid-cols-1` below `md`; the two-column split only kicks in at `lg`
   (≥1024px). `md` is a single column with the editor on top.
2. The descriptive column collapses to an `<details>` accordion on `<sm`
   titled "About this snippet" so it never competes with the editor for
   vertical real estate.
3. The editor itself uses `min-height: 60vh` and `max-height: 80vh` on
   phone to keep the keyboard from covering the Run button.
4. The Run button is `sticky bottom-4` on phone only (`md:static`),
   always within thumb reach.
5. No fixed pixel widths on the right column; `min-w-0` on the editor
   parent to allow CodeMirror to shrink without overflowing.
6. The Plan/Track/Analyze (or equivalent stage) toggle uses
   `role="tablist"` + arrow-key navigation; it is the only interactive
   chrome on phone that should *not* collapse.
7. Editor font is `text-[15px] leading-6` on phone to stay readable
   without forcing a horizontal scroll for `:60` / `21-15-9` lines.
8. The dark-mode toggle stays in the top-right `actionsSlot`; on phone
   it moves into a sheet drawer that opens from the same corner, so
   it does not consume header height.

## Recommended direction

**Idea 1** is the cleanest expression of the project's core invariant
(one Markdown file, one Metric type, four origins) and reuses the most
existing surface (the editor + Run button). It also has the lightest
data plumbing: no live parser-to-table wiring, no SVG diagram, no
seeded review rows. Start there, and lift pieces of Ideas 2 (the live
`Metrics` tab) and 4 (the pipeline console) in a follow-up phase.
