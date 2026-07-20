# Deep Dive — Analytics Replay Seam

> **Implementation note (2026-07-20):** This seam is **implemented** as `src/services/analytics/workoutDerivation.ts` (`deriveWorkoutFromLogs` / `replayResultAnalytics`) with the storage cascade `IndexedDBNotePersistence.rederiveResultAnalytics(resultId)`. This document is retained as design context.

**Status:** **implemented** (2026-07-20) / retained as design context  
**Priority:** HIGH (per feedback on Candidate 5) → **resolved**  
**Parent:** [`data-storage-deepening-opportunities.md`](./data-storage-deepening-opportunities.md) §Candidate 5  
**Companion:** [`analytics-two-layer-derivation-deep-dive.md`](./analytics-two-layer-derivation-deep-dive.md)

**Goal:** define a module that can re-derive a `WorkoutResult`'s Tier-1 annotations and Tier-2 aggregates from its stored `data.logs`, with no live runtime. This closes the gap that leaves derived metrics stale when a result is edited.

> **How to use this file:** every section has annotation space. The "Reframe" below corrects an assumption in the existing docs — please confirm or push back before we design the interface.

---

## 1. The reframe — the engine is already headless

The workflow doc (`indexeddb-analytics-workflows.md` §8.5) states:

> Gap 1: No post-hoc re-derivation. The `AnalyticsEngine` is wired to a live runtime.

And the aspirational sketch routes replay through `OutputEmitter`:

```ts
// indexeddb-analytics-workflows.md §8.5 — assumed the engine needs the runtime
const engine = createAnalyticsEngineForBlock(/* does not exist */);
const emitter = new OutputEmitter();
emitter.setAnalyticsEngine(engine);
for (const rawOutput of result.data.rawLogs ?? result.data.logs) {
  emitter.add(rawOutput);
}
emitter.finalizeAnalytics();
```

**The code does not support this framing.** Reading the actual modules:

### 1.1 `AnalyticsEngine` has zero runtime dependencies

```ts
// src/core/analytics/AnalyticsEngine.ts:9-28
export class AnalyticsEngine implements IAnalyticsEngine {
  private realtimeProcessors: IRealtimeProcessor[] = [];
  private summaryProcessors: ISummaryProcessor[] = [];
  private outputHistory: IOutputStatement[] = [];
  private _onLiveOutput?: (output: IOutputStatement) => void;  // OPTIONAL, for UI only
```

Its dependencies are: `IOutputStatement` (pure data), processors (functions on statements), and an *optional* live-output callback. **No clock, no stack, no script.**

### 1.2 `createAnalyticsEngineForBlock` takes a `ScriptBlock`, not a runtime

```ts
// src/core/analytics/createAnalyticsEngineForBlock.ts:32-77
export function createAnalyticsEngineForBlock(
  block: ScriptBlock,
  options?: CreateAnalyticsEngineOptions   // effortResolver, userProfile
): CreateAnalyticsEngineResult {
  const dialect = block.dialect || 'wod';
  const scriptMetricTypes = new Set<MetricType | string>();
  // ... collect metric types from block.statements
  const profile = new StandardAnalyticsProfile();
  const { realtime, summary } = profile.build({ dialect, scriptMetricTypes, ... });
  // ... assemble engine
}
```

The live path wires this once, in `RuntimeFactory`:

```ts
// src/runtime/compiler/RuntimeFactory.ts:104-106
const { engine, analyticsContext } = createAnalyticsEngineForBlock(block, options?.analyticsOptions);
runtime.analyticsContext = analyticsContext;
runtime.setAnalyticsEngine(engine);
```

### 1.3 The runtime coupling lives in `OutputEmitter`'s emission helpers — not the analytics path

```ts
// src/runtime/OutputEmitter.ts:74-78, 99-117
attach(deps: { clock; stack; script }): void { /* wired once by ScriptRuntime */ }

add(output: IOutputStatement): void {
  // GC guard, then:
  const processed = this._analyticsEngine ? this._analyticsEngine.run(output) : output;
  this._outputStatements.push(processed);
  // notify listeners
}
```

`attach()` requires clock/stack/script, but **only the emission helpers** (`emitLoad`, `emitSegmentFromResultMemory`, …) call `_requireClock()`. The analytics path — `add()` → `engine.run()` and `finalizeAnalytics()` → `engine.finalize()` — never touches them.

