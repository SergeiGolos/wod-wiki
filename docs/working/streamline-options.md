# Streamline Options

Running log of streamlining / deepening opportunities discovered while working in
the codebase. Each entry is a candidate, not a commitment. Use the architecture
vocabulary (module / interface / seam / depth / leverage / locality) and the domain
vocabulary from `CONTEXT.md`.

---

## Completed

### ✅ Move units out of the grammar into a core Unit Registry + Dialect fusion (2026-05)

**What changed.** Units of measurement used to be baked into the Lezer grammar as
two tokens (`distanceUnit`, `weightUnit`) — incomplete (no `in`, `lbs`, `cal`,
`pood`…), alias-less, and impossible for a Dialect to extend. They are gone.

- **Core `UnitRegistry`** (`src/core/metrics/units/`) — a pure, importable catalog:
  `UnitDef { canonical, dimension, aliases }`, a composable `UnitSet`
  (`get` / `has` / `consumeLeading` / `extend`), and `UnitRegistry.standard()`.
  Complete base set across length / mass / energy with acronyms.
- **`fuseUnits` pass** (`src/dialects/units/fuseUnits.ts`) — the one shared,
  idempotent, metricMeta-aware rewrite that turns a bare Number + unit-word
  (`Rep(100)` + `Effort("m Run")`) into a dimensioned Metric + residual Effort
  (`Distance(100,"m")` + `Effort("Run")`).
- **Dialect contract grew a transform half.** `IDialect.transform?(statement)` runs
  before `analyze` in `DialectRegistry.process`; the **Dialect Stack** composes in
  registration order so later dialects see fused units (Shape B).
- **`UnitsDialect`** — the base dialect; `transform` calls `fuseUnits` with the
  standard set. Sport/personal dialects pass an extended `UnitSet`.
- **Parser is unit-free.** Grammar tokens removed and `parser.ts` regenerated; the
  classifier emits bare Rep/Effort (and `Resistance` for the `@` load marker). The
  base `UnitsDialect` runs as the final layer inside `extractStatements`, so every
  parse consumer (read, editor preview, tests) gets units uniformly.

Non-length/mass dimensions (e.g. energy `cal`) fuse into a generic
`MeasuredMetric`. A future deepening would give energy a first-class metric type.

### ✅ Unify dialect hints + metrics onto a single metric channel (2026-05)

**What changed.** Dialects and the parser used to attach semantic markers through a
parallel `hints: Set<string>` channel on `ICodeStatement` / `OutputStatement`, separate
from the metric channel. That channel is removed. Hints are now
`MetricType.Hint` metrics (helpers in `src/core/metrics/hints.ts`:
`hintMetric` / `hintsToContainer` / `getHints` / `hasHint`). Everything semantic a
statement carries now flows through **one** channel — `statement.metrics` — so the
ownership ledger can reason over the whole picture.

Also narrowed `MetricAction` from `'set' | 'suppress' | 'inherit'` to just `'suppress'`
(the only live action — `'set'`/`'inherit'` had no consumers).

**Seams that absorbed the hint exclusion** (hint metrics must not surface as display
metrics or block fragments):
- Display resolution: `ownership/legacyAdapters.applyLegacyMetricFilter` drops `Hint`.
- Block fragments: `BlockBuilder.setFragments` drops `Hint`.
- Label text: `LabelComposer.build` excludes `Hint`.
- JIT cache key: `JitCompiler._statementCacheKey` keys on `getHints()` values.

---

## Open candidates

### 0. Wire sport/personal unit sets into real dialects + give energy a metric type

**Files.** `src/dialects/CrossFitDialect.ts` (and other sports), `src/core/models/Metric.ts`,
`src/runtime/compiler/metrics/MeasuredMetric.ts`, analytics engines.

**Problem.** The unit-fusion machinery composes per dialect (Shape B), but only the
base `UnitsDialect` is wired in today. `pood` and other domain units live only in
tests. Separately, energy (`cal`) fuses into a generic `MeasuredMetric` with string
type `'energy'`, so calorie analytics can't find it through the `MetricType` enum.

**Solution.** (a) Give `CrossFitDialect` (and rower/cardio) a `transform` that runs
`fuseUnits` with `UnitRegistry.standard().extend(…)` for its domain units — proving
the stack end-to-end. (b) Add `MetricType.Calorie` (or `Energy`) and a `CalorieMetric`,
and map the energy dimension to it in `fuseUnits`.

**Benefit.** Locality: domain units sit with the domain dialect. Leverage: analytics
reads calories through the same typed channel as distance/resistance.

### 1. Complete the ownership-ledger migration (retire `MetricContainer` precedence)

**Files.** `src/core/models/MetricContainer.ts`, `src/core/utils/metricPrecedence.ts`,
`src/core/metrics/ownership/**`, every caller of `getMetric` / `getDisplayMetrics` /
`merge`.

