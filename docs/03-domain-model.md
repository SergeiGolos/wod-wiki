# 03 — Domain Model

This document defines the core data types. They live in `src/core/models/` and
`src/core/contracts/`. The whole system is built on three nouns: **Statement**,
**Metric**, and **MetricContainer**.

---

## 3.1 Metric — the atomic fact

A **Metric** (`IMetric` in `src/core/models/Metric.ts`) is a single typed,
origin-stamped value. It is the universal currency: a planned duration, a recorded
span, a derived volume — all are Metrics.

```ts
interface IMetric {
  readonly type: MetricType | string;   // what kind of fact (see 3.2)
  readonly origin: MetricOrigin;         // which stage produced it (see 3.3)
  readonly value?: unknown;              // the data (number, TimeSpan[], string, object)
  readonly image?: string;               // display string, e.g. "0:00"
  readonly unit?: string;                // "kg", "m", "ms" …
  readonly action?: MetricAction;        // dialect compiler instruction (see 3.4)
  readonly sourceBlockKey?: string;      // which runtime block created it
  readonly timestamp?: Date;             // when it was recorded
}
```

A Metric is **pure data** — no methods. Behavior lives in the container and in
processors.

### 3.2 MetricType

The standard vocabulary (`enum MetricType`). Custom derived metrics may use any
string (e.g. `'speed'`, `'rep-rate'`).

| Group | Types |
|-------|-------|
| **Planned (parser)** | `Duration` (planned time target), `Rep`, `Effort`, `Distance`, `Rounds`, `Resistance`, `Load`, `Increment`, `Group`, `Lap`, `Action`, `Text`, `Custom` |
| **Tracked (runtime)** | `Spans` (raw start/stop `TimeSpan[]`), `SystemTime` (wall clock at log), `CurrentRound` |
| **User-collected** | `RIR` (reps in reserve), `SessionRPE` |
| **Analyzed (compound)** | `Volume`, `Intensity`, `Work`, `SessionLoad`, `METScore`, `TIS`, `Calculated` |
| *Deprecated* | `Time`, `Elapsed`, `Total` (now computed from `Spans` on demand) |

> **Time terminology** (from the Metric docblock):
> - **Duration** — the *planned* target from the script (`5:00` → 300000 ms).
> - **Spans** — the raw `TimeSpan[]` of active (unpaused) execution windows.
> - **Elapsed** — Σ(end − start) over spans (active time, excludes pauses).
> - **Total** — lastEnd − firstStart (wall-clock bracket, includes pauses).
> - **SystemTime** — `Date.now()` when a message is logged.

### 3.3 MetricOrigin & precedence

`origin` records the **stage** that produced the metric. This is how the same logical
quantity (say, "reps") can exist simultaneously as a plan, a tracked actual, and an
analyzed estimate.

```
parser     – parsed from source text (the plan)
dialect    – synthesized by a dialect policy before runtime
compiler   – synthesized by a compiler strategy
runtime    – generated during execution (elapsed time, spans)
user       – collected from athlete input (actual reps, RPE)
analyzed   – derived by an analytics processor (volume, pace, TIS)
```

When several metrics of the same type coexist, **precedence** decides which is shown.
Lower tier number = higher precedence (`src/core/utils/metricPrecedence.ts`):

| Tier | Origins | Rationale |
|------|---------|-----------|
| 0 | `user`, `collected` | The athlete's explicit truth wins |
| 1 | `runtime`, `tracked`, `analyzed` | What actually happened / was derived |
| 2 | `compiler`, `hinted` | Synthesized defaults |
| 3 | `parser` | The original plan (lowest — a fallback when nothing better exists) |

So a line that *planned* 10 reps but was *tracked* as 8 displays **8** (tier 1 beats
tier 3), while still retaining the planned 10 for comparison.

### 3.4 MetricAction (dialect instructions)

Dialect-origin metrics may carry a compiler instruction:

- `set` — inject this metric (precedence handles display).
- `suppress` — hide all metrics of this type (a sentinel pattern).
- `inherit` — propagate this value down to child statements.

Parser metrics never carry an action.

---

## 3.5 CodeStatement — a node of the plan

A **CodeStatement** (`src/core/models/CodeStatement.ts`) is one structural node of a
parsed workout. A `wod` block parses into a tree of these.

```ts
interface ICodeStatement extends IMetricSource {
  id: number;
  parent?: number;
  children: number[][];        // grouped child IDs (supports lap grouping)
  metrics: MetricContainer;    // this node's metrics
  meta: CodeMetadata;          // source location (line, column, offsets, raw text)
  isLeaf?: boolean;
  hints?: Set<string>;         // semantic hints added by dialects
  exerciseId?: string;         // resolved effort registry slug
}
```

`children` is `number[][]` — a list of *groups* of child IDs — which is how composed
(`+`) laps and ordered children are represented.

## 3.6 MetricContainer & IMetricSource

A **MetricContainer** holds a statement's metrics and implements the metric-precedence
resolution. Both `CodeStatement` and `OutputStatement` implement **`IMetricSource`**
(`src/core/contracts/IMetricSource.ts`), the read interface used everywhere metrics are
consumed:

```ts
interface IMetricSource {
  hasMetric(type: MetricType): boolean;
  getMetric(type: MetricType): IMetric | undefined;       // precedence-resolved
  getAllMetricsByType(type: MetricType): IMetric[];
  getDisplayMetrics(filter?: MetricFilter): IMetric[];     // resolved for UI
  rawMetrics: IMetric[];                                    // unresolved, all of them
}
```

Because both the plan node and the runtime output are `IMetricSource`s, UI and
analytics code reads them through one interface regardless of stage.

## 3.7 OutputStatement — a node of reality

An **OutputStatement** (`src/core/models/OutputStatement.ts`) is what a running block
*emits*. It is also an `ICodeStatement`/`IMetricSource`, so it carries a
MetricContainer — but its metrics are `origin: 'runtime'`/`'user'`: recorded spans,
elapsed/total (computed from spans), system time, current round, and any
athlete-entered values. OutputStatements are the input to the analytics layer and the
records persisted as **WorkoutResults**.

> Note: `OutputStatement.spans/elapsed/total` exist as **deprecated proxies**; the
> canonical data lives in the `metrics` array as `Spans`/`Elapsed`/`Total` metrics.

---

## 3.8 Supporting models

| Type | File | Role |
|------|------|------|
| `MetricContainer` | `MetricContainer.ts` | Holds metrics; resolves display precedence |
| `BlockKey` | `BlockKey.ts` | Stable identity of a runtime block instance |
| `CodeMetadata` | `CodeMetadata.ts` | Source span (line/column/offsets/raw) |
| `TimeSpan` / `TimeSpanImpl` | `TimeSpan.ts` | A single start/stop active-execution window |
| `Duration` | `Duration.ts` | Parsed planned-time value |
| `CollectionSpan` | `CollectionSpan.ts` | Span aggregation across a collection |
| `Dialect` | `Dialect.ts` | `IDialect` contract + `DialectAnalysis` result |
| `DisplayItem` | `DisplayItem.ts` | A resolved item for rendering |
| `AnalyticsModels` | `AnalyticsModels.ts` | Shapes for analytics inputs/outputs |

➡ Next: how these flow through stages in [04 — Metric Lifecycle](./04-metric-lifecycle.md).