### 1.4 The one thing to AVOID reusing for replay: the live feedback loop

```ts
// src/runtime/OutputEmitter.ts:152-157
setAnalyticsEngine(engine: IAnalyticsEngine): void {
  this._analyticsEngine = engine;
  // Routes live session-totals back through add() — a UI feedback loop.
  engine.setLiveOutputEmitter((o) => this.add(o));
}
```

This feedback loop is what makes `OutputEmitter` the wrong vehicle for replay: it re-emits every projection back into the buffer and to listeners. Replay wants none of that. **Replay should drive the engine directly, not through the emitter.**

### Conclusion

The replay module is not "build a decoupled engine." It is: **drive the existing headless `AnalyticsEngine` over stored logs, skipping the emitter entirely.** The real work is (a) recovering the `ScriptBlock` context to rebuild the engine, and (b) stripping Tier-1 annotations before re-running them.

### Feedback on the reframe

- *Confirmed (grill):* drive the engine directly, skip the emitter. The engine is headless; the emitter's clock/stack/script coupling is only for its emission helpers.

---

## 2. The actual minimal replay path

Given the reframe, replay is small:

```ts
// Sketch — drives the engine directly. NOT through OutputEmitter.
function deriveWorkoutFromLogs(params: {
  logs: StoredOutputStatement[];          // result.data.logs
  context: ReplayContext;                 // dialect + scriptMetricTypes (from the segment) + vo2max
}): StoredOutputStatement[] {             // single stream: enriched segments + Tier-2 outputs

  // 1. Rebuild the engine from the result's segment (segmentId → segment.data.scriptBlock).
  //    No effort resolver — effort is compile-time, part of the stored record.
  const engine = createAnalyticsEngineForBlock(scriptBlock, { userProfile });

  // 2. Strip Tier-1 annotations so re-running realtime processors doesn't duplicate them.
  //    Predictions (origin: 'analyzed-estimated') are PRESERVED as recorded.
  const raw = stripAnnotations(params.logs);
  const raw = stripAnnotations(params.logs);

  // 3. Replay: feed each raw segment through the annotation layer.
  //    engine.run() returns the enriched output AND accumulates outputHistory internally.
  const enriched: IOutputStatement[] = [];
  for (const stmt of raw) {
    if (stmt.outputType === 'segment') {
      enriched.push(engine.run(toLiveOutput(stmt)));
    } else {
      enriched.push(stmt);  // pass milestones / completion through unchanged
    }
  }

  // 4. Finalize the aggregation layer → Tier-2 summary statements.
  const summary = engine.finalize();

  return enriched.map(toStoredOutputStatement);  // single stream: Tier 0 + Tier 1 + Tier 2
}
```

The cascade described in `analytics-data-shapes-and-composition.md` §7 (strip → re-annotate → re-aggregate → replace) collapses into steps 2–4.

### Feedback on the path
<!-- Annotate here -->

---

## 3. The two real gaps

### Gap A — recovering the engine context without a live `ScriptBlock`

`createAnalyticsEngineForBlock(block)` needs the `ScriptBlock` to extract `dialect` and `scriptMetricTypes`. For replay we have no *live* block — but the result's segment stores one.

**Resolved (grill Q5, 2026-07-16): A1 — load the result's `NoteSegment`.** The result carries `segmentId` (Candidate 3: NoteSegment UUID); `segment.data.scriptBlock` holds the stored parsed block → `{ dialect, scriptMetricTypes }`. `vo2max` comes from the user profile. **No new persisted field, no effort resolver** (effort is compile-time per the [`effort-resolution-compile-time`](./adr/effort-resolution-compile-time.md) ADR — effort-data is part of the stored record). We load the *stored* block, not re-parse `rawContent`, so there is no parser-stability risk.

The snapshot option (A2) is rejected: it duplicates data already authoritative in the segment, and cascade-delete keeps results and segments linked.

### Gap B — stripping Tier-1 annotations before re-running them

**Resolved (grill Q2–Q4): strip `origin === 'analyzed'` only.** Per the [`effort-resolution-compile-time`](./adr/effort-resolution-compile-time.md) ADR, `analyzed` is now *exclusively* the runtime annotations (power, pace). Effort-data is compile-time — `origin: 'compiler'` (resolved) or `'prediction'` (synthetic) — and is **preserved**, not stripped. The earlier rule (strip `analyzed` + `analyzed-estimated`) was wrong: it conflated runtime annotations with pre-run predictions.

