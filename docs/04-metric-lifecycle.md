# 04 — The Lifecycle of a Metric

This is the central narrative of the system: follow **one quantity** as it moves
through every element of the application, gaining new representations at each stage but
never losing the earlier ones. Read [03 — Domain Model](./03-domain-model.md) first for
the `IMetric` shape and the `origin` precedence tiers.

We'll trace a single line:

```wod
(5)
  8 KB Deadlift 16kg
```

---

## Stage 0 — Source text

The line exists only as characters in a Markdown file. The fenced `wod` block is
located by the Markdown layer and handed to the parser.

## Stage 1 — Parse → planned metrics (`origin: 'parser'`)

The lezer grammar (`src/grammar/whiteboardscript.grammar`) tokenizes the line and
`src/parser/` builds **CodeStatements**. The `8 KB Deadlift 16kg` statement gets a
MetricContainer with:

| Metric | type | origin | value |
|--------|------|--------|-------|
| reps | `Rep` | `parser` | `8` |
| effort | `Effort` | `parser` | `"KB Deadlift"` |
| load | `Resistance`/`Load` | `parser` | `16`, unit `kg` |

Its parent `(5)` statement gets a `Rounds` metric (`value: 5`, origin `parser`). These
metrics are **the plan** — the lowest precedence tier (3). Source location is retained
in `meta` so the editor can map metrics back to text.

## Stage 2 — Dialect analysis → hints + dialect metrics (`origin: 'dialect'`)

Each registered **dialect** (`src/dialects/`) inspects the statement and returns a
`DialectAnalysis`. The `CardioDialect`/`WodDialect` recognize the load-bearing
kettlebell movement and attach **hints** (`Set<string>` on the statement, e.g.
`behavior.load_bearing`, `domain.wod`). A dialect may also inject metrics with
`origin: 'dialect'` and an `action` of `set`/`suppress`/`inherit` — for example an
`inherit` load metric so child reps know the resistance, or a default that fills a gap
the author left implicit.

The **Effort Registry** (doc 08) can resolve `"KB Deadlift"` to a canonical effort
slug (`exerciseId` on the statement), which later supplies MET and discipline factors.

## Stage 3 — JIT compile → block + maybe compiler metrics (`origin: 'compiler'`)

The **JitCompiler** (`src/runtime/compiler/`) runs its **strategies** in priority
order against the statements. For `(5)` wrapping an effort, strategies assemble a block
that has:

- a **rounds** capability (loop 5×),
- **timing** capability (span tracking),
- **reporting** capability (emit outputs).

If a strategy needs a metric that wasn't in the source (e.g. a synthesized
`CurrentRound` starting at 1, or a normalized duration), it adds it with
`origin: 'compiler'`. The output is an `IRuntimeBlock` carrying `IRuntimeBehavior[]`.

➡ How strategies pick behaviors: [06 — Interfaces & Implementations](./06-interfaces-and-implementations.md).

## Stage 4 — Execute → tracked metrics (`origin: 'runtime'`)

The block is pushed onto the **RuntimeStack** and driven by the **RuntimeClock**.

- On **mount**, `SpanTrackingBehavior` (or a timer behavior) opens a **TimeSpan**
  using the clock's `now`. A `Spans` metric (`origin: 'runtime'`) is written to block
  memory.
- On **pause/resume**, spans are closed and new ones opened — so paused time is
  excluded from **Elapsed** but included in **Total**.
- On **round advance**, a `CurrentRound` metric updates and the block re-mounts the
  effort for the next round.
- On **unmount/complete**, `ReportOutputBehavior` reads the timer memory, computes
  `Elapsed`/`Total` from the spans, and emits an **OutputStatement** carrying
  `Spans`, `Elapsed`, `Total`, `SystemTime`, and `CurrentRound` metrics — all
  `origin: 'runtime'`.

At this point the planned `8 reps @ 16kg` (tier 3) coexists with what actually
happened (tier 1). If the athlete edits the reps to the real number completed, that
becomes a `user`-origin metric (tier 0) and wins display.

## Stage 5 — Persist → WorkoutResult

The emitted OutputStatements are written to **IndexedDB** (`src/services/db/IndexedDBService.ts`)
in the `results` store (`WorkoutResult`, keyed by id, indexed by segment / note /
completedAt). The plan note lives in `notes`, structural slices in `segments`. The
metrics travel with the result.

## Stage 6 — Analyze → compound metrics (`origin: 'analyzed'`)

The **AnalyticsEngine** (`src/core/analytics/AnalyticsEngine.ts`) consumes the
OutputStatement stream in two passes:

1. **Realtime processors** (`IRealtimeProcessor`) enrich each output as it lands:
   - `PaceEnrichmentProcess` → `pace`/`speed` from `Distance` + `Elapsed`.
   - `PowerEnrichmentProcess` → `power`/`work` from `Load` + `Rep` + time.
   - `TwoPassEffortResolutionProcess` → binds the output to a registry effort so MET
     and discipline factors are available downstream.
2. **Summary processors** (`ISummaryProcessor`) project across the whole session:
   - `VolumeProjectionEngine` → `Volume` (reps × load, here 5 × 8 × 16 kg).
   - `DistanceProjectionEngine` → total distance.
   - `MetMinuteProjectionEngine` → `METScore`/MET-minutes from effort MET × active time.
   - `SessionLoadProjectionEngine` → `SessionLoad` (RPE × minutes).
   - `TISProcessor` → composite `TIS` (Training Intensity Score).

Each derived value is itself an `IMetric` with `origin: 'analyzed'`. Our deadlift line
now contributes to a session **Volume** of `640 kg` and a slice of **MET-minutes**.

## Stage 7 — Re-analyze → analytics over compound metrics

Because the analyzed outputs are ordinary metrics, the analysis surfaces (review grid,
charts, journal trends) **run further queries over them**: weekly volume, intensity
distribution, pace decline across a set, session-load trend. The pipeline is *closed
under "produces metrics"*, so analysis can be layered indefinitely without a new data
model.

---

## The same quantity, six ways

| Stage | Representation of "reps for KB Deadlift" | origin | tier |
|-------|------------------------------------------|--------|------|
| Plan | `Rep = 8` | parser | 3 |
| Dialect | inherited load context | dialect | 2 |
| Compile | round-scoped duplication | compiler | 2 |
| Track | actual reps completed | user | 0 |
| Track (time) | spans/elapsed for the set | runtime | 1 |
| Analyze | contribution to `Volume`, `MET-minutes` | analyzed | 1 |

The display layer asks the `MetricContainer` for the winning metric per type; the
analytics layer reads `rawMetrics` to see all of them. **Nothing is overwritten — only
layered.** That invariant is what makes plan-vs-actual-vs-projection comparisons, and
stage-isolated testing, possible.
