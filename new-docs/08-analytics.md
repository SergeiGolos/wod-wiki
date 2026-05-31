# 08 — Analytics: Effort × Metrics × Tracking → Compound Metrics

The analytics layer is the final stage of the pipeline. It consumes the
**OutputStatements** produced by tracking (doc 04, stage 4), combines them with
**effort** physiology from the registry, and emits **compound metrics**
(`origin: 'analyzed'`). Those compound metrics are themselves ordinary `IMetric`s, so
the analysis surfaces can chart and re-query them indefinitely.

Code: `src/core/analytics/**`, `src/timeline/analytics/**`, `src/effort-registry/**`.

---

## 8.1 The engine and its two passes

`AnalyticsEngine` (`src/core/analytics/AnalyticsEngine.ts`) holds two lists of
processors and an output history:

```ts
class AnalyticsEngine implements IAnalyticsEngine {
  addRealtimeProcessor(p: IRealtimeProcessor): void;   // enrich one output as it lands
  addSummaryProcessor(p: ISummaryProcessor): void;     // project across the session
  setTracker(t: IRuntimeStackTracker): void;           // live stack context
}
```

- **Realtime (enrichment)** — runs as each `OutputStatement` arrives and attaches
  per-segment derived metrics (pace, power, resolved effort). One output in → same
  output out, with extra metrics.
- **Summary (projection)** — runs over the whole history at session end and produces
  aggregate metrics (volume, distance, MET-minutes, session-load, TIS) as a
  `ProjectionResult`.

## 8.2 The effort registry feeds the math

Most physiological math needs coefficients the raw tracking data doesn't have: how
metabolically expensive is "Kettlebell Swing"? The **Effort Registry**
(`src/effort-registry/`, doc 06 §6.6) answers that. Each `IEffort` carries
`baseAttributes`:

```ts
interface EffortBaseAttributes {
  met: number;               // metabolic equivalent of task
  discipline?: string;       // 'rowing' | 'running' | 'bodyweight' | …
  disciplineFactor?: number; // TIS multiplier (derived from discipline if omitted)
  intensityTier?: IntensityTier;
}
```

`TwoPassEffortResolutionProcess` (a realtime processor) binds each output's effort text
to a registry effort (fuzzy-matched via `EffortResolver`), so later processors can read
MET/discipline. Missing efforts fall back to a documented default so duration-only
workouts still score.

## 8.3 Realtime enrichment processors

| Processor | Input metrics | Output metric(s) | Formula |
|-----------|---------------|------------------|---------|
| `TwoPassEffortResolutionProcess` | `Effort` text | resolved-effort data | fuzzy registry match |
| `PaceEnrichmentProcess` | `Rep` or `Distance` + `Elapsed` | pace / speed | reps ÷ elapsed-minutes; distance(m) ÷ elapsed-seconds |
| `PowerEnrichmentProcess` | `Load` + `Rep` + time | power / work | work = load × reps; power = work ÷ time |

## 8.4 Summary projection engines

| Engine | Output metric | Formula |
|--------|---------------|---------|
| `RepProjectionEngine` | total reps | Σ reps across segments |
| `DistanceProjectionEngine` | total distance | Σ distance across segments |
| `VolumeProjectionEngine` | `Volume` | Σ (reps × resistance) — classic strength tonnage |
| `MetMinuteProjectionEngine` | `METScore` / MET-minutes | Σ (METs × timeMs ÷ 60 000) over timed segments |
| `SessionLoadProjectionEngine` | `SessionLoad` (AU) | Foster sRPE: sRPE × duration-minutes (effort label → RPE; default 5) |
| `TISProcessor` | `TIS` | cross-discipline composite from MET × discipline factor (optionally VO₂max-adjusted) |

Worked example for `(5) → 8 KB Deadlift 16kg`:
- `VolumeProjectionEngine` → 5 × 8 × 16 = **640 kg** of volume.
- `MetMinuteProjectionEngine` → deadlift MET × active minutes → MET-minutes.
- `SessionLoadProjectionEngine` → effort RPE × session minutes → AU.
- `TISProcessor` → composite score letting this session be compared against a row or a
  yoga flow on one scale.

## 8.5 Profiles select which processors run

You don't wire processors by hand; an **analytics profile** does it based on context.
`StandardAnalyticsProfile` (`src/core/analytics/StandardAnalyticsProfile.ts`) is the
built-in:

```ts
realtime = [ TwoPassEffortResolutionProcess?, PaceEnrichmentProcess, PowerEnrichmentProcess ]
summary  = [ RepProjectionEngine, DistanceProjectionEngine, VolumeProjectionEngine,
             SessionLoadProjectionEngine, MetMinuteProjectionEngine, TISProcessor ]
```

The profile filters processors by **applicability** (`isApplicable(processor, context)`)
and injects the effort resolver + user profile (e.g. `vo2max` for TIS) from the
`AnalyticsContext`. This is the convention: *processors describe a capability; the
profile decides participation* — keeping processors free of selection logic (doc 06
§6.5).

## 8.6 Supporting types

| Type | File | Role |
|------|------|------|
| `IAnalyticsEngine` | `core/contracts/IAnalyticsEngine.ts` | Engine contract |
| `IRealtimeProcessor` / `ISummaryProcessor` | `core/analytics/` | The two processor seams |
| `IAnalyticsProfile` | `core/analytics/IAnalyticsProfile.ts` | Selects processors |
| `IAnalyticsProcessorDescriptor` | `core/analytics/IAnalyticsProcessorDescriptor.ts` | Declares a processor's applicability |
| `AnalyticsContext` | `core/analytics/AnalyticsContext.ts` | Effort resolver, user profile, stack tracker |
| `ProjectionResult` | `core/analytics/ProjectionResult.ts` | Summary output |
| `EffortResolver` | `effort-registry/EffortResolver.ts` | Fuzzy effort lookup |

## 8.7 Why this closes the loop

Every analytics output is an `IMetric` with `origin: 'analyzed'`, stored in the
`analytics` IndexedDB store and readable through the same `IMetricSource` interface as
plan and tracking metrics. So a chart over "weekly volume" is just another query over
metrics — the system never needs a separate analytics data model. That is the final
expression of the project's core invariant: **markdown → metrics → tracking metrics →
analyzed metrics**, one currency throughout.
