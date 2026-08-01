# Analytics Calculations — Current Code vs. Composed Format

Status: **draft for reaction** — feeds [#849 (migration plan)](https://github.com/SergeiGolos/wod-wiki/issues/849).
Map: [#843](https://github.com/SergeiGolos/wod-wiki/issues/843) · Decisions applied: [#844 (expression language)](https://github.com/SergeiGolos/wod-wiki/issues/844), [#845 (lookup registry)](https://github.com/SergeiGolos/wod-wiki/issues/845), [#846 (scopes & streaming)](https://github.com/SergeiGolos/wod-wiki/issues/846).

This document reviews every built-in analytics calculation as it exists in code today, then re-expresses it in the composed-calculation format. The proposed sections are **notation, not shipped syntax** — the point is to make the decisions concrete enough to attack.

---

## 0. Format primer (per the closed tickets)

```yaml
calc: <id>
kind: output | library        # library exports nodes for reuse, publishes nothing
scope: segment | workout | store
applies:
  fence: [wod, log]           # successor to fenceTypes
  when: <predicate>           # successor to requiredMetrics — applicability variant selection
variants:                     # ordered by priority, first applicable wins (no fallback syntax)
  - id: <variant id>
    priority: <n>
    when: <predicate>
    origin: analyzed | analyzed-estimated   # declared statically per variant
    nodes:
      <nodeId>:
        expr: <expression>    # inline WQL atoms, lookup(table, key, field), convert(x, unit)
output:
  node: <nodeId>
  key: <canonical metric key> # workout/store scope (totalVolume, tis, calc.*)
  emit: { type: <metric type>, unit: <unit> }   # segment scope (annotations)
```

Ground rules from the tickets:

- **Segment scope**: atoms are the current segment's metrics (`elapsed`, `reps`, `distance`, `resistance`) plus the context node `effort` (this line's resolved effort). Results append to the segment's own OutputStatement as `analyzed` metrics (phase 1).
- **Workout scope**: atoms are WQL selections over the enriched log stream (`sum:reps{}`, `sum:metMinutes{}`) plus context nodes. Results publish under existing Canonical Metric Keys (phase 2).
- **Recompute-all** after each segment; replay strips `analyzed`, freezes `analyzed-estimated`.
- **Dimension-aware**: values carry (number, unit, dimension); `convert(x, min)` is explicit; output units are checked against computed dimensions.

---

## 1. PaceEnrichmentProcess — segment scope

**Today** (`src/core/analytics/PaceEnrichmentProcess.ts`): on each leaf segment with `elapsed > 0`, emits up to three `pace` metrics — reps/min (from summed Rep values), m/s, and min/km (from Distance). Hardcoded ms→min/sec conversions, `toFixed` rounding inline, fence filter `wod, log`.

**Proposed:**

```yaml
calc: pace-reps
kind: output
scope: segment
applies:
  fence: [wod, log]
  when: has(reps) and has(elapsed) and elapsed > 0
nodes:
  value:
    expr: reps / convert(elapsed, min)
output:
  node: value
  emit: { type: pace, unit: reps/min }
  origin: analyzed
---
calc: pace-speed
kind: output
scope: segment
applies:
  fence: [wod, log]
  when: has(distance) and has(elapsed) and elapsed > 0
nodes:
  value:
    expr: distance / convert(elapsed, s)
output:
  node: value
  emit: { type: pace, unit: m/s }
  origin: analyzed
---
calc: pace-runner
kind: output
scope: segment
applies:
  fence: [wod, log]
  when: has(distance) and has(elapsed) and elapsed > 0
nodes:
  value:
    expr: convert(elapsed, min) / convert(distance, km)
output:
  node: value
  emit: { type: pace, unit: min/km }
  origin: analyzed
```

**Notes:** today's three emissions become three calcs — more entries, each trivial. `convert()` replaces the `/1000/60` constants; dimension algebra validates `min/km` as time÷length (the compound-dimension model, #851). Rounding moves out of the calc to the display layer (today it's baked into the stored value — a wart).

---

## 2. PowerEnrichmentProcess — segment scope

**Today**: on each leaf segment with Rep + Resistance + elapsed: `power = (reps × weightKg) / elapsedSec`, unit string taken from the resistance metric (`kg/s` or `lb/s`). `requiredMetrics: [Rep, Resistance]`.

