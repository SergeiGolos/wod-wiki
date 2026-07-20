# Deep Dive — Two-Layer Analytics Derivation

> **Implementation note (2026-07-20):** The unified module lives at `src/services/analytics/workoutDerivation.ts`. The `data.logs` / `data.analytics` split was **rejected and reverted**: a single `logs` stream holds all tiers, with Tier 2 discriminated by `outputType === 'analytics'`. The analytics store is summary-only.

**Status:** design / working document  
**Parent:** [`data-storage-deepening-opportunities.md`](./data-storage-deepening-opportunities.md) §Candidate 4  
**Companion:** [`analytics-replay-seam-deep-dive.md`](./analytics-replay-seam-deep-dive.md)

**Goal:** separate the two genuinely different derivations that today are conflated under "analytics," and own them behind one module. Per feedback, these are:

- **Annotations derived from the language** — per-segment metrics derived from a single segment's structure (power, pace, resolved effort).
- **Summary analytics** — calculations against the *whole* result for aggregates (total volume, total distance, TIS, session load).

> **How to use this file:** each section has annotation space. §1 establishes vocabulary — confirm it before we discuss the unified module.

---

## 1. The two layers, grounded in the contracts

The runtime already defines these as two distinct processor contracts. The split is clean *inside the engine*; the leaks are downstream.

### Layer 1 — Annotation (per-segment, language-derived)

```ts
// src/core/analytics/IRealtimeProcessor.ts:10-12
export interface IRealtimeProcessor extends IAnalyticsProcessorDescriptor {
  process(output: IOutputStatement): IOutputStatement;
}
```

- **Input:** one segment output.
- **Output:** the same output, with extra metrics attached (`origin: 'analyzed'`).
- **Stateless and local** — every computation is within one segment.
- **Runs on every segment** as it is emitted (`AnalyticsEngine.run`).

Example — deriving strength power from a segment's reps, resistance, and elapsed time:

```ts
// src/core/analytics/PowerEnrichmentProcess.ts:21-59
process(output: IOutputStatement): IOutputStatement {
  if (output.outputType !== 'segment' || !output.isLeaf) return output;

  const elapsedMs = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
  if (elapsedMs <= 0) return output;

  // ... sum reps from Rep metrics, weight from Resistance metrics
  const volumeLoad = reps * weightKg;
  const power = volumeLoad / (elapsedMs / 1000);

  output.metrics.add({
    type: 'power',
    value: parseFloat(power.toFixed(1)),
    unit: `${units}/s`,
    origin: 'analyzed',          // ← marker: this is a derived annotation
    timestamp: new Date()
  });
  return output;
}
```

The built-in annotation processors (selected by dialect + required metrics in `StandardAnalyticsProfile.build`):

| Processor | Derives | From (language) |
|---|---|---|
| `TwoPassEffortResolutionProcess` | resolved effort (MET, discipline, intensity) | effort text — runs **first** |
| `PaceEnrichmentProcess` | pace / speed | Rep/Distance + Elapsed |
| `PowerEnrichmentProcess` | power (kg/s) | Rep/Resistance + Elapsed |

### Layer 2 — Aggregation (whole-result, cross-segment)

```ts
// src/core/analytics/ISummaryProcessor.ts:11-13
export interface ISummaryProcessor extends IAnalyticsProcessorDescriptor {
  summarize(outputs: IOutputStatement[]): ProjectionResult[];
}
```

- **Input:** the *entire* output history (all segments).
- **Output:** `ProjectionResult[]` — one or more aggregate values per processor.
- **Runs once** at finalize (`AnalyticsEngine.finalize`), and (for live UI) re-runs after every segment.

Example — TIS consumes resolved effort data (produced by Layer 1) across the whole session:

```ts
// src/core/analytics/engines/TISProcessor.ts:37-62
export class TISProcessor implements ISummaryProcessor {
  public readonly id = 'tis-projection';
  public readonly requiredMetrics = [MetricType.Action] as const;

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    // TIS = (MET-Score × 0.30) + (RPE-Score × 0.35) + (Duration-Score × 0.20) + (Discipline-Factor × 0.15)
    // Consumes effort data attached by TwoPassEffortResolutionProcess (Layer 1).
    // ...
  }
}
```

