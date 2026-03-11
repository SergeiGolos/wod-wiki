# Analytics Reference

This document describes every analytics process and projection engine in wod-wiki.

---

## Architecture Overview

Two pipelines handle analytics:

### Pipeline A — Enrichment (`src/core/analytics/`)

Real-time, segment-local enrichment during workout execution. Each `IAnalyticsProcess` implementation receives an `IOutputStatement` as it flows through the runtime, reads the metrics already on it (including those added by earlier processes), and pushes additional **derived** metrics back onto `output.metrics`.

**Rules:**
- Stateless — no cross-segment accumulation
- `process(output)` is the only method (no `finalize()`)
- Processes chain in registration order; each sees the output of its predecessors

### Pipeline B — Projection (`src/timeline/analytics/analytics/`)

Aggregation of collected metrics into workout-level and per-exercise totals. `IProjectionEngine` implementations receive the full metric array and produce `ProjectionResult` objects. Results are pushed to `tracker.recordMetric('session-totals', …)` via `ProjectionSyncProcess`, which drives the `MetricTrackerCard` displayed above the timer.

Two calculation paths per engine:
- `calculateFromFragments(metrics, exerciseId, definition)` — per-exercise analysis (called by `AnalysisService.runAllProjectionsFromFragments`)
- `calculateFromWorkout(metrics)` — workout-level total (called by `AnalysisService.runWorkoutProjections`)

---

## Registration (`src/components/workbench/useWorkbenchRuntime.ts`)

```typescript
// Pipeline A — enrichment processes (chain in order)
engine.addProcess(new PaceEnrichmentProcess());
engine.addProcess(new PowerEnrichmentProcess());

// Pipeline B bridge — accumulates metrics, runs projections, writes to tracker
const projectionService = new AnalysisService();
projectionService.registerEngine(new RepProjectionEngine());
projectionService.registerEngine(new DistanceProjectionEngine());
projectionService.registerEngine(new VolumeProjectionEngine());
projectionService.registerEngine(new SessionLoadProjectionEngine());
projectionService.registerEngine(new MetMinuteProjectionEngine());
engine.addProcess(new ProjectionSyncProcess(projectionService, runtime.tracker));
```

---

## Pipeline A — Enrichment Processes