```ts
// Corrected strip rule
function stripAnnotations(logs: StoredOutputStatement[]): StoredOutputStatement[] {
  return logs
    .filter(s => s.outputType !== 'analytics')             // drop Tier-2 statements
    .map(s => ({
      ...s,
      metrics: s.metrics.filter(m => m.origin !== 'analyzed'),  // drop power/pace only
    }));
  // effort-data (compiler/prediction) + Tier-0 (runtime/user/parser/compiler/dialect) + predictions (analyzed-estimated) preserved
}
```

The earlier caveat (effort-data regeneration) is **moot**: effort is no longer re-derived at replay — it's carried from the stored record. Summary processors read the preserved effort-data unchanged.

### Feedback on the gaps

- *Resolved (Q5):* Gap A = A1 (load segment's stored ScriptBlock).
- *Resolved (Q2–Q4):* Gap B strip rule = `origin === 'analyzed'` only; effort preserved.

---

## 4. The deepened module

Replay and the live path should converge on one derivation. The module behind the seam is the headless engine; the live path is just "drive it incrementally as the runtime emits," and replay is "drive it over stored logs."

```ts
// Sketch — one derivation, two drivers
interface WorkoutDerivation {
  // Drives the engine; returns a single stream with enriched segments + Tier-2 appended.
  derive(input: StoredOutputStatement[], context: AnalyticsContextSnapshot): StoredOutputStatement[];
}

// Live path (today, via OutputEmitter.add + finalizeAnalytics) becomes:
//   a thin driver that feeds live outputs to the same engine.
// Replay path:
//   deriveWorkoutFromLogs(result.data.logs, persistedSnapshot)
```

What the seam hides:
- Engine construction from the segment's stored `ScriptBlock` (A1) — no resolver, no snapshot.
- Tier-1 stripping (`analyzed` only) for replay.
- The accumulation of `outputHistory` and the finalize pass.
- Conversion between `StoredOutputStatement` (serialized) and `IOutputStatement` (live).

What callers see: `derive(logs, context) → { logs, analytics }`.

### Feedback on the module shape
<!-- Annotate here -->

---

## 5. What needs to exist / change

| Item | File(s) | Notes |
|---|---|---|
| `createEngineFromSnapshot(snapshot)` | new, mirrors `createAnalyticsEngineForBlock` | **Implemented** via loading the result's stored `NoteSegment` and rebuilding the engine from `segment.data.scriptBlock`. |
| `AnalyticsContextSnapshot` type | `src/core/analytics/` | **Not persisted separately** — engine context is recovered from the segment's stored `ScriptBlock`. |
| `stripAnnotations(logs)` | new pure util | **Implemented** — strips `origin === 'analyzed'` only; preserves effort-data (`compiler`/`prediction`) and Tier-0. |
| `deriveWorkoutFromLogs(...)` | new | **Implemented** as the replay entry point in `workoutDerivation.ts`. |
| Record-time snapshot write | `RuntimeFactory` / `resultRecorder` | **Implemented** implicitly by linking the result to its `segmentId`/`segmentVersion`. |
| `toLiveOutput` / round-trip | may exist partially in `AnalyticsTransformer` | **Implemented** in `workoutDerivation.ts` for `StoredOutputStatement` ↔ `IOutputStatement` round-trip. |

### Open questions for grilling
1. **Gap A choice.** Persist a snapshot (A2) or reload the segment (A1)? A1 is exact but couples replay to segment existence and parser stability; A2 is replay-robust but adds a field and can drift.
2. **Effort resolver at replay time.** `createAnalyticsEngineForBlock` defaults to bundled efforts. Is the default acceptable for replay, or must the resolver state be snapshotted too? (Affects cross-note effort-resolution consistency.)
3. **When does the UI allow editing `data.logs`?** Replay is only exercised when a result is edited. If editing isn't a current feature, this is design-ahead — but the feedback marked it high priority, so confirm the trigger.
4. **Idempotency.** Is `derive(derive(x).logs).logs === derive(x).logs`? It should be, once stripping is correct. Add this as an invariant test.

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-07-20 | — | Seam implemented in `workoutDerivation.ts` + `IndexedDBNotePersistence.rederiveResultAnalytics`; cascade strips `origin === 'analyzed'`, regenerates Tier-2, and purges/rewrites analytics facts. |