The built-in aggregation processors:

| Processor | Aggregate | Formula |
|---|---|---|
| `RepProjectionEngine` | total reps | `Σ reps` |
| `DistanceProjectionEngine` | total distance | `Σ distance` |
| `VolumeProjectionEngine` | total volume | `Σ(reps × resistance)` |
| `MetMinuteProjectionEngine` | MET-minutes | `Σ(MET × active minutes)` |
| `SessionLoadProjectionEngine` | session load | `sRPE × duration` |
| `TISProcessor` | TIS score | cross-discipline composite |

### How the engine keeps them apart

```ts
// src/core/analytics/AnalyticsEngine.ts:29-59
run(output: IOutputStatement): IOutputStatement {
  // Phase 1: realtime enrichment — Layer 1 (annotation)
  let current = output;
  for (const processor of this.realtimeProcessors) {
    current = processor.process(current);
  }
  // ... accumulate + emit live Layer-2 preview
  return current;            // Layer 1 result returned to caller
}

finalize(): IOutputStatement[] {
  return this._buildProjectionOutputs(this._runSummaries(), Date.now());  // Layer 2
}
```

`run()` is Layer 1; `finalize()` is Layer 2. **The engine already models the two-layer split correctly.** The problems are not in the engine.

### Feedback on the layer model
<!-- Confirm: annotation = language-derived per-segment; aggregation = whole-result. Any layer that doesn't fit? -->

---

## 2. Where the two layers leak downstream

The engine is clean; the leaks are in storage and in the second derivation path.

### Leak 1 — storage mixes all tiers into one `data.logs`

```ts
// src/components/Editor/types/index.ts:83-111
export interface WorkoutResults {
  logs?: StoredOutputStatement[];   // Tier 0 + Tier 1 + Tier 2, ALL here today
  completed: boolean;
  // ... plus loose scalars: roundsCompleted, totalRounds, repsCompleted (also Tier 2)
}
```

Layer-1 annotations are *inside* each segment output (extra metrics with `origin: 'analyzed'`). Layer-2 aggregates are *separate* outputs with `outputType: 'analytics'`, mixed into the same array. Every consumer filters by `outputType`, and nothing distinguishes Tier-0 raw from Tier-1 annotated except `origin`.

**Resolved (grill Q8): this mixing is accepted, not a leak.** Tier 2 stays in `data.logs` discriminated by `outputType`; there is no separate `data.analytics` property (the shapes-doc §2 split was rejected — the `outputType` filter already discriminates Tier 2). The store is fed by *extracting* the `outputType: 'analytics'` statements. See the [`analytics-store-summary-only`](./adr/analytics-store-summary-only.md) ADR.

### Leak 2 — the persistence path reads a different shape

Display reads `data.logs` (`StoredOutputStatement[]`). Persistence reads runtime `Segment[]`:

```ts
// src/services/persistence/IndexedDBNotePersistence.ts:134-140
export function normalizeAnalyticsSegments(
  segments: AnalyticsSegmentInput[],   // display-shaped Segment[], NOT logs
  noteId: string,
  resultId?: string,
  segmentVersions: Record<string, number | undefined> = {},
  blockContentId?: string,
): AnalyticsDataPoint[]
```

The workflow doc flags this as Gap 3: *"analyticsSegments passed to persistence is display-shaped, not record-shaped."* So the fact table is built from a rendering shape, while the source of truth (`data.logs`) is a record shape. They can drift.

### Leak 3 — two different metric-key extraction policies

```ts
// Display: src/services/AnalyticsTransformer.ts:42-51
switch (metric.type) {
  case 'rep':
    return 'reps';   // canonical key for rep metrics (repetitions retired)
  // ...
}

// Persistence: src/services/persistence/IndexedDBNotePersistence.ts (resolveMetricKey)
return source.key ?? source.metadata?.target ?? source.type ?? '';
// 'rep' stays 'rep' — NOT canonicalized
```

The same `rep` metric is now keyed `'reps'` in both display and the fact table. One resolver owns the canonical key.

> **Resolved:** both paths use `'reps'`; `repetitions` is retired.

### Feedback on the leaks
<!-- All three leaks resolved: single `data.logs` stream, summary-only store, canonical key `'reps'`. -->

