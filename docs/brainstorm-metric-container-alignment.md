# Feature: Metric Container Alignment

## 1. Requirement Analysis

- **Core Problem**: Metrics currently flow through a flat precedence system (`ORIGIN_PRECEDENCE` in `metricPrecedence.ts`) that only distinguishes *where* a metric was created (parser, compiler, runtime, user) but does not model the full lifecycle of metric ownership across layers. The issue requests a clearly defined order of precedence where each layer (dialect, user-plan, runtime, user-entry) can **add**, **replace/override**, **null out**, or **shadow** a metric — creating a new instance of the same type at a higher layer while preserving the original (reading the container returns the higher-level instance; the original remains accessible via `rawMetrics`).
- **Success Criteria**:
  - Each layer can introduce new metrics not present in lower layers.
  - Each layer can "null out" (suppress) a metric so downstream consumers no longer see it.
  - Each layer can replace a metric with its own version; the original is preserved but resolution returns the override.
  - A promotion mechanism lets a layer flag a metric for inheritance by child blocks.
  - The precedence order is: **parser → dialect → user-plan → runtime → user-entry** (lowest to highest).
- **Scope**: Architectural brainstorm — no code changes. Produce analysis document and visual canvas.
- **User Impact**: Enables dialect authors to inject domain-specific metrics, users to customize planned metrics before execution, and users to correct or augment runtime results after completion.

---

## 2. Code Exploration

### Relevant Files

| File | Role |
|------|------|
| `src/core/models/Metric.ts` | Defines `IMetric`, `MetricType` (25 types), and `MetricOrigin` (9 values) |
| `src/core/utils/metricPrecedence.ts` | `ORIGIN_PRECEDENCE` map and `resolveMetricPrecedence()` algorithm |
| `src/core/models/MetricContainer.ts` | `MetricContainer` class — typed collection with merge, resolve, CRUD |
| `src/core/contracts/IMetricSource.ts` | `IMetricSource` interface consumed by UI; `MetricFilter` type |
| `src/runtime/behaviors/MetricPromotionBehavior.ts` | Parent→child metric promotion via `PromotionRule` |
| `src/runtime/memory/MemoryLocation.ts` | `MemoryTag` taxonomy: `metric:display`, `metric:promote`, `metric:result`, etc. |
| `src/runtime/memory/MetricVisibility.ts` | Visibility classification: display / result / promote / private |
| `src/runtime/compiler/JitCompiler.ts` | Coordinates metric injection: parent promotion → dialect processing → strategy application |
| `src/runtime/compiler/BlockBuilder.ts` | `setFragments()`, `asTimer()`, `asRepeater()`, `build()` — pushes metrics to block memory |
| `src/core/models/Dialect.ts` | `IDialect` interface — `analyze()` returns `DialectAnalysis` with hints (not metrics) |
| `src/dialects/CrossFitDialect.ts` | CrossFit dialect — recognizes AMRAP, EMOM, FOR TIME, TABATA as behavioral hints |
| `src/core/models/CodeStatement.ts` | Carries `metrics: IMetric[]` and `semanticHints: string[]` from dialects |
| `src/services/DialectRegistry.ts` | Manages dialect registration and `processAll()` hint injection |

### Similar Existing Features

- **MetricContainer.merge()**: Already implements precedence-aware merging — incoming metrics of higher precedence replace existing, equal precedence appends, lower precedence is ignored. This is the closest existing mechanism to layered overrides.
- **MetricPromotionBehavior**: Demonstrates parent→child metric cascading using `PromotionRule` with `sourceTag` targeting. Supports dynamic re-promotion on round advance.
- **ORIGIN_PRECEDENCE tiers**: Four-tier system (0–3) already ranks user > runtime > compiler > parser. The proposed layers map partially but not completely to these tiers.

### Key Patterns

| Pattern | How It Applies |
|---------|---------------|
| **Origin-based precedence** | The existing `ORIGIN_PRECEDENCE` map resolves conflicts by origin tier. The proposal adds two new conceptual layers (dialect, user-plan) that need new origins or sub-tiers. |
| **Immutable data + container mutation** | `IMetric` is readonly; `MetricContainer` mutates its internal array. Layered overrides fit this model — each layer adds metrics with its own origin, and resolution picks the winner. |
| **Strategy pattern (compilation)** | Strategies consume metrics from `CodeStatement` and compose blocks via `BlockBuilder`. Dialect metric overrides would need to run before strategy matching. |
| **Memory tag taxonomy** | `MemoryTag` differentiates visibility (display, result, promote, private). Nullification could be modeled as a new tag or a special metric value. |

---

## 3. Proposed Solutions

### Solution A: Expand MetricOrigin with New Layer Values

Introduce new `MetricOrigin` values (`'dialect'` and `'user-plan'`) and adjust `ORIGIN_PRECEDENCE` to create a 6-tier system:

| Tier | Origin | Description |
|------|--------|-------------|
| 0 | `user-entry`, `collected`, `execution` | Post-execution user corrections |
| 1 | `runtime`, `tracked`, `analyzed` | Execution-generated data |
| 2 | `user-plan` | Pre-execution user composition |
| 3 | `dialect`, `hinted` | Domain-specific overrides |
| 4 | `compiler` | Synthesized during compilation |
| 5 | `parser` | Parsed from source text |

Nullification is modeled by adding a metric with a sentinel value (e.g., `value: null` or a `NullMetric` type) at the overriding layer. The resolution algorithm skips metrics with null values after selecting the best tier.

The `IDialect.analyze()` method is extended to return optional `IMetric[]` overrides alongside hints. These are injected into `CodeStatement.metrics` during `DialectRegistry.processAll()`.

- **Implementation Complexity**: Medium
- **Alignment**: Excellent — extends existing `ORIGIN_PRECEDENCE` with minimal structural change
- **Key Files**: `Metric.ts`, `metricPrecedence.ts`, `MetricContainer.ts`, `Dialect.ts`, `DialectRegistry.ts`

### Solution B: Layered MetricContainer Stack

Instead of a flat `IMetric[]` with origin tags, introduce a `LayeredMetricContainer` that maintains separate layers as an ordered stack of `MetricContainer` instances:

```
LayeredMetricContainer
  ├── layer[0]: parser       → MetricContainer
  ├── layer[1]: dialect      → MetricContainer
  ├── layer[2]: user-plan    → MetricContainer
  ├── layer[3]: runtime      → MetricContainer
  └── layer[4]: user-entry   → MetricContainer
```

Each layer has explicit operations: `add`, `replace`, `nullify`, `promote`. Resolution traverses from highest to lowest layer. A `nullify` marker in any layer suppresses the metric from all lower layers.

- **Implementation Complexity**: High
- **Alignment**: Fair — introduces a new abstraction that duplicates some of `MetricContainer`'s responsibilities. Requires refactoring `IMetricSource`, `CodeStatement`, and `BlockBuilder` to use the layered container.
- **Key Files**: New `LayeredMetricContainer.ts`, extensive changes to `IMetricSource.ts`, `CodeStatement.ts`, `BlockBuilder.ts`, `JitCompiler.ts`

### Solution C: Metric Override Chain with Decorators

Model each layer as a decorator over the previous layer's `IMetricSource`. Each decorator implements the same interface but intercepts `getDisplayMetrics()` / `getMetric()` calls to apply its overrides (add, replace, null) before delegating:

```
UserEntrySource → RuntimeSource → UserPlanSource → DialectSource → ParserSource
```

Each decorator holds a sparse set of overrides. Resolution walks the chain from outermost (user-entry) inward (parser). First non-null result wins.

- **Implementation Complexity**: Medium-High
- **Alignment**: Good — preserves `IMetricSource` contract, uses decorator pattern which is familiar in the codebase. However, it changes the topology from "flat array + resolution" to "chained sources."
- **Key Files**: New decorator classes, changes to `IMetricSource` consumers, `JitCompiler.ts`, `BlockBuilder.ts`

---

## 4. Recommendation

**Recommended: Solution A — Expand MetricOrigin with New Layer Values**

This approach builds on the proven `ORIGIN_PRECEDENCE` system that already handles multi-origin resolution correctly. The infrastructure for merging, filtering, and resolving by origin tier is fully built out in `MetricContainer` and `resolveMetricPrecedence()`. Adding two new origin values (`dialect`, `user-plan`) and renaming `user` to clarify `user-entry` semantics is the smallest delta that delivers the full feature.

The key insight is that the current architecture *already supports* the proposed layering — it simply lacks the vocabulary and injection points. The `MetricOrigin` type union, `ORIGIN_PRECEDENCE` map, and `MetricContainer.merge()` algorithm already implement "higher-precedence replaces lower" semantics. What's missing is:

1. Named origins for the dialect and user-plan layers
2. An injection point in `IDialect` for metric overrides (not just hints)
3. A nullification mechanism (sentinel metric value)
4. Clear documentation of the precedence contract

### Implementation Steps

1. **Add new MetricOrigin values** in `src/core/models/Metric.ts`:
   - Add `'dialect'` origin for dialect-injected metrics
   - Add `'user-plan'` origin for pre-execution user composition
   - Rename/alias `'user'` usage to clarify `'user-entry'` semantics where appropriate
2. **Update ORIGIN_PRECEDENCE** in `src/core/utils/metricPrecedence.ts`:
   - Insert `'dialect': 3` and `'user-plan': 2` tiers
   - Shift `'parser'` to tier 5, `'compiler'` to tier 4
3. **Extend IDialect interface** in `src/core/models/Dialect.ts`:
   - Add optional `metricOverrides?: IMetric[]` to `DialectAnalysis`
   - Add optional `nullifiedTypes?: MetricType[]` to `DialectAnalysis`
