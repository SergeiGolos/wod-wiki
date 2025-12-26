# Metrics, Fragments, and Time Spans Deep Dive

This note maps how workout statements turn into fragments, metrics, and time spans for runtime history and analytics. It complements `docs/fragment-visualization-deep-dive.md` by focusing on the data model rather than UI rendering.

## Flow at a Glance
- Parse: WOD script → `ICodeStatement.fragments` (parser emits typed fragments).
- Compile: `FragmentCompilationManager` + compilers convert fragments → `RuntimeMetric.values` (legacy metric array) and label via `exerciseId`.
- Execute: Blocks emit `TrackedSpan` objects (`startTime`, `endTime`, `status`, `parentSpanId`, `SpanMetrics`, optional `segments`).
- Visualize: `spanMetricsToFragments` (or `metricsToFragments` for legacy) turns span metrics back into `ICodeFragment[]` for history and analytics segments.
- Analyze: `AnalyticsTransformer` converts spans → analytics `Segment` objects and groups metrics for charts.

## Fragment Types (parser surface)
| Fragment | Class | Sample value/image | Collection state | Compiles to metric type |
| --- | --- | --- | --- | --- |
| Timer | `TimerFragment` | `5:00` or `:?` | `Defined` or `RuntimeGenerated` when collectible | `time` (ms) |
| Rep | `RepFragment` | `21` | `Defined` or `UserCollected` when `?` | `repetitions` |
| Effort | `EffortFragment` | `Pushup` | `Defined` | `effort` (unit prefix `effort:`) |
| Distance | `DistanceFragment` | `400 m` | `Defined` or `UserCollected` when `?` | `distance` |
| Rounds | `RoundsFragment` | `3` or `21-15-9` | `Defined` | `rounds` |
| Resistance | `ResistanceFragment` | `50 lb` | `Defined` or `UserCollected` when `?` | `resistance` |
| Action | `ActionFragment` | `EMOM` | `Defined` | `action` (unit prefix `action:`) |
| Increment | `IncrementFragment` | `^` / `v` | `Defined` | none (control marker) |
| Lap | `LapFragment` | `round`, `minute`, etc. | `Defined` | none (grouping marker) |
| Text | `TextFragment` | `Rest` | `Defined` | none (display only) |

Notes:
- `FragmentType` enum mirrors the table (`timer`, `rep`, `effort`, `distance`, `rounds`, `action`, `increment`, `lap`, `text`, `resistance`).
- `collectionState` flags which fragments need runtime/user data (`UserCollected` for unknown numeric inputs, `RuntimeGenerated` for `:?` timers).

## Metric Models

### Legacy compilation (`RuntimeMetric`)
- `MetricValue`: discriminated by `type` (`repetitions`, `resistance`, `distance`, `timestamp`, `rounds`, `time`, `calories`, `action`, `effort`, `heart_rate`, `cadence`, `power`), with `value` and `unit`.
- `RuntimeMetric`: `{ exerciseId, values: MetricValue[], timeSpans: TimeSpan[] }` produced by fragment compilers; carried on spans as `compiledMetrics` for adapters that still expect the legacy shape.

### Unified runtime metrics (`SpanMetrics` on `TrackedSpan`)
- Typed, timestamped fields (`MetricValueWithTimestamp`) for: `reps`, `weight`, `distance`, `duration`, `elapsed`, `remaining`, `calories`, `heartRate`, `power`, `cadence`.
- Grouped metrics (`metricGroups: MetricGroup[]`) for metrics[][] semantics without flattening. `MetricGroup` = `{ id?, label?, metrics: RecordedMetricValue[] }`, where `RecordedMetricValue` adds `type` to `MetricValueWithTimestamp`.
- Structural fields: `exerciseId`, `exerciseImage`, `targetReps`, `currentRound`, `totalRounds`, `repScheme`, `custom` map, plus `legacyMetrics` for back-compat.
- Lives inside `TrackedSpan.metrics`; spans may also carry `fragments` (if preserved) and `compiledMetrics` (legacy snapshot).

## Mapping Metrics ↔ Fragments
- `spanMetricsToFragments` builds chips in priority order:
  - Target reps (as `21x`) precede effort name when both exist.
  - Effort name uses `FragmentType.Effort`.
  - Fallback type chip when no effort (`Timer`, `Rounds`, etc.).
  - Reps, resistance, distance, duration (pretty mm:ss), rounds/repScheme, calories all emit typed fragments.
  - Legacy metrics are appended via `metricsToFragments` to preserve older values; duplicates are deduped by `type|image`.
- `METRIC_TO_FRAGMENT_TYPE` (in `metricsToFragments`) maps metric types to fragment types for legacy arrays (e.g., `repetitions`→`Rep`, `resistance`→`Resistance`, `distance`→`Distance`, biometrics→`Text`).

## Time Spans and Segments
- `TrackedSpan` is the runtime truth for a block: `id`, `blockId`, `type` (`timer`, `rounds`, `effort`, `interval`, `emom`, `amrap`, `tabata`, `group`), `status`, `startTime`, `endTime`, `parentSpanId`, `metrics`, optional `fragments`/`compiledMetrics`, and `segments`.
- `TimeSegment` provides finer-grained windows inside a span (`work`, `rest`, `round`, `minute`, `pause`, `transition`) with their own `startTime`, `endTime`, label, index, and optional `metrics` slice.
- `AnalyticsTransformer` converts spans into analytics `Segment` objects, using relative timestamps from the earliest `startTime` to build timelines.
- Duration math: spans compute `duration` as `(endTime - startTime)/1000`, while timer fragments store raw ms; adapters format human-readable mm:ss strings.

## How Collection and Time Interact
- Collectible fragments (`:?` timers, `?` reps/weights/distances) yield placeholder values at parse/compile time; actual numbers are expected to be captured during execution and stored in `SpanMetrics` fields with timestamps.
- Start/end times on `TrackedSpan` anchor metrics to real wall-clock time; `TimeSegment` allows splitting a span so the same metric type can be recorded in multiple windows (e.g., EMOM minutes or rounds within AMRAP).
- When spans are replayed in history/analytics, relative offsets are computed from the earliest span start so fragments and charts align on a consistent timeline.

## Reference Code
- `src/core/models/CodeFragment.ts` (fragment types and collection states)
- `src/fragments/*.ts` (concrete fragment classes)
- `src/runtime/FragmentCompilers.ts` + `FragmentCompilationManager.ts` (fragment → metric compilation)
- `src/runtime/models/TrackedSpan.ts` (span, metrics, segments, debug metadata)
- `src/runtime/utils/metricsToFragments.ts` (metrics → fragments adapters)