---

## 3. The unified derivation module

One module owns "derive everything analytics knows about a workout," with the engine as its implementation. The two layers stay distinct *internally* (Layer 1 in `run`, Layer 2 in `finalize`) but present one interface.

```ts
// Sketch — one derivation; data.logs carries all tiers, store = extraction
interface WorkoutAnalytics {
  derive(input: {
    logs: StoredOutputStatement[];          // Tier 0 + Tier 1 + Tier 2, source of truth
    context: ReplayContext;                 // dialect + scriptMetricTypes + vo2max (from segment)
  }): StoredOutputStatement[];                // refreshed single stream (Tier 0 + Tier 1 + Tier 2)

  toFacts(logs: StoredOutputStatement[], identity: { ... }): SummaryFact[]; // normalizeSummaryFacts
  toSegments(): Segment[];                   // replaces getAnalyticsFromLogs (display)
}
```

Key consequences of unifying:

- **Leak 3 dies.** One metric-key resolver (the §5 family vocabulary) feeds display and persistence. `MetricType.Rep` → canonical key `reps` everywhere; `repetitions` is retired as a key.
- **Leak 2 dies.** Persistence reads from `derive()` (logs), not a separate display-shaped `Segment[]`.
- **Leak 1 is accepted** (above) — Tier 2 stays in `data.logs`; the store extracts it.
- **Effort is compile-time** ([`effort-resolution-compile-time`](./adr/effort-resolution-compile-time.md) ADR), so Layer 1 (`run`) is now *only* power/pace enrichment; effort resolution is not part of the realtime layer.
- **This is the same module as the replay seam** ([`analytics-replay-seam-deep-dive.md`](./analytics-replay-seam-deep-dive.md)). Replay is `derive(storedLogs, context)`; the live path is the incremental driver.

### Metric-key policy — resolved

**Resolved (grill Q6): the §5 family vocabulary, source-derived.** The canonical key is the metric family/aggregate (`reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`, `totalVolume`, `tis`, `<effortSlug>.<family>`, `calc.<target>`), allocated in `analytics-data-shapes-and-composition.md` §5 and recorded in `CONTEXT.md` as **Canonical Metric Key**. One resolver maps `MetricType.Rep` → `reps`; display derives a label ("Reps") from it. The display-side `rep → 'repetitions'` mapping is retired.

---

## 4. What needs to exist / change

| Item | File(s) | Notes |
|---|---|---|
| Unified `derive()` | `src/services/analytics/workoutDerivation.ts` | **Implemented.** Owns Layer 1 (`run`) + Layer 2 (`finalize`) and returns a single `StoredOutputStatement[]`. |
| Single metric-key resolver | replaces `resolveAnalyticsMetricKey` + `resolveMetricKey` | **Implemented.** `MetricType.Rep` → `reps` everywhere; `repetitions` retired. |
| `toFacts()` adapter | replaces `normalizeAnalyticsSegments` | **Implemented as `normalizeSummaryFacts`.** Reads `outputType: 'analytics'` statements from `data.logs`. |
| Summary-fact normalizer | replaces `normalizeAnalyticsSegments` | **Implemented as `normalizeSummaryFacts`.** One summary fact per `result × canonical metric key`. Per-segment pipeline deleted. |

### Resolutions (grill Q6–Q9)

1. **Canonical metric key** → §5 family vocabulary (`reps`, `totalVolume`…); `repetitions` retired (Q6).
2. **`data.analytics` property** → rejected; Tier 2 stays in `data.logs` via `outputType` (Q8).
3. **Fact-table grain** → summary only (`grain: 'summary'`); per-segment data stays in `data.logs` (Q7).
4. **Summary-fact fields** → add `blockContentId` (cross-note key); drop `effortSlug`; keep `grain` (always `'summary'`); keep `discipline` workout-level (Q9). `blockContentId` is restored everywhere the storage spec removed it.
5. **Live UI preview** → preserved; the live path still emits the per-segment Layer-2 preview (separate from persistence).

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-07-20 | — | Reconciliation: `data.logs`/`data.analytics` split rejected and reverted; analytics store summary-only; per-segment pipeline deleted; canonical key `'reps'`; `normalizeSummaryFacts` implemented. |