**Problem.** Two resolution mechanisms still coexist: `MetricContainer`'s own
precedence (`ORIGIN_PRECEDENCE`, `selectBestTier`, `merge`) and the newer ownership
ledger (`createMetricOwnershipLedger`). `MetricContainer.getMetric` already delegates to
the ledger, but `merge()` (marked `@deprecated`, destructive) and `getByType` still use
the legacy `ORIGIN_PRECEDENCE` map. A maintainer must know which path a given read
takes. The `LEGACY_ORIGIN_TO_OWNERSHIP_LAYER` map shows the two vocabularies
(`MetricOrigin` vs `MetricOwnershipLayer`) are not yet reconciled.

**Solution.** Make the ledger the single resolution authority. Delete the destructive
`merge()` once no caller depends on its mutate-in-place semantics; collapse
`ORIGIN_PRECEDENCE` into `LAYER_RANK`. Reconcile `MetricOrigin` down to the five
ownership layers (or formally document `MetricOrigin` as producer-detail and
`MetricOwnershipLayer` as the resolution key).

**Benefit.** One seam for "which metric wins." Locality: precedence logic stops being
spread across `metricPrecedence.ts` + `MetricContainer` + `ledger.ts`. Leverage: every
display/analytics read crosses the same tested interface.

### 2. Replace `MetricAction='suppress'` with an ownership-layer concept

**Files.** `src/core/models/Metric.ts`, `src/core/metrics/ownership/ledger.ts`.

**Problem.** Suppression is currently expressed as a per-metric `action: 'suppress'`
field that the ledger special-cases. No production code emits it today (only ledger
tests do). It is a capability looking for a producer.

**Solution.** When a real suppression producer appears, consider modelling it as a
dedicated `Suppressor` marker metric (parallel to `Hint`) rather than a field on every
`IMetric`. That removes `action` from the universal metric shape entirely and keeps the
suppression machinery in one place (the ledger), driven by a metric type.

**Benefit.** Depth: `IMetric` loses a field that is meaningful for ~0% of instances.

### 3. Dialect keyword matching is duplicated across six dialects

**Files.** `src/dialects/*Dialect.ts`.

**Problem.** Every dialect re-implements a near-identical `hasKeyword(metrics, kw)` /
`hasAnyKeyword(metrics, keywords)` private helper that scans Action/Effort/Text metric
values case-insensitively. Six shallow copies of the same scan; a change to matching
(e.g. word-boundary handling) must be made in six places — no locality.

**Solution.** Extract a single `matchKeyword(statement, keywords, types?)` helper (a
deep little module). Each dialect becomes a declarative table of
`keyword → hints` plus its domain-specific logic (Climb's grade parsing, Cardio's
distance fallback).

**Benefit.** Locality for the matching rule; each dialect shrinks to its genuinely
unique logic. The 10-prop / single-responsibility heuristics both improve.

### 4. `OutputStatement` deprecated time proxies (`spans` / `elapsed` / `total`)

**Files.** `src/core/models/OutputStatement.ts`, callers reading `.elapsed` / `.total`.

**Problem.** The canonical time data lives in the `metrics` array (`Spans` / `Elapsed`
/ `Total`), but `OutputStatement` still exposes `spans` / `elapsed` / `total`
instance fields as deprecated proxies, computed in the constructor. Two ways to read the
same fact.

**Solution.** Migrate readers to `getMetric(MetricType.Spans)` etc. via the metric
channel, then delete the proxy fields. (Lower priority — touches many UI read sites.)

**Benefit.** One channel for time, consistent with the hint unification above.

### 5. Fragment distribution is `PassthroughMetricDistributor` everywhere

**Files.** `src/runtime/impl/PassthroughMetricDistributor.ts`, `IDistributedMetrics`,
the six strategies that call `distribute(...)`.

**Problem.** `IDistributedMetrics` is a seam with exactly **one** adapter
(`PassthroughMetricDistributor`, which just clones). One adapter = a hypothetical seam,
not a real one. The indirection (`distribute()` helpers in each strategy +
`setFragments`) buys nothing today.

**Solution.** Either (a) inline the passthrough and delete the interface until a second
distributor genuinely exists, or (b) if per-block-type distribution is on the roadmap,
document the intended second adapter so the seam is justified.

**Benefit.** Removes speculative generality; the deletion test says the abstraction
isn't earning its keep yet.

---

## Notes for future explorers

- The hint unification (Completed, above) means **dialects are pure metric producers**.
  When adding a dialect, emit hint markers via `hintsToContainer([...])`; do not
  reintroduce a `Set<string>` side-channel.
- Hint metrics are deliberately invisible to display/fragments/label. If you add a new
  place that materializes metrics for the user, exclude `MetricType.Hint` there too.
