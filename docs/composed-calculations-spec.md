# Composed Calculations Layer — Technical Specification

Status: **Approved Spec** — Destination deliverable for Map [#843](https://github.com/SergeiGolos/wod-wiki/issues/843)  
ADR Reference: [`docs/adr/composed-calculations-layer.md`](adr/composed-calculations-layer.md)  
Review & Prototype Assets: [`docs/calculation-migration-review.md`](calculation-migration-review.md), [`playground/src/pages/CalcAuthoringPrototypePage.tsx`](../playground/src/pages/CalcAuthoringPrototypePage.tsx) (`/proto/calc-authoring`)

---

## 1. Architectural Overview & System Context

The **Composed Calculations Layer** is the single declarative engine for deriving workout metrics across WOD Wiki. It replaces hand-written TypeScript processors with composable calculations declared as expression graphs (node DAGs) or line-form expressions (`name = expr -> unit when predicate`).

### 1.1 Scope Taxonomy & Evaluation Pipeline

Calculations operate across three distinct scopes:

```
                          ┌────────────────────────────────────────────────────────┐
                          │                 SEGMENT COMPLETION EVENT               │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: SEGMENT SCOPE (per-line, live)                                                                  │
│ - Evaluates per leaf segment output statement.                                                           │
│ - Atoms: current segment metrics (reps, elapsed, resistance, distance) + context (effort, effortLabel).  │
│ - Output: appends 'analyzed' metrics directly to segment OutputStatement in log stream.                  │
└─────────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: WORKOUT SCOPE (running totals, live)                                                            │
│ - Evaluates over accumulated history of current workout log stream after Phase 1 completes.              │
│ - Atoms: aggregate builtins (sum, max, min, avg, count, last) + context (session.duration, sessionRpe).  │
│ - Output: re-evaluates all workout-scope calcs; emits replacement 'analytics' OutputStatements.         │
└─────────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │   WORKOUT FINALIZE   │
                                           └──────────┬───────────┘
                                                      │
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STORE SCOPE (cross-workout, eager at finalize)                                                           │
│ - Evaluates across the Analytics Store at workout finalize time.                                         │
│ - Atoms: full WQL selections (sum:sessionLoad{} by {day}) executed via QueryService.                    │
│ - Series Tier: windowMean / windowSum / windowSd over trailing periods + pointwise series arithmetic.    │
│ - Output: writes 'summary', 'rollup', and 'segment' grain fact rows to the Analytics Store.              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Line-Form Syntax & Node DAG Representation

Calculations are authored in a **line-oriented syntax** (§11 of `docs/calculation-migration-review.md`) and compiled into **Node DAG records** for registration, storage, and execution.

### 2.1 Grammar & EBNF

```ebnf
Calculation  ::= ScopeHeader? CalcLine+
ScopeHeader  ::= ("segment" | "workout" | "store") ("on" "[" FenceList "]")? ("when" Predicate)? ":"
FenceList    ::= Identifier ("," Identifier)*
CalcLine     ::= Identifier "=" Expression ("(library)")? ("->" UnitClause)? ("key" KeyClause)? ("when" Predicate)? (WhereClause)?
UnitClause   ::= Identifier | "auto"
KeyClause    ::= Identifier ("grouped")?
WhereClause  ::= "where" Binding ("," Binding)*
Binding      ::= Identifier "=" Expression
Expression   ::= Term (BinaryOp Term)*
Term         ::= UnaryOp? Atom (CallSuffix)*
Atom         ::= Literal | MetricRef | FunctionCall | LookupCall | WqlAtom | "(" Expression ")"
WqlAtom      ::= Aggregator ":" MetricName Filters? GroupBy?  (* Store scope only *)
```

### 2.2 Canonical Node DAG Schema

Every calc line compiles losslessly into a DAG record:

```typescript
export interface CalcNode {
  id: string;
  kind: 'metric' | 'lookup' | 'builtin' | 'wql' | 'expr';
  expression?: string;
  ast?: NodeAST;
}

export interface CalcVariant {
  id: string;
  priority: number;
  when?: string;
  origin: 'analyzed' | 'analyzed-estimated';
  nodes: Record<string, CalcNode>;
}

export interface CalculationDefinition {
  id: string;
  kind: 'output' | 'library';
  scope: 'segment' | 'workout' | 'store';
  fences?: string[];
  when?: string;
  variants: CalcVariant[];
  output?: {
    nodeId: string | string[];
    key?: string;
    emitType?: string;
    unit?: string;
    isGrouped?: boolean;
    publishMetadataNodes?: string[];
  };
}
```

---

## 3. Atom Taxonomy & Function Reference

### 3.1 Atoms by Scope

| Scope | Atom Kind | Syntax / Example | Source / Engine |
|---|---|---|---|
| **Segment** | Segment Metric | `reps`, `elapsed`, `resistance`, `distance` | Current `OutputStatement.metrics` |
| **Segment** | Segment Context | `effort` (resolved slug), `effortLabel` | `TwoPassEffortResolutionProcess` |
| **Workout** | Stream Aggregate | `sum(reps)`, `max(effortRpe)`, `sum(reps, without: rest|pause|rest-*)` | In-memory log stream scan |
| **Workout** | Workout Context | `session.duration`, `sessionRpe`, `profile.vo2max` | Engine & User Profile |
| **Store** | WQL Selection | `sum:sessionLoad{} by {day}` | `QueryService` (Analytics Store) |
| **All** | Lookup | `lookup("table", keyExpr, "field")` | `LookupRegistry` adapters |

### 3.2 Operator & Function Reference

- **Arithmetic:** `+`, `-`, `*`, `/`, unary `-`, `(` `)`
- **Comparison & Logical:** `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `not`
- **Scalar Math:** `min(...)`, `max(...)`, `abs(x)`, `round(x, [decimals])`, `floor(x)`, `ceil(x)`, `clamp(x, min, max)`
- **Unit Conversion:** `convert(x, targetUnit)` — performs vector-checked scalar conversion.
- **Presence Check:** `has(atomName)` — evaluates to `1` if atom is present & valid in context, `0` otherwise.
- **Series Operations (Store Scope):**
  - `windowMean(series, period)` — trailing window mean (e.g. `7d`, `28d`) yielding a series.
  - `windowSum(series, period)` — trailing window sum.
  - `windowSd(series, period)` — trailing population standard deviation ($\div n$).
  - Pointwise arithmetic — `seriesA / seriesB` (requires identical day-bucketing; static registration check).
  - Scalar reductions — `sum(series)`, `mean(series)`, `min(series)`, `max(series)`, `last(series)`.

---

## 4. Lookup Registry Contract & Adapters

Lookups use `lookup(table, key, field)`. Tables are registered adapters satisfying `ILookupTable`.

```typescript
export interface ILookupTable {
  readonly id: string;
  readonly fields: Record<string, { dimension: Dim; type: 'number' | 'string' }>;
  readonly missPolicy: 'absent' | 'default-row';
  get(key: string, field: string): Val | undefined;
}
```

### 4.1 Built-in Tables

1. **`effort`** — Backed by `IEffortResolver`. Fields: `met` (dimensionless), `disciplineFactor` (dimensionless), `discipline` (string), `intensityTier` (string), `resolvedFrom` (string).
   - Miss policy: `default-row` (returns synthetic unresolved row at default MET 4.0, flagged `isEstimated`).
2. **`rpe-labels`** — Maps effort labels (`easy`→3, `moderate`→5, `hard`→7, `all-out`→10, `max`→10).
   - Miss policy: `absent`.
3. **`profile`** — User profile values. Fields: `vo2max`.
   - Miss policy: `absent`.
4. **`disciplines`** — Canonical discipline table (`disciplines.ts`). Fields: `disciplineFactor`.
   - Miss policy: `default-row` (1.0).

---

## 5. Dimension Algebra & Unit Validation

### 5.1 Exponent Vector Model

Dimensions are represented as 5-element exponent vectors over base physical quantities: $[L, M, T, C, E]$ where $L$=length, $M$=mass, $T$=time, $C$=count (reps), $E$=energy (cal).

$$\text{Dim}(\text{value}) = [l, m, t, c, e]$$

- $\text{Dim}(a \times b) = \text{Dim}(a) + \text{Dim}(b)$
- $\text{Dim}(a \div b) = \text{Dim}(a) - \text{Dim}(b)$
- $\text{Dim}(a \pm b)$ requires $\text{Dim}(a) = \text{Dim}(b)$ (static check failure if unequal).

### 5.2 Named Compound Registry

| Compound | Vector $[L,M,T,C,E]$ | Preferred Display Units |
|---|---|---|
| **Pace** | $[ -1, 0, 1, 0, 0 ]$ (time $\div$ length) | `min/km`, `sec/km`, `min/mi` |
| **Speed** | $[ 1, 0, -1, 0, 0 ]$ (length $\div$ time) | `m/s`, `km/h` |
| **Volume** | $[ 0, 1, 0, 1, 0 ]$ (mass $\times$ count) | `kg`, `lb` |
| **Power** | $[ 0, 1, -1, 1, 0 ]$ (mass $\times$ count $\div$ time) | `kg/s`, `lb/s` |
| **Time** | $[ 0, 0, 1, 0, 0 ]$ | `min`, `s`, `h`, `MET-min` |
| **Mass** | $[ 0, 1, 0, 0, 0 ]$ | `kg`, `lb` |
| **Length** | $[ 1, 0, 0, 0, 0 ]$ | `m`, `km`, `mi` |
| **Count** | $[ 0, 0, 0, 1, 0 ]$ | `reps` |
| **Dimensionless** | $[ 0, 0, 0, 0, 0 ]$ | `pts`, `AU`, `MET`, `ratio` |

### 5.3 Authoritative Cast Rules

Named zero-vector units (`AU`, `pts`, `MET-min`, `ratio`) are **authoritative casts**: declaring `-> AU` on an expression like `rpe * convert(duration, min)` (which computes vector $[0,0,1,0,0]$) overrides the computed vector to dimensionless `AU` without warning. For all non-cast units, mismatched dimensions cause a static registration failure.

---

## 6. Full Suite of Built-in Calculations

The entire built-in suite in canonical line form (~25 lines):

```
# ── segment scope (Tier-1 Annotations) ───────────────────────────────────────
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

# ── workout scope (Tier-2 Summaries) ──────────────────────────────────────────
workout on [wod, log, plan]:

reps        = sum(reps)                                        -> reps    key reps
reps        = sum(reps, without: rest|pause|rest-*)            -> reps    key reps   grouped by {effort}
distance    = sum(distance)                                    -> auto    key distance
totalVolume = sum(segmentVolume)                               -> auto    key totalVolume
totalVolume = sum(segmentVolume)                               -> auto    key totalVolume  grouped by {effort}

workout on [wod, log]:

metMinutes  = round(sum(metMinutes))                           -> MET-min key calc.metMinutes
sessionLoad = round(rpe * convert(session.duration, min))      -> AU      key sessionLoad
  where rpe = sessionRpe | max(effortRpe) | 5 estimated

workout on [wod, log, plan] when has(sum(metMinutes)) and has(sum(elapsed)):

metMax = profile.vo2max / 3.5 | 11.4 estimated     (library)

tis = round(0.30*metScore + 0.35*rpeScore + 0.20*durationScore + 0.15*discipline, 1)  -> pts  key tis
  where avgMets       = sum(metMinutes) / convert(sum(elapsed), min)
        metScore      = min(100, avgMets / metMax * 100)
        rpeScore      = (sessionRpe | max(effortRpe) | 50 estimated)
        durationScore = convert(sum(elapsed), min) / 60 * metScore
        discipline    = lookup("effort", effort, "disciplineFactor")

# ── store scope (Cross-Workout Rollups) ──────────────────────────────────────
store on [wod, log]:

acwr     = windowMean(daily, 7d) / windowMean(daily, 28d)         -> ratio   key calc.acwr
  where daily = sum:sessionLoad{} by {day}

monotony = windowMean(daily, 7d) / windowSd(daily, 7d)            -> ratio   key calc.monotony
  where daily = sum:sessionLoad{} by {day}

strain   = monotony * windowSum(daily, 7d)                        -> AU      key calc.strain
  where daily = sum:sessionLoad{} by {day}
        monotony = windowMean(daily, 7d) / windowSd(daily, 7d)
```

---

## 7. Store Normalization & Fact Identity

### 7.1 Publishing Rules

- **Row Key:** `metricKey` + sorted group-tag pairs (e.g. `totalVolume:effort=thruster`).
- **Deduplication:** Keep-last per `resultId × rowKey`. Live running totals update by replacing the previous row key during derive/replay.
- **Auto-Tags:** Dimensions in `grouped by {dim}` are tagged automatically.
- **Context Tags:** Calcs explicitly declare context tags from lookups (`effortSlug`, `discipline`, `intensityTier`).
- **Grains:**
  - `summary` — Tier-2 workout-scope outputs
  - `rollup` — Store-scope per-point series facts
  - `segment` — Tier-0/1 atomic metrics and segment line annotations (preserves V13 indexed threshold filters)

---

## 8. Authoring UX & Tooling Architecture

The authoring surface (`/proto/calc-authoring`, [#863](https://github.com/SergeiGolos/wod-wiki/issues/863)) consists of:
1. **Single CM6 Calc Editor** with context-aware completion: metric names, `lookup()` tables and fields, function palette, dimension-filtered unit suggestions, context nodes per scope.
2. **Static Diagnostics Strip:** Displays inferred dimension vectors and flags mismatched units or unknown symbols in real time.
3. **Live Preview Panel:** Runs the draft calculation through the headless `AnalyticsEngine` over stored fixture workouts, displaying segment-level outputs, running workout totals, or trailing store windows.

---

## 9. Migration Plan & Parity Harness

Migration follows [#849](https://github.com/SergeiGolos/wod-wiki/issues/849):

1. **Phase 0 — Core Engine & Registry:** Implement the DAG evaluator, dimension-vector checker, lookup adapters, `convert()`, line-form compiler, and in-memory log stream aggregate builtins.
2. **Phase 1 — Parity Test Harness:** Replay fixture workout logs through the legacy processors and the new engine. Diff exact values, units, origins, and fact keys. Deliberate improvements (e.g. unrounded pace stored values) land on a signed accept-list.
3. **Phase 2 — Difficulty Ladder Cutover:**
   $$\text{Distance} \longrightarrow \text{Reps} \longrightarrow \text{Pace/Power} \longrightarrow \text{Volume (pairing proof)} \longrightarrow \text{MetMinutes} \longrightarrow \text{SessionLoad} \longrightarrow \text{TIS}$$
4. **Phase 3 — Processor Deletion:** Remove the 8 legacy processor classes and `rollupDriver.ts`. Retain `TwoPassEffortResolutionProcess` as infrastructure feeding the `effort` lookup table.