**Proposed:**

```yaml
calc: power
kind: output
scope: segment
applies:
  fence: [wod, log]
  when: has(reps) and has(resistance) and has(elapsed) and elapsed > 0
nodes:
  volumeLoad:
    expr: reps * resistance
  value:
    expr: volumeLoad / convert(elapsed, s)
output:
  node: value
  emit: { type: power, unit: auto }   # kg/s or lb/s follows the resistance unit — dimension-aware
  origin: analyzed
```

**Notes:** the `units` string-plumbing disappears — mass÷time is the computed dimension and the display unit follows the source resistance unit. `requiredMetrics` becomes the `when:` predicate, which is strictly more expressive.

---

## 3. RepProjectionEngine — workout scope

**Today**: two passes. Overall: sum all numeric Rep metrics → "Total Reps". Per-effort: walk segment outputs, resolve each segment's effort (skipping `rest`/`pause`/`rest-*`), sum reps per effort slug → one "Total Reps" projection per effort with `effortSlug` metadata.

**Proposed:**

```yaml
calc: total-reps
kind: output
scope: workout
applies:
  fence: [wod, log, plan]
  when: has(sum:reps{})
nodes:
  total:
    expr: sum:reps{}
  perEffort:
    expr: sum:reps{!effort:rest|pause|rest-*} by {effort}
output:
  node: [total, perEffort]      # total publishes one fact; perEffort publishes one fact per group
  key: reps
  unit: reps
  origin: analyzed
```

