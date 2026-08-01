# Analytics Calculations — Current Code vs. Composed Format

Status: **draft for reaction** — feeds [#849 (migration plan)](https://github.com/SergeiGolos/wod-wiki/issues/849).
Map: [#843](https://github.com/SergeiGolos/wod-wiki/issues/843) · Decisions applied: [#844 (expression language)](https://github.com/SergeiGolos/wod-wiki/issues/844), [#845 (lookup registry)](https://github.com/SergeiGolos/wod-wiki/issues/845), [#846 (scopes & streaming)](https://github.com/SergeiGolos/wod-wiki/issues/846).

This document reviews every built-in analytics calculation as it exists in code today, then re-expresses it in the composed-calculation format — twice: a structured record form (§1–8) and a line-oriented authoring syntax proposed in §11 as a simpler alternative. Both are **notation, not shipped syntax** — the point is to make the decisions concrete enough to attack.

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

---

## 11. Third option: line-oriented calc syntax

The YAML record form above is faithful to the registry model but hard to *think* in: one-line formulas sprawl across 15 lines of ceremony, the expression sits far from its unit, and variants read as infrastructure instead of "same math, degraded provenance." This section proposes a **line-oriented authoring syntax** over the identical DAG semantics — same nodes, same variants, same scopes; only the surface changes. The record form stays as the canonical storage/interchange format; this is what humans read and write.

### 11.1 The rules (complete)

1. `name = expr -> unit` — one output calc, one node, declared output unit. `-> auto` = unit follows the source values (dimension-aware).
2. `key X` — published Canonical Metric Key (workout/store scope). In segment scope its absence means: emit an annotation whose metric type is the calc's name.
3. `when <predicate>` — applicability. May trail a calc line or a `|`/`estimated` alternate. Section headers may carry shared `on [fences]` and `when` clauses applying to every calc beneath.
4. `expr1 | expr2 [estimated] [when P]` — priority-ordered **variant sugar** (not expression-level fallback; #844's no-fallback decision stands). Each alternate is a variant; `estimated` sets its origin to `analyzed-estimated`.
5. `estimated when P` trailing a calc line — the common "same math, degraded provenance" case: one expression, origin switches to `analyzed-estimated` when P holds. Sugar for a two-variant pair with identical expressions.
6. `where a = …, b = …` (indented lines under a calc) — named intermediate nodes; the calc's DAG bindings. Indentation = referenceable only by that calc.
7. `(library)` — library calc: exports its nodes, publishes nothing. References to library nodes are qualified (`shared-met.metMax` style becomes just the name when imported into scope).
8. `by {dim} grouped` — grouped emission: one published fact per group, group key as tag.
9. Section headers `segment:` / `workout:` / `store:` set scope for everything beneath.
10. Anything the sugar can't express (exotic predicate logic, unusual emission shapes) drops to the record form — the escape hatch is always open.

### 11.2 All eight calculations, rewritten

```
# ── segment scope ────────────────────────────────────────────
segment on [wod, log] when elapsed > 0:

pace.reps   = reps / convert(elapsed, min)                  -> reps/min   when has(reps)
pace.speed  = distance / convert(elapsed, s)                -> m/s        when has(distance)
pace.runner = convert(elapsed, min) / convert(distance, km) -> min/km     when has(distance)
power       = reps * resistance / convert(elapsed, s)       -> auto       when has(reps) and has(resistance)

segment:
segmentVolume = reps * resistance              (library)    when has(reps) and has(resistance)
effortRpe     = lookup("rpe-labels", effortLabel, "rpe")  (library)    when has(effortLabel)
metMinutes    = lookup("effort", effort, "met") * convert(elapsed, min)  (library)  when elapsed > 0
                estimated when lookup("effort", effort, "resolvedFrom") == "default"

# ── workout scope ────────────────────────────────────────────
workout on [wod, log, plan]:

reps        = sum:reps{}                                       -> reps    key reps
reps        = sum:reps{!effort:rest|pause|rest-*} by {effort}  -> reps    key reps   grouped
distance    = sum:distance{}                                   -> auto    key distance
totalVolume = sum:segmentVolume{}                              -> auto    key totalVolume
totalVolume = sum:segmentVolume{} by {effort}                  -> auto    key totalVolume  grouped

workout on [wod, log]:

metMinutes  = round(sum:metMinutes{})                          -> MET-min key calc.metMinutes
sessionLoad = round(rpe * convert(session.duration, min))      -> AU      key sessionLoad
  where rpe = sessionRpe | max:effortRpe{} | 5 estimated

workout on [wod, log, plan] when has(sum:metMinutes{}) and has(sum:elapsed{}):

metMax = profile.vo2max / 3.5 | 11.4 estimated     (library)

tis = round(0.30*metScore + 0.35*rpeScore + 0.20*durationScore + 0.15*discipline, 1)  -> pts  key tis
  where avgMets    = sum:metMinutes{} / convert(sum:elapsed{}, min)
        metScore   = min(100, avgMets / metMax * 100)
        rpeScore   = (sessionRpe | max:effortRpe{} | 5 estimated) * 10
        durationScore = convert(sum:elapsed{}, min) / 60 * metScore
        discipline = lookup("effort", effort, "disciplineFactor")
```

That's the entire built-in analytics suite — **~25 lines** against ~600 lines of TypeScript and ~170 lines of YAML records.

### 11.3 Side-by-side on one calc

Current code (SessionLoadProjectionEngine): ~110 lines of TypeScript including the hierarchy-aware duration heuristic.

Record form: 3 variants × full YAML blocks ≈ 45 lines.

Line form: **2 lines** — one calc line + one `where` line — plus the `session.duration` engine requirement (§10.2), which all three forms share.

### 11.4 What the line form buys, what it costs

**Buys:**

- *Reading order = thinking order.* Name, formula, unit, condition on one line; the whole system fits on one screen, so cross-calc patterns (three pace calcs share a shape; `| … estimated` recurs) become visible.
- *The variant mechanism becomes legible.* `sessionRpe | max:effortRpe{} | 5 estimated` reads exactly like the domain rule it encodes; the YAML version buries it in priority integers and repeated node graphs.
- *Section-level defaults* (`on [wod, log] when elapsed > 0`) kill the repeated applicability boilerplate that made the YAML noisy.
- `estimated when P` dissolves the most common variant pair (same math, degraded origin) into a clause — metMinutes, the frequent case, stays one line.

**Costs:**

- A second parser. Mitigated: line-oriented, no nesting deeper than `where` indentation, atoms still delegated to the existing WQL parser (#844 decision 6) — this is a small Lezer or even hand-rolled grammar, not a language design project.
- Sugar can blur the model: `|` *looks* like expression fallback but is variant selection. The `estimated` marker is the tell, and the record form remains the unambiguous reference.
- Tooling (validation, composer UI, error spans) speaks the record form; the line form needs a lossless compile to it. The two forms must round-trip or the line form becomes a second source of truth — **round-trip fidelity is a hard requirement, not a nicety.**

### 11.5 Recommendation

Adopt both, layered: **line form for authoring and review** (registry seed files, docs, code review, this document), **record form for storage, validation, and tooling** (registry entries, user overrides in IndexedDB, composer diagnostics). The line form compiles to DAG records; the DAG records are what #849's migration registers. If only one can exist, keep the record form — but the ~7:1 line-count ratio on real calcs argues the authoring surface is worth the small parser.

### 11.6 Authoring UX: guided typeahead for calc lines

The line syntax's residual complexity is best attacked with tooling, not more syntax. The repo already ships every piece of scaffolding this needs (map #822): the token-slot `WqlComposer` core + `ComposerRegistry` custom slots, data-backed typeahead sources (#831: efforts, disciplines, tags, metric keys — exactly what `lookup()` keys and WQL atoms complete from), inline validation with per-clause error attribution (#832), and Lezer-grammar CM6 editing with completion precedent (`WqlQueryField`, `dialectCompletion`).

New work, in increasing order of novelty:

1. **Calc-line Lezer grammar** — needed regardless; small (line-oriented, one nesting level, atoms delegated to the WQL parser).
2. **Expression completion** — context-aware suggestions inside the expression slot: metric names, `lookup(` → table → field (self-describing from #845 adapters), the 9 core functions, scope-appropriate context nodes (`effort`, `session.duration`, `profile.*`).
3. **Dimension-aware feedback** — the composer surfaces the computed dimension live ("time ÷ length — suggested units: min/km, sec/m") and flags output-unit mismatches. Depends on #851's compound-dimension model, which exists anyway.
4. **Live preview** — the headless AnalyticsEngine (`workoutDerivation` drives it over stored logs, no runtime) evaluates the draft calc against the user's real past workouts. Wiring, not research — and the strongest correctness signal a user can get.

Deliberately excluded: a fully guided dropdown-only builder — it collapses on TIS-shaped multi-intermediate formulas. Text + completion + diagnostics + preview is the codebase's proven pattern.
