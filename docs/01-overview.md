# 01 — Overview: Plan → Track → Analyze

This is the highest-level description of what WOD Wiki does. Everything else in the
docs is a zoom-in on one of these stages.

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                       MARKDOWN                                │
                    │  # Title + frontmatter + prose + fenced ```wod ``` blocks     │
                    └───────────────────────────────┬─────────────────────────────┘
                                                    │  parse (lezer grammar)
                                                    ▼
   PLAN          ┌─────────────────────────────────────────────────────────────────┐
 (intent)        │  CodeStatement tree                                              │
                 │   • each statement owns a MetricContainer                         │
                 │   • metrics here have origin = 'parser'  (the planned target)     │
                 │   • dialects add semantic hints + origin='dialect' metrics        │
                 └───────────────────────────────┬─────────────────────────────────┘
                                                 │  JIT compile (strategies → behaviors)
                                                 ▼
                 ┌─────────────────────────────────────────────────────────────────┐
                 │  Runtime block tree (IRuntimeBlock + IRuntimeBehavior[])          │
                 │   • compiler may synthesize origin='compiler' metrics             │
                 └───────────────────────────────┬─────────────────────────────────┘
                                                 │  execute on RuntimeClock
                                                 ▼
   TRACK         ┌─────────────────────────────────────────────────────────────────┐
 (reality)       │  OutputStatement stream                                           │
                 │   • TimeSpans, elapsed, total → origin='runtime' metrics          │
                 │   • user-entered reps/load/RPE → origin='user' metrics            │
                 │   • persisted to IndexedDB as WorkoutResults                       │
                 └───────────────────────────────┬─────────────────────────────────┘
                                                 │  feed outputs to AnalyticsEngine
                                                 ▼
   ANALYZE       ┌─────────────────────────────────────────────────────────────────┐
 (insight)       │  Compound metrics (origin='analyzed')                             │
                 │   realtime enrichment: pace, power …                              │
                 │   summary projection: volume, distance, MET-min, session-load, TIS│
                 │   effort registry supplies MET / discipline coefficients          │
                 └───────────────────────────────┬─────────────────────────────────┘
                                                 │  query / chart
                                                 ▼
                 ┌─────────────────────────────────────────────────────────────────┐
                 │  Review grid, charts, journal history                             │
                 └─────────────────────────────────────────────────────────────────┘
```

## Stage 1 — PLAN: Markdown becomes metrics

The author writes ordinary Markdown. The only special element is a fenced code block
tagged `wod`. The parser (a [lezer](https://lezer.codemirror.net/) grammar in
`src/grammar/whiteboardscript.grammar`) turns each line into a **CodeStatement** with
a set of **Metrics** describing the *plan*: how many rounds, what effort, how long,
how much load, how far.

These metrics carry `origin: 'parser'` — they are the intent, not yet reality.
**Dialects** (`src/dialects/`) then read the statements and attach *semantic hints*
(e.g. `workout.metcon`, `domain.cardio`) and may inject `origin: 'dialect'` metrics
that fill in domain defaults.

➡ Details: [02 — Syntax](./02-syntax-reference.md), [03 — Domain Model](./03-domain-model.md)

## Stage 2 — Compile: statements become runnable blocks

The **JIT compiler** (`src/runtime/compiler/JitCompiler.ts`) converts statements into
**runtime blocks**. It does this with a priority-ordered set of **strategies**: each
strategy `match()`es a statement shape and `apply()`s **behaviors** to a
`BlockBuilder`. A "Rounds + Timer + Effort" line, for instance, becomes a block
carrying a countdown-timer behavior, a rounds behavior, and a reporting behavior.

➡ Details: [05 — Architecture](./05-architecture.md), [06 — Interfaces](./06-interfaces-and-implementations.md)

## Stage 3 — TRACK: execution generates time-based metrics

Blocks run on a **RuntimeStack** driven by a **RuntimeClock**. As a block is active,
timing behaviors open and close **TimeSpans**; completion behaviors emit
**OutputStatements**. The runtime stamps these with `origin: 'runtime'` metrics
(`spans`, elapsed, total, system-time). Anything the athlete types in — actual reps,
the load used, a Reps-in-Reserve value, a post-session RPE — becomes `origin: 'user'`
metrics. The result is persisted to IndexedDB as a **WorkoutResult**.

➡ Details: [04 — Metric Lifecycle](./04-metric-lifecycle.md), [07 — Screens & Workflow](./07-screens-and-workflow.md)

## Stage 4 — ANALYZE: effort + metrics + tracking → compound metrics

The **AnalyticsEngine** (`src/core/analytics/`) consumes the OutputStatement stream in
two passes:

- **Realtime processors** enrich each output as it arrives (e.g. compute **pace** from
  distance + elapsed, **power** from load + reps + time).
- **Summary processors** project across the whole session to produce **volume**,
  **distance totals**, **MET-minutes**, **session-load**, and a composite **Training
  Intensity Score (TIS)**.

These derived facts are themselves metrics, with `origin: 'analyzed'`. The
**Effort Registry** supplies the physiological coefficients (MET value, discipline
factor) that turn a raw "30 Kettlebell Swings 24kg" into MET-minutes and load.

Because the compound metrics are *also* metrics, the analysis layer can run further
queries and charts over them — the pipeline is closed under "produces metrics".

➡ Details: [08 — Analytics](./08-analytics.md)

## Why "everything is a metric" matters

The single unifying idea is that **plan, reality, and insight are all expressed in the
same Metric type**, differentiated only by `origin` and `type`. This is what lets the
app overlay the planned target against the tracked actual against the analyzed
projection in one view, and what lets each stage be tested in isolation by asserting on
the metrics it emits.