**Notes:** the hand-rolled per-effort grouping loop collapses into WQL `by {effort}` — the Query Service already does grouping. Two format requirements surface: (a) **grouped emission** — a `by {}` node publishes one fact per group with the group key as a tag; (b) **multi-value tag negation in workout-scope WQL** — `!effort:rest|pause|rest-*` is legal WQL filter syntax today, but the rest/pause exclusion convention needs to be pinned down (today it's three string checks in code).

---

## 4. DistanceProjectionEngine — workout scope

**Today**: sums `Distance` amounts, preserving the source unit string; emits "Total Distance".

**Proposed:**

```yaml
calc: total-distance
kind: output
scope: workout
applies:
  fence: [wod, log, plan]
  when: has(sum:distance{})
nodes:
  total:
    expr: sum:distance{}
output:
  node: total
  key: distance
  unit: auto        # follows source unit; dimension = length
  origin: analyzed
```

**Notes:** the simplest possible migration — one node. The `{amount, units}` object unwrapping in today's code disappears into the dimension-aware value model.

---

## 5. VolumeProjectionEngine — workout scope

**Today**: **stateful stream pairing** — walks metrics in order, pairs each Rep with the next Resistance ("a set is when both are encountered, then reset"), sums `reps × resistance` per pairing. Overall pass + per-exercise pass (groups by most-recent Effort metric). This is the hardest processor to re-express: the pairing logic is sequential scan state, not aggregation.

**Proposed:**

```yaml
calc: segment-volume
kind: library                # per-segment volume, reusable
scope: segment
applies:
  when: has(reps) and has(resistance)
nodes:
  volume:
    expr: reps * resistance
export: [volume]
---
calc: total-volume
kind: output
scope: workout
applies:
  fence: [wod, log, plan]
  when: has(sum:segmentVolume{})
nodes:
  total:
    expr: sum:segmentVolume{}
  perEffort:
    expr: sum:segmentVolume{} by {effort}
output:
  node: [total, perEffort]
  key: totalVolume
  unit: auto                  # kg·reps — compound dimension mass×count
  origin: analyzed
```

**Notes:** the honest gap — today's pairing tolerates Rep and Resistance arriving as *separate metrics within one statement* and resets after pairing; the proposed form requires both on the same segment, which the metric model already guarantees in practice (a line fuses to one segment's metric set). **Parity testing (#849) must prove the pairing semantics match on real logs**, including the `totalSets` metadata today's per-exercise pass emits (candidate: `count:segmentVolume{} by {effort}`). Also note today's hardcoded `unit: "kg"` per-exercise emission — the composed form carries the real source unit instead.

---

## 6. MetMinuteProjectionEngine — segment + workout composition

**Today**: walks the flat metric stream carrying "last seen effort-data" — for each Elapsed metric, adds `(lastEffort.met ?? DEFAULT_UNRESOLVED_EFFORT_MET) × elapsedMin`. Origin = dominant over collected origins (any estimated → estimated).

**Proposed:**

```yaml
calc: met-minutes-segment
kind: library
scope: segment
applies:
  when: has(elapsed) and elapsed > 0
variants:
  - id: resolved
    priority: 100
    when: lookup("effort", effort, "resolvedFrom") != "default"
    origin: analyzed
    nodes:
      metMinutes:
        expr: lookup("effort", effort, "met") * convert(elapsed, min)
  - id: unresolved
    priority: 10
    when: true                        # effort table's default-row miss policy guarantees a row
    origin: analyzed-estimated
    nodes:
      metMinutes:
        expr: lookup("effort", effort, "met") * convert(elapsed, min)
export: [metMinutes]
---
calc: met-minutes
kind: output
scope: workout
applies:
  fence: [wod, log]
  when: has(sum:metMinutes{})
nodes:
  total:
    expr: round(sum:metMinutes{})
output:
  node: total
  key: calc.metMinutes
  unit: MET-min
  origin: analyzed                  # see note
```

**Notes:** this is the showcase for the two-phase design (#846) — the per-segment "last seen effort" scan state evaporates because each segment evaluates with its own `effort` context node. The `sum:metMinutes{}` atom aggregates phase-1 annotations. **Tension to resolve in #849:** today's origin is *dominant across segments* (one unresolved segment flags the whole workout estimated); variant origins are per-calc static. The workout-scope calc can't see which segment variants fired — options: (a) workout variants predicate on `count:metMinutesEstimated{}` (a companion estimated-only emission), or (b) the engine propagates dominant origin across aggregated annotations automatically. (b) is a small engine rule and matches today's semantics exactly.

---

## 7. SessionLoadProjectionEngine — workout scope

**Today**: Foster sRPE: `sessionLoad = sRPE × durationMin`. Duration comes from **hierarchy-aware elapsed logic** — root segment's elapsed if present, else sum of leaf segments, else a max-vs-rest heuristic (guards double-counting parent+child elapsed). sRPE = SessionRPE metric if present, else max effort-label RPE via a hardcoded `effortToRpe` map, else default 5.

**Proposed:**

```yaml
calc: session-load
kind: output
scope: workout
applies:
  fence: [wod, log]
variants:
  - id: captured-rpe
    priority: 100
    when: has(sessionRpe)           # user-captured post-workout RPE is authoritative
    origin: analyzed
    nodes:
      load:
        expr: round(sessionRpe * convert(session.duration, min))
  - id: label-rpe
    priority: 50
    when: has(max:effortRpe{})
    origin: analyzed
    nodes:
      load:
        expr: round(max:effortRpe{} * convert(session.duration, min))
  - id: default-rpe
    priority: 10
    when: true
    origin: analyzed-estimated
    nodes:
      load:
        expr: round(5 * convert(session.duration, min))
output:
  node: load
  key: sessionLoad
  unit: AU
  origin: <variant's>
```

plus a segment-scope library calc producing `effortRpe` per line:

```yaml
calc: effort-rpe
kind: library
scope: segment
applies:
  when: has(effortLabel)
nodes:
  effortRpe:
    expr: lookup("rpe-labels", effortLabel, "rpe")
export: [effortRpe]
```

**Notes:** two format requirements surface. (a) **`session.duration` context node** — the hierarchy-aware elapsed disambiguation (root vs leaf double-count guard) is engine knowledge, not expressible as WQL over flat metrics; the engine must expose session duration as a workout-scope context node. This *improves* on today, where the same heuristic is hand-copied with a metrics-only fallback path. (b) the duplicated `effortToRpe` map (here AND in TISProcessor) becomes the shared `rpe-labels` lookup table — the lookup registry's first proof of value. The `default 5` fallback becomes an explicit `analyzed-estimated` variant — today it's silent.

---

## 8. TISProcessor — workout scope, the stress test

**Today**: `TIS = 0.30×metScore + 0.35×rpeScore + 0.20×durationScore + 0.15×disciplineFactor`, with metMax from VO2max (fallback 11.4), RPE from SessionRPE → max effort-label RPE → 5, duration from total elapsed, METs per segment from resolved effort (fallback default MET), discipline factor from last resolved effort. Origin tracked by hand across all fallback paths; rich metadata payload.

**Proposed:**

```yaml
calc: shared-met
kind: library
scope: workout
variants:
  - id: personalized
    priority: 100
    when: has(profile.vo2max)
    nodes:
      metMax: { expr: profile.vo2max / 3.5 }
  - id: population
    priority: 10
    when: true
    nodes:
      metMax: { expr: 11.4 }
export: [metMax]
---
calc: tis
kind: output
scope: workout
applies:
  fence: [wod, log, plan]
  when: has(sum:metMinutes{}) and has(sum:elapsed{})
variants:
  - id: captured-rpe
    priority: 100
    when: has(sessionRpe) and has(profile.vo2max)
    origin: analyzed
    nodes:
      elapsedMin:       { expr: convert(sum:elapsed{}, min) }
      avgMets:          { expr: sum:metMinutes{} / elapsedMin }
      metScore:         { expr: min(100, avgMets / shared-met.metMax * 100) }
      rpeScore:         { expr: sessionRpe * 10 }
      durationScore:    { expr: elapsedMin / 60 * metScore }
      disciplineFactor: { expr: lookup("effort", effort, "disciplineFactor") }
      tis:
        expr: round(0.30 * metScore + 0.35 * rpeScore + 0.20 * durationScore + 0.15 * disciplineFactor, 1)
  - id: estimated
    priority: 10
    when: true
    origin: analyzed-estimated
    nodes:
      # same graph; shared-met.metMax resolves via the population variant,
      # rpeScore uses max:effortRpe{} (label-rpe) or the default-5 variant
      ...
output:
  node: tis
  key: tis
  unit: pts
  origin: <variant's>
```

**Notes:** the variant matrix is the honest cost of #844's no-fallback decision — TIS has three independent fallback axes (vo2max, RPE source, effort resolution), and full Cartesian variants would be 8 entries. The proposed form avoids the explosion by composing *library* variants (shared-met, effort-rpe, met-minutes-segment each carry their own variant pair) so `tis` itself needs only two. The metadata payload (metScore, rpeScore, … per-component breakdown) maps naturally to exporting the intermediate nodes as metadata on the published fact — a format requirement: **intermediate nodes optionally publish as fact metadata**. `round(x, 1)` needs the two-arg form in the minimal core.

---

## 9. Not a calc: TwoPassEffortResolutionProcess

`TwoPassEffortResolutionProcess` stays infrastructure. It is not a calculation — it's the bridge that resolves each segment's effort through `IEffortResolver` and attaches `effort-data` metrics. In the new architecture it becomes the feed behind the **effort lookup table adapter** and the `effort` context node (#845). No composed re-expression.

---

## 10. What this review surfaced — format requirements for #849/#851/#848

| # | Requirement | Blocks | Discovered in |
|---|---|---|---|
| 1 | Grouped emission: `by {effort}` nodes publish one fact per group, group key as tag | #849 | Rep, Volume |
| 2 | `session.duration` workout-scope context node (root-vs-leaf disambiguation is engine knowledge) | #849 | SessionLoad |
| 3 | Dominant-origin propagation across aggregated segment annotations (or companion estimated-count pattern) | #849 | MetMinutes |
| 4 | Intermediate nodes publishable as fact metadata (TIS component breakdown) | #849 | TIS |
| 5 | `round(x, decimals)` two-arg form in the minimal core | #844 follow-up | TIS |
| 6 | Rest/pause exclusion convention as shareable WQL filter (`!effort:rest|pause|rest-*`) | #848 | Rep |
| 7 | Compound dimensions with real names: mass×count (volume), time÷length (pace), plus unit-follows-source display | #851 | Power, Volume, Pace |
| 8 | Variant composition via library calcs keeps the variant matrix from exploding cartesianly | #849 | TIS |
| 9 | Rounding moves to display, not stored values (today's pace stores pre-rounded numbers) | #849 | Pace |
| 10 | Segment-scope pairing parity proof: `has(reps) and has(resistance)` on one segment vs. today's sequential scan | #849 | Volume |