4. **Update DialectRegistry.processAll()** in `src/services/DialectRegistry.ts`:
   - Inject dialect metric overrides into `CodeStatement.metrics` after hint processing
   - Apply nullification by marking suppressed types
5. **Add nullification support** to `MetricContainer.resolve()`:
   - Recognize null-valued metrics as suppressors
   - Filter out suppressed types from lower-precedence tiers
6. **Update MetricContainer.merge()** to handle nullification propagation
7. **Add tests** for:
   - New origin tiers resolve correctly
   - Dialect metric overrides are injected
   - Nullification suppresses lower-tier metrics
   - User-plan metrics override dialect metrics
   - User-entry metrics override runtime metrics
   - Preserved originals are accessible via `rawMetrics`

### Testing Strategy

| Category | Test Cases |
|----------|-----------|
| Precedence | Verify 6-tier ordering: user-entry > runtime > user-plan > dialect > compiler > parser |
| Nullification | Dialect nullifies parser metric; user-plan nullifies dialect metric; null does not leak to other types |
| Metric addition | Dialect adds new metric type not in parser; user-plan adds metric not in dialect |
| Metric replacement | Higher layer replaces same-type metric; original preserved in raw access |
| Promotion | Promoted metrics from dialect layer inherit to child blocks |
| Multi-metric | Rep scheme (21-15-9) survives layered resolution at same tier |
| Backward compatibility | Existing parser/compiler/runtime/user origins resolve identically to current behavior |

---

## 5. Validation & Next Steps

- [ ] Review this brainstorm analysis for completeness and alignment with project goals
- [ ] Validate that Solution A's precedence tier assignments match the intended override semantics
- [ ] Confirm nullification mechanism (sentinel value vs. explicit null list) preference
- [ ] Determine if `IDialect.analyze()` should return metric overrides or if a separate method is preferred
- [ ] Decide naming: keep `'user'` origin for backward compatibility and add `'user-plan'` + `'user-entry'`, or rename `'user'` entirely
- [ ] Create a Plan issue using `.github/ISSUE_TEMPLATE/plan.md` to transition to implementation planning
- [ ] Update `docs/finishline/metric-inheritance.md` compliance scenarios with new layer interactions

---

## 6. Alternatives and Edge Cases

### Simpler Alternative Considered

The simplest approach would be to document the existing `ORIGIN_PRECEDENCE` tiers as the "layer system" and map dialect→compiler, user-plan→hinted, user-entry→user. This avoids any code changes but conflates semantically distinct layers into shared tiers, making it impossible to distinguish "compiler-generated metric" from "dialect-generated metric" during debugging or analytics.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Circular nullification**: Layer A nullifies type X, Layer B re-adds type X | Higher layer's add takes precedence over lower layer's nullification. Resolution walks top-down. |
| **Multi-metric nullification**: Dialect nullifies `Rep` type when parser has 21-15-9 scheme | All parser-origin Rep metrics are suppressed. Dialect can re-add its own Rep metrics. |
| **Empty dialect**: Dialect returns no overrides or nullifications | No-op. Statement metrics pass through unchanged. Backward compatible. |
| **Conflicting user layers**: user-plan sets Rep=10, user-entry sets Rep=12 | user-entry wins (tier 0 > tier 2). Both preserved in raw access. |
| **Promotion across layers**: Parent has dialect-origin metric, child should inherit | `MetricPromotionBehavior` already copies metrics to `metric:promote` memory. Origin is preserved, so child sees it at dialect tier. |
| **Runtime overwrites user-plan**: Runtime generates same metric type as user-plan | If the same `MetricType` is used (e.g., both produce `Rep`), runtime (tier 1) wins over user-plan (tier 2). However, "target" and "actual" should typically use distinct `MetricType` values so they coexist — e.g., user-plan sets a *target* rep count while runtime tracks *actual* reps completed. When semantically distinct, both are preserved. |

### Performance Implications

- Adding 2 new origin values to `ORIGIN_PRECEDENCE` has zero runtime cost (it's a static map lookup).
- Nullification adds a filter pass to `resolve()` — negligible for typical metric counts (< 50 per block).
- No changes to the hot path (timer tick, block push/pop) since metric resolution happens at display time.

### Feature Interactions

| Feature | Interaction |
|---------|-------------|
| **Dialect System** (finishline) | Dialect metric overrides are the primary new injection point. Requires `IDialect` interface extension. |
| **Reporting** (finishline) | Reports consume `IMetricSource.getDisplayMetrics()`. Layered resolution is transparent to report consumers. |
| **Query Language** (brainstorm) | Queries may want to access specific layers. `MetricFilter.origins` already supports this. |
| **Metric Promotion** (implemented) | Promotion copies metrics preserving origin. Layered origins flow naturally through promotion. |