### PaceEnrichmentProcess
**File:** [src/core/analytics/PaceEnrichmentProcess.ts](../src/core/analytics/PaceEnrichmentProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment with (`MetricType.Rep` OR `MetricType.Distance`) + `MetricType.Elapsed` |
| **Adds to segment** | `Pace (reps/min)` = reps ÷ elapsedMinutes |
| | `Pace (m/s)` = distance ÷ elapsedSeconds |
| | `Pace (min/km)` = elapsedMinutes ÷ distanceKm |
| **Metric origin** | `'analyzed'` |

---

### PowerEnrichmentProcess
**File:** [src/core/analytics/PowerEnrichmentProcess.ts](../src/core/analytics/PowerEnrichmentProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment with `MetricType.Rep` + `MetricType.Resistance` + `MetricType.Elapsed` |
| **Adds to segment** | `Power (units/s)` = (reps × weight) ÷ elapsedSeconds |
| **Metric origin** | `'analyzed'` |

---

### ProjectionSyncProcess
**File:** [src/core/analytics/ProjectionSyncProcess.ts](../src/core/analytics/ProjectionSyncProcess.ts)

Bridge between Pipeline A and the tracker UI. Runs after all enrichment processes.

| Aspect | Details |
|--------|---------|
| **On each segment** | Accumulates `output.metrics` into a running `allMetrics` array |
| **Runs** | `AnalysisService.runWorkoutProjections(allMetrics)` + `runAllProjectionsFromFragments(allMetrics)` |
| **Writes** | Each `ProjectionResult` → `tracker.recordMetric('session-totals', result.name, result.value, result.unit)` |
| **Output modification** | None — side-effect only |

---

## Pipeline B — Projection Engines

### RepProjectionEngine
**File:** [src/timeline/analytics/analytics/engines/RepProjectionEngine.ts](../src/timeline/analytics/analytics/engines/RepProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Path** | `calculateFromWorkout` |
| **Reads** | `MetricType.Rep` (numeric values) from all metrics |
| **Produces** | `{ name: 'Total Reps', value: Σreps, unit: 'reps' }` |

---

### DistanceProjectionEngine
**File:** [src/timeline/analytics/analytics/engines/DistanceProjectionEngine.ts](../src/timeline/analytics/analytics/engines/DistanceProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Path** | `calculateFromWorkout` |
| **Reads** | `MetricType.Distance` (`{ amount, units }` objects or numeric) from all metrics |
| **Produces** | `{ name: 'Total Distance', value: Σdistance, unit }` |

---

### VolumeProjectionEngine
**File:** [src/timeline/analytics/analytics/engines/VolumeProjectionEngine.ts](../src/timeline/analytics/analytics/engines/VolumeProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Paths** | Both `calculateFromFragments` (per-exercise) and `calculateFromWorkout` (workout total) |
| **Reads** | `MetricType.Rep` + `MetricType.Resistance` pairs |
| **Formula** | `volume = Σ(reps × weight)` |
| **Produces** | Per-exercise: `"Total Volume"` with exercise metadata; Workout: `"Volume Load"` |

---

### SessionLoadProjectionEngine
**File:** [src/timeline/analytics/analytics/engines/SessionLoadProjectionEngine.ts](../src/timeline/analytics/analytics/engines/SessionLoadProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Path** | `calculateFromWorkout` |
| **Reads** | `MetricType.Elapsed` (total duration) + `MetricType.Effort` (RPE mapping) |
| **Formula** | Foster sRPE: `load = sRPE × durationMinutes` |
| **Effort→RPE** | easy: 3, moderate: 5, hard: 7, all-out/max: 10; defaults to 5 |
| **Produces** | `{ name: 'Training Load', value: load, unit: 'AU' }` |

---

### MetMinuteProjectionEngine
**File:** [src/timeline/analytics/analytics/engines/MetMinuteProjectionEngine.ts](../src/timeline/analytics/analytics/engines/MetMinuteProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Path** | `calculateFromWorkout` |
| **Reads** | `MetricType.Action` (exercise name for MET lookup) + `MetricType.Elapsed` |
| **Formula** | `metMin += METs × (elapsed / 60000)` |
| **MET table** | run: 9.8, jog: 7.0, walk: 3.5, row: 8.5, cycle: 8.0, burpee: 10.0, rest: 1.0; default: 6.0 |
| **Produces** | `{ name: 'Energy', value: round(Σmet-min), unit: 'MET-min' }` |

---

## Data Flow

```
Runtime emits segment
        │
        ▼
  AnalyticsEngine.run(segment)
        │
        ├─► PaceEnrichmentProcess.process()    ─► adds Pace metrics
        ├─► PowerEnrichmentProcess.process()    ─► adds Power metric
        └─► ProjectionSyncProcess.process()
                │
                ├─► AnalysisService.runWorkoutProjections(allMetrics)
                │       ├─► RepProjectionEngine.calculateFromWorkout()
                │       ├─► DistanceProjectionEngine.calculateFromWorkout()
                │       ├─► VolumeProjectionEngine.calculateFromWorkout()
                │       ├─► SessionLoadProjectionEngine.calculateFromWorkout()
                │       └─► MetMinuteProjectionEngine.calculateFromWorkout()
                │
                ├─► AnalysisService.runAllProjectionsFromFragments(allMetrics)
                │       └─► VolumeProjectionEngine.calculateFromFragments() (per exercise)
                │
                └─► tracker.recordMetric('session-totals', …)
                            │
                            ▼
                    MetricTrackerCard (above timer)
```

---

## Metric Type Reference

| MetricType | Meaning | Producer |
|------------|---------|---------|
| `Rep` | Repetition count | Parser / runtime |
| `Resistance` | Weight / load | Parser / runtime |
| `Distance` | Distance traveled | Parser / runtime |
| `Elapsed` | Active time (Σ end−start) | Runtime |
| `Action` | Exercise name string | Parser |
| `Effort` | RPE label or number | Parser / runtime |
| `Metric` | Generic derived metric | Enrichment processes |

## Metric Origin Precedence

| Tier | Origins | Authority |
|------|---------|-----------|
| 0 (highest) | `user`, `collected`, `execution` | User-provided overrides |
| 1 | `runtime`, `tracked`, `analyzed` | Measured / derived |
| 2 | `compiler`, `hinted` | Synthesized |
| 3 (lowest) | `parser` | Parsed plan |

All enrichment processes emit metrics with origin `'analyzed'` (tier 1).


---

## Architecture Overview

The system has two parallel pipelines:

### Pipeline A — Core Analytics Engine (`src/core/analytics/`)

Real-time processing during workout execution. Each `IAnalyticsProcess` implementation receives every `IOutputStatement` as it flows through the runtime and may either **decorate** it (add metrics in-place) or accumulate state for later. When execution ends, `finalize()` is called to produce new summary `analytics`-type entries.

- `IAnalyticsProcess.process(output)` — called per segment; returns (possibly enriched) statement
- `IAnalyticsProcess.finalize()` — called once at end; returns zero or more new `analytics` entries

**Subtype: `IEnrichmentProcess`** — stateless decoration only; `finalize()` always returns `[]`.

### Pipeline B — Projection Service (`src/timeline/analytics/analytics/`)

Post-execution analysis of collected metrics grouped by exercise. Currently has one engine (`VolumeProjectionEngine`).

---

## Registered Processes (in order)

From [src/components/workbench/useWorkbenchRuntime.ts](../src/components/workbench/useWorkbenchRuntime.ts):

```
RunningSumProcess('repetitions', MetricType.Rep)
RunningSumProcess('resistance', MetricType.Resistance)
RepAnalyticsProcess
DistanceAnalyticsProcess
WeightAnalyticsProcess
PaceEnrichmentProcess
PowerEnrichmentProcess
VolumeLoadProcess
MetMinuteProcess
SessionLoadProcess
UnifiedIntensityProcess
ACWRProcess
TrackerSyncProcess
```

---

## Aggregation Processes (create finalized summaries)

### RunningSumProcess

**File:** [src/core/analytics/RunningSumProcess.ts](../src/core/analytics/RunningSumProcess.ts)

**Hybrid** — both decorates each segment AND creates one finalized entry.

| Aspect | Details |
|--------|---------|
| **Triggers on** | Any segment containing a metric matching the configured `MetricType` (instantiated twice: `MetricType.Rep` and `MetricType.Resistance`) |
| **Cross-segment state** | `total` — running sum of all matching metric values seen so far |
| **Decoration** | YES — appends a `MetricType.Metric` metric to *each* processed segment showing the current running total at that point |
| **Finalized output** | ONE `analytics` entry: `"Final Total {label}"` with the grand total |
| **Calculation** | `total += metric.value` for each matching metric per segment |

---

### RepAnalyticsProcess

**File:** [src/core/analytics/RepAnalyticsProcess.ts](../src/core/analytics/RepAnalyticsProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | `MetricType.Rep` present in segment |
| **Cross-segment state** | `totalReps`, `totalElapsed`, `repsByEffort` (map of effort name → rep count) |
| **Decoration** | No |
| **Finalized output** | THREE `analytics` entries: |
| | 1. **Total Reps** — grand total (`MetricType.Rep`) |
| | 2. **Reps by Effort** — one entry per distinct effort label (`MetricType.Rep`) |
| | 3. **Reps per Second** — throughput metric (`MetricType.Metric`) |
| **Calculation** | `reps/sec = totalReps / (totalElapsed / 1000)` |

---

### DistanceAnalyticsProcess

**File:** [src/core/analytics/DistanceAnalyticsProcess.ts](../src/core/analytics/DistanceAnalyticsProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | `MetricType.Distance` present in segment |
| **Cross-segment state** | `totalDistance`, `totalElapsed`, `distanceByEffort` |
| **Decoration** | No |
| **Finalized output** | THREE `analytics` entries: |
| | 1. **Total Distance** (`MetricType.Distance`) |
| | 2. **Distance by Effort** — one entry per effort label (`MetricType.Distance`) |
| | 3. **Distance per Second** (`MetricType.Metric`) |
| **Calculation** | `distance/sec = totalDistance / (totalElapsed / 1000)` |

---

### WeightAnalyticsProcess

**File:** [src/core/analytics/WeightAnalyticsProcess.ts](../src/core/analytics/WeightAnalyticsProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | `MetricType.Resistance` present in segment |
| **Cross-segment state** | `totalWeight` (volume load = reps × weight), `totalElapsed`, `weightByEffort` |
| **Decoration** | No |
| **Finalized output** | THREE `analytics` entries: |
| | 1. **Total Weight** (`MetricType.Resistance`) |
| | 2. **Weight by Effort** — one entry per effort label (`MetricType.Resistance`) |
| | 3. **Weight per Second** (`MetricType.Metric`) |
| **Calculation** | Per segment: `weight += reps × resistance.amount` (only when reps > 0); `weight/sec = totalWeight / (totalElapsed / 1000)` |

---

### VolumeLoadProcess

**File:** [src/core/analytics/VolumeLoadProcess.ts](../src/core/analytics/VolumeLoadProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment containing BOTH `MetricType.Rep` AND `MetricType.Resistance` |
| **Cross-segment state** | `runningVolume = Σ(reps × weight)` |
| **Decoration** | No |
| **Finalized output** | ONE `analytics` entry: **Total Volume Load** (`MetricType.Volume`) |
| **Calculation** | `volume += reps × weight.amount` per segment |

---

### MetMinuteProcess

**File:** [src/core/analytics/MetMinuteProcess.ts](../src/core/analytics/MetMinuteProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment containing elapsed time and an exercise/action name |
| **Cross-segment state** | `accumulatedMetMinutes` |
| **Decoration** | No |
| **Finalized output** | ONE `analytics` entry: **Total Energy (MET-minutes)** (`MetricType.Work`) |
| **Calculation** | `met_min += METs × (timeMs / 60000)` where METs is looked up from a built-in table (run: 9.8, jog: 7.0, walk: 3.5, row: 8.5, cycle: 8.0, …) |

---

### SessionLoadProcess

**File:** [src/core/analytics/SessionLoadProcess.ts](../src/core/analytics/SessionLoadProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | `MetricType.Effort` (effort level / RPE) + elapsed time |
| **Cross-segment state** | `maxRpe` (highest RPE seen), `totalElapsedMs` |
| **Decoration** | No |
| **Finalized output** | ONE `analytics` entry: **Training Load (AU)** (`MetricType.Load`) with sRPE metadata |
| **Calculation** | `sessionLoad = sRPE × (totalElapsed / 60000)` (Foster sRPE methodology); effort → RPE mapping: easy: 3, moderate: 5, hard: 7, all-out/max: 10 |

---

### UnifiedIntensityProcess

**File:** [src/core/analytics/UnifiedIntensityProcess.ts](../src/core/analytics/UnifiedIntensityProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Duration/elapsed time + effort level |
| **Cross-segment state** | `totalElapsedMs`, `maxRpe` |
| **Decoration** | No |
| **Finalized output** | ONE `analytics` entry: **TIS (Training Intensity Score)** 0–100 (`MetricType.Intensity`) |
| **Calculation** | Composite weighted score: `TIS = (normMet × 0.30) + (normRpe × 0.35) + (normDuration × 0.20) + (normDiscipline × 0.15)` where normalizations are: MET / 20 × 100, RPE / 10 × 100, duration / 90 × 100; labels: Light < 30, Moderate 30–60, Vigorous 60–80, Extreme > 80 |

---

### ACWRProcess

**File:** [src/core/analytics/ACWRProcess.ts](../src/core/analytics/ACWRProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Duration + effort (acute vs. chronic workload ratio) |
| **Cross-segment state** | `totalElapsedMs`, `maxRpe`, historical acute/chronic loads (configurable) |
| **Decoration** | No |
| **Finalized output** | ONE to TWO `analytics` entries: |
| | 1. **ACWR** ratio value (`MetricType.Intensity`) |
| | 2. **High-Risk Warning** entry added only when ACWR > 1.5 (`MetricType.Label`) |
| **Calculation** | `ACWR = (historicalAcute + sessionLoad) / historicalChronic` |

---

## Enrichment Processes (decorate existing segments only)

These implement `IEnrichmentProcess`. They are **stateless** (no cross-segment accumulation), add metrics directly onto each segment that qualifies, and their `finalize()` always returns `[]`.

### PaceEnrichmentProcess

**File:** [src/core/analytics/PaceEnrichmentProcess.ts](../src/core/analytics/PaceEnrichmentProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment containing (`MetricType.Rep` OR `MetricType.Distance`) + `MetricType.Elapsed` |
| **Decoration** | YES — adds `MetricType.Metric` values with type `'pace'` to the segment (`origin: 'analyzed'`): |
| | 1. **Pace (reps/min)** = `reps / elapsedMinutes` |
| | 2. **Pace (m/s)** = `distance / elapsedSeconds` |
| | 3. **Pace (min/km)** = `elapsedMinutes / distanceKm` |
| **Finalized output** | None |

---

### PowerEnrichmentProcess

**File:** [src/core/analytics/PowerEnrichmentProcess.ts](../src/core/analytics/PowerEnrichmentProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Segment containing `MetricType.Rep` + `MetricType.Resistance` + `MetricType.Elapsed` |
| **Decoration** | YES — adds ONE `MetricType.Metric` value to the segment (`origin: 'analyzed'`): |
| | **Power (units/s)** = `(reps × weight) / elapsedSeconds` |
| **Finalized output** | None |
| **Notes** | Unit is taken from the resistance metric's `amount` field |

---

## Post-Process Bridge

### TrackerSyncProcess

**File:** [src/core/analytics/TrackerSyncProcess.ts](../src/core/analytics/TrackerSyncProcess.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | Any segment containing metrics with `MetricType` in: Volume, Intensity, Load, Work, Metric |
| **Decoration** | No |
| **Finalized output** | None (bridge only — no new entries) |
| **Purpose** | Scans processed output for analytics-derived metrics and records them in the live tracker under block ID `'session-totals'`; derives a short display key from the label (e.g. `"Total repetitions: 50"` → `"Reps"`) |

---

## Pipeline B — Projection Service

### VolumeProjectionEngine

**File:** [src/timeline/analytics/analytics/engines/VolumeProjectionEngine.ts](../src/timeline/analytics/analytics/engines/VolumeProjectionEngine.ts)

| Aspect | Details |
|--------|---------|
| **Triggers on** | `IMetric[]` grouped by exercise name, containing Rep + Resistance pairs |
| **Decoration** | N/A (post-execution, not segment-level) |
| **Output** | `ProjectionResult` — `{ name: "Total Volume", value: totalVolume, unit: "kg", metadata: { exerciseName, totalSets, source: 'metrics' } }` |
| **Calculation** | `totalVolume = Σ(rep[i] × resistance[i])` across all sets for the exercise |

---

## Metric Type Reference

| MetricType | Meaning | Who produces it |
|------------|---------|----------------|
| `Rep` | Repetition count | Parser/runtime; accumulated by RepAnalyticsProcess |
| `Resistance` | Weight/load amount | Parser/runtime; accumulated by WeightAnalyticsProcess |
| `Distance` | Distance traveled | Parser/runtime; accumulated by DistanceAnalyticsProcess |
| `Elapsed` | Active time (Σ end−start) | Runtime |
| `Effort` | Exercise name or RPE descriptor | Parser/runtime |
| `Metric` | Generic analytical metric (derived) | Enrichment processes, RunningSumProcess |
| `Volume` | Volume load (reps × weight) | VolumeLoadProcess |
| `Intensity` | TIS score or ACWR ratio | UnifiedIntensityProcess, ACWRProcess |
| `Load` | Training load in arbitrary units | SessionLoadProcess |
| `Work` | MET-minutes (energy proxy) | MetMinuteProcess |
| `Label` | Text annotations | Various (effort names, warnings) |

## Metric Origin Precedence

When multiple metrics of the same type exist, the system resolves by origin tier:

| Tier | Origins | Authority |
|------|---------|-----------|
| 0 (highest) | `user`, `collected`, `execution` | User-provided overrides |
| 1 | `runtime`, `tracked`, `analyzed` | Measured/derived during execution |
| 2 | `compiler`, `hinted` | Synthesized/suggested |
| 3 (lowest) | `parser` | Parsed from source script (the "plan") |

All analytics processes emit metrics with origin `'analyzed'` (tier 1).
