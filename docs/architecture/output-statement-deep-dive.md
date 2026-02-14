# OutputStatement Deep Dive

> Where data is written, how it is calculated, and where it repeats or conflicts.

---

## 1. What Is an OutputStatement?

`OutputStatement` ([src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts)) is the **return type of execution** — the record of "what came out" of running a block. While `ICodeStatement` represents parser input, `IOutputStatement` represents runtime output including timing, collected fragments, and lifecycle metadata.

### Key Fields

| Field | Type | Source |
|-------|------|--------|
| `id` | `number` | Auto-incremented from 1,000,000 |
| `outputType` | `OutputStatementType` | `'segment'` · `'completion'` · `'milestone'` · `'label'` · `'metric'` · `'system'` |
| `timeSpan` | `TimeSpan` | Wall-clock start/end bracket |
| `spans` | `ReadonlyArray<TimeSpan>` | Raw timer spans (pause-aware, from block memory) |
| `elapsed` | `number` (getter) | Sum of `spans` durations, or `timeSpan.duration` fallback |
| `total` | `number` (getter) | First span start → last span end, or `timeSpan.duration` fallback |
| `sourceBlockKey` | `string` | UUID of the block that produced this output |
| `sourceStatementId` | `number?` | Parser statement ID link |
| `stackLevel` | `number` | Stack depth at emission time |
| `fragments` | `ICodeFragment[]` | Payload — the actual data carried |
| `completionReason` | `string?` | Only on `'completion'` type: `'user-advance'`, `'forced-pop'`, `'timer-expired'`, `'rounds-complete'` |

---

## 2. The Canonical Sink

All outputs flow through **one method**:

```
ScriptRuntime.addOutput(output: IOutputStatement)
  → pushes to _outputStatements[]
  → notifies all _outputListeners
```

**File:** [src/runtime/ScriptRuntime.ts#L181](../../src/runtime/ScriptRuntime.ts)

No output reaches consumers without passing through `addOutput()`.

---

## 3. Emission Sites Catalog

There are **two parallel pathways** for creating OutputStatements:

### Path A: Behavior Pipeline (`ctx.emitOutput()`)

Behaviors call `ctx.emitOutput(type, fragments, options)` → **BehaviorContext** constructs the `OutputStatement` and calls `runtime.addOutput()`.

BehaviorContext enriches every output with:
- `timeSpan` from clock + timer memory spans
- `sourceBlockKey` from `block.key`
- `sourceStatementId` from `block.sourceIds[0]`
- `stackLevel` from mount-time stack depth
- Fragment tagging: adds `sourceBlockKey` and `timestamp` to each fragment
- **Empty-fragment fallback**: if `fragments === []`, auto-populates from `fragment:display` memory

**File:** [src/runtime/BehaviorContext.ts#L94-L160](../../src/runtime/BehaviorContext.ts)

### Path B: Direct Construction (`new OutputStatement()`)

System-level code creates `OutputStatement` directly and calls `runtime.addOutput()`, bypassing `BehaviorContext`.

---

## 4. All Write Sites (Production Code)

### 4.1 SegmentOutputBehavior

**File:** [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts)

| Lifecycle | Output Type | Fragments | Notes |
|-----------|-------------|-----------|-------|
| `onMount` | `segment` | `fragment:display` + runtime state (round, timer memory), deduped by `fragmentType:type` | Announces "block started" with full state identity |
| `onUnmount` | `completion` | `fragment:display` + `fragment:tracked` + computed elapsed duration, deduped by `fragmentType:type` | Richest output — consolidates all data sources. Passes `completionReason`. |

**Elapsed computation** (in `getElapsedFragment()`):
1. If `timer` memory exists → `calculateElapsed(timer, now)` (pause-aware from spans)
2. Else if `executionTiming.startTime` exists → `completedAt - startTime` (wall-clock)
3. Else → `null` (no timing)

> ⚠️ **REPEAT FLAG**: Timer elapsed appears both as a fragment *and* in the OutputStatement envelope (`spans`, `elapsed`, `total` getters). See §6.1.

### 4.2 RoundOutputBehavior

**File:** [src/runtime/behaviors/RoundOutputBehavior.ts](../../src/runtime/behaviors/RoundOutputBehavior.ts)

| Lifecycle | Output Type | Fragments | Guard |
|-----------|-------------|-----------|-------|
| `onMount` | `milestone` | Round count fragment (`FragmentType.Rounds`) + optional timer fragment | Only if round memory exists |
| `onNext` | `milestone` | Same as mount | Only if round memory exists **AND** `ChildRunnerBehavior.allChildrenCompleted === true` |

**Timer fragment** (in `getTimerFragment()`):
- Reads `timer` memory → `calculateElapsed(timer, now)`
- Creates `FragmentType.Timer` with `type: 'timer'`
- `image` = `formatDuration(timer.durationMs ?? elapsed)`

> ⚠️ **REPEAT FLAG**: Timer data appears here AND in SegmentOutputBehavior's segment/completion outputs for the same block. See §6.1.

### 4.3 SoundCueBehavior

**File:** [src/runtime/behaviors/SoundCueBehavior.ts](../../src/runtime/behaviors/SoundCueBehavior.ts)

| Lifecycle | Output Type | Fragments | Guard |
|-----------|-------------|-----------|-------|
| `onMount` | `milestone` | `SoundFragment` per cue with `trigger === 'mount'` | None — one output per cue |
| `tick` handler | `milestone` | `SoundFragment` per countdown cue | `Set<number>` prevents replaying same second; requires timer direction `'down'` |
| `onUnmount` | `milestone` | `SoundFragment` per cue with `trigger === 'unmount'` or `'complete'` | None — one output per cue |

> ⚠️ **CHATTY FLAG**: See §6.2 — countdown cues emit one milestone per second hit.

### 4.4 TimerOutputBehavior

**File:** [src/runtime/behaviors/TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts)

| Lifecycle | Output Type | Fragments | Notes |
|-----------|-------------|-----------|-------|
| `onUnmount` | *(none — writes to memory only)* | Pushes duration `ICodeFragment` to `fragment:tracked` memory | SegmentOutputBehavior reads this and merges it into its `completion` output |

This behavior **does not emit outputs directly**. It writes to `fragment:tracked` memory which SegmentOutputBehavior picks up.

> ⚠️ **REPEAT FLAG**: See §6.1 — this writes the same elapsed calculation that SegmentOutputBehavior also computes independently.

### 4.5 HistoryRecordBehavior

**File:** [src/runtime/behaviors/HistoryRecordBehavior.ts](../../src/runtime/behaviors/HistoryRecordBehavior.ts)

| Lifecycle | Output Type | Fragments | Notes |
|-----------|-------------|-----------|-------|
| `onUnmount` | *(none — emits event only)* | Emits `history:record` **event** (not output) with block key, elapsed, round data | Does NOT call `emitOutput()` |

This behavior emits an **event**, not an output statement. However, it independently re-computes `calculateElapsed(timer, now)` — the same value that TimerOutputBehavior and SegmentOutputBehavior also compute.

> ⚠️ **REPEAT FLAG**: Triple-computes the same elapsed value. See §6.1.

### 4.6 ScriptRuntime — Push/Pop System Outputs

**File:** [src/runtime/ScriptRuntime.ts#L344-L403](../../src/runtime/ScriptRuntime.ts)

| Trigger | Output Type | Fragments |
|---------|-------------|-----------|
| Stack `push` event | `system` | Single `FragmentType.System` fragment: `image = "push: Label [key]"`, `value = { event, blockKey, blockLabel, actionType, parentKey? }` |
| Stack `pop` event | `system` | Single `FragmentType.System` fragment: `image = "pop: Label [key] reason=X"`, `value = { event, blockKey, blockLabel, actionType, completionReason }` |

- Zero-duration `TimeSpan` (start === end)
- Bypasses BehaviorContext; calls `this.addOutput()` directly
- Triggered from stack subscription handler

### 4.7 RuntimeBlock — Next System Output

**File:** [src/runtime/RuntimeBlock.ts#L407-L449](../../src/runtime/RuntimeBlock.ts)

| Trigger | Output Type | Fragments |
|---------|-------------|-----------|
| `next()` call | `system` | Single `FragmentType.System` fragment: `image = "next: Label [key]"`, `value = { event: 'next', blockKey, blockLabel, actionType: 'next' }` |

- Zero-duration `TimeSpan`
- Bypasses BehaviorContext; calls `runtime.addOutput()` directly

### 4.8 EmitSystemOutputAction

**File:** [src/runtime/actions/stack/EmitSystemOutputAction.ts](../../src/runtime/actions/stack/EmitSystemOutputAction.ts)

| Trigger | Output Type | Fragments |
|---------|-------------|-----------|
| Event dispatch (from `ExecutionContext.handle()`) | `system` | Single `FragmentType.System` fragment: `type = 'event-action'` or `'lifecycle'`, configurable `image` and `extra` data |

- Zero-duration `TimeSpan`
- Bypasses BehaviorContext; calls `runtime.addOutput()` directly
- Created by `ExecutionContext.handle()` when events produce actions

> ⚠️ **CHATTY FLAG**: See §6.3 — every event dispatch with actions generates a system output.

---

## 5. Output Flow Diagram

```
 ┌──────────────────────┐
 │   Behavior Chain      │
 │ (mount/next/unmount)  │
 └──────┬───────────────┘
        │
        ▼
 ┌──────────────────────┐     ┌──────────────────────────────────┐
 │ SegmentOutputBehavior │     │ RoundOutputBehavior              │
 │ → 'segment' (mount)  │     │ → 'milestone' (mount/next)       │
 │ → 'completion' (unmount)   │                                  │
 └──────┬───────────────┘     └──────────┬───────────────────────┘
        │                                │
        ▼                                ▼
 ┌──────────────────────┐     ┌──────────────────────────────────┐
 │ SoundCueBehavior      │     │ TimerOutputBehavior              │
 │ → 'milestone' (mount) │     │ → writes to fragment:tracked     │
 │ → 'milestone' (tick)  │     │   (consumed by SegmentOutput)    │
 │ → 'milestone' (unmount)     └──────────────────────────────────┘
 └──────┬───────────────┘
        │                     All go through:
        ▼                     ┌──────────────────────────────────┐
 ┌──────────────────────┐     │ BehaviorContext.emitOutput()     │
 │                      │◄────│ → tags fragments                 │
 │                      │     │ → extracts timer spans           │
 │                      │     │ → constructs OutputStatement     │
 └──────────────────────┘     └──────────┬───────────────────────┘
                                         │
                                         ▼
 ┌───────────────────────────────────────────────────────────────┐
 │               ScriptRuntime.addOutput()                       │
 │         (the ONE canonical sink for all outputs)              │
 │                                                               │
 │  _outputStatements.push(output)                               │
 │  notify all _outputListeners                                  │
 └───────────┬──────────────┬───────────────────────────────────┘
             │              │
  ┌──────────┘              └──────────┐
  │ ALSO feeds directly:               │
  │                                    │
  │  ScriptRuntime.emitSystemOutput()  │
  │  → push/pop system outputs         │
  │                                    │
  │  RuntimeBlock.emitNextSystemOutput()│
  │  → next system outputs             │
  │                                    │
  │  EmitSystemOutputAction.do()       │
  │  → event-action system outputs     │
  └────────────────────────────────────┘
```

---

## 6. Problems: Repeats, Chatty Emitters, and Inconsistencies

### 6.1 🔁 REPEAT: Timer Elapsed Computed 3× Per Block Unmount

When a block with timer memory unmounts, the same `calculateElapsed(timer, now)` value is independently computed by **three separate behaviors**:

| # | Who | What it does with the value | File |
|---|-----|----------------------------|------|
| 1 | **TimerOutputBehavior** | Writes duration fragment to `fragment:tracked` memory | [TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts) |
| 2 | **SegmentOutputBehavior** | Reads `fragment:tracked` (from #1) AND computes its own `getElapsedFragment()` — but deduplicates by `fragmentType:type` so only one survives | [SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) |
| 3 | **HistoryRecordBehavior** | Computes `calculateElapsed()` for the `history:record` event payload | [HistoryRecordBehavior.ts](../../src/runtime/behaviors/HistoryRecordBehavior.ts) |

**Additionally**, `BehaviorContext.emitOutput()` extracts timer spans from memory and puts them into the `OutputStatement.spans` field, which enables the `elapsed` and `total` getters. This means the elapsed value exists in **four places** on a single completion output:
1. As a `FragmentType.Timer` fragment with `type: 'duration'` (from TimerOutputBehavior via fragment:tracked)
2. Potentially as a second `FragmentType.Timer` fragment (from SegmentOutputBehavior's `getElapsedFragment()` — but dedup usually prevents this)
3. In `output.spans` (raw spans in the envelope)
4. In `output.elapsed` (derived getter from spans)

**Risk**: If behavior execution order changes, or the deduplication key doesn't match, the completion output could carry **two** elapsed fragments with slightly different values (computed at different `now` timestamps during the unmount chain).

**Recommendation**: Consolidate elapsed computation to a single point. TimerOutputBehavior should be the sole author; SegmentOutputBehavior should not recompute it.

---

### 6.2 🔁 REPEAT: Timer Data in Both Segment and Milestone Outputs

For a block with both `SegmentOutputBehavior` and `RoundOutputBehavior`, timer state appears in:

| Output | Where timer appears |
|--------|-------------------|
| `segment` (mount) | SegmentOutputBehavior merges `timer` memory from `getRuntimeStateFragments()` |
| `milestone` (mount) | RoundOutputBehavior includes timer fragment from `getTimerFragment()` |
| `milestone` (each next) | RoundOutputBehavior includes timer fragment again |
| `completion` (unmount) | SegmentOutputBehavior includes elapsed duration fragment |
| OutputStatement envelope | `spans` array + `elapsed`/`total` getters |

For a 5-round EMOM block, this produces **7+ outputs with timer data**: 1 segment + 5 milestones + 1 completion, plus system outputs.

**Risk**: Consumers (like `AnalyticsTransformer`) that iterate all outputs and extract timer fragments will double-count timer values.

**Recommendation**: Decide whether timer fragments belong in milestone outputs or segment outputs, not both.

---

### 6.3 📢 CHATTY: System Outputs on Every Lifecycle Event

System outputs are emitted for:
1. **Every push** — `ScriptRuntime.emitSystemOutput()` via stack subscription
2. **Every pop** — `ScriptRuntime.emitSystemOutput()` via stack subscription
3. **Every next()** — `RuntimeBlock.emitNextSystemOutput()`
4. **Every event dispatch that produces actions** — `EmitSystemOutputAction` via `ExecutionContext.handle()`

For a simple workout with 5 exercises × 3 rounds = 15 leaf blocks:
- 15 push system outputs
- 15 pop system outputs
- 15+ next system outputs (parent `next()` on each child completion)
- N event-action system outputs (tick events, timer-expired, etc.)

**Total**: 45+ system outputs minimum, potentially **hundreds** with tick events.

**No filtering by default**: `useOutputStatements()` hook categorizes outputs by type but does **not** filter out system outputs. The `AnalyticsTransformer.fromOutputStatements()` processes **all** outputs including system ones, creating segments for lifecycle events that have no duration and no meaningful fragments.

**Recommendation**: System outputs should either:
- Be opt-in (only emitted when a debug flag is set)
- Be filtered out at the consumer level (AnalyticsTransformer, ReviewGrid should skip `outputType === 'system'`)
- Have their own stream separate from `_outputStatements`

---

### 6.4 📢 CHATTY: SoundCueBehavior Countdown Milestones

For a 60-second countdown timer with `atSeconds: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]`, SoundCueBehavior emits **10 milestone outputs** — one per second hit. Each is a zero-content `SoundFragment` that exists only to trigger audio playback.

These milestones mix into the output stream alongside substantive segment/completion outputs.

**Risk**: Downstream consumers that count milestones or display all outputs will show countdown cues as "events" alongside round milestones.

**Recommendation**: Consider either:
- Using events instead of outputs for sound cues (they're ephemeral by nature)
- Adding a `transient: true` flag to outputs that should not persist in analytics

---

### 6.5 🔁 REPEAT: Three Separate System Output Implementations

System outputs are created by three independent implementations that share no code:

| Implementation | File | Trigger |
|----------------|------|---------|
| `ScriptRuntime.emitSystemOutput()` | [ScriptRuntime.ts](../../src/runtime/ScriptRuntime.ts) | push/pop stack events |
| `RuntimeBlock.emitNextSystemOutput()` | [RuntimeBlock.ts](../../src/runtime/RuntimeBlock.ts) | next() calls |
| `EmitSystemOutputAction.do()` | [EmitSystemOutputAction.ts](../../src/runtime/actions/stack/EmitSystemOutputAction.ts) | Event dispatch |

All three:
- Define their own `SystemOutputValue` interface (identical fields)
- Create `OutputStatement` with the same structure
- Use `FragmentType.System` with `type: 'lifecycle'` (or `'event-action'`)
- Set zero-duration `TimeSpan`
- Call `runtime.addOutput()` directly

**Risk**: If the system output schema changes, three files need updating. The `SystemOutputValue` interface is defined locally in each file — divergence is inevitable.

**Recommendation**: Extract a shared `createSystemOutput()` factory function. Or consolidate on `EmitSystemOutputAction` as the single implementation.

---

### 6.6 ⚠️ INCONSISTENCY: BehaviorContext Fragment Fallback

When `emitOutput()` is called with an empty `fragments` array, BehaviorContext auto-populates from `fragment:display` memory:

```typescript
// BehaviorContext.ts line ~130
let effectiveFragments = fragments;
if (effectiveFragments.length === 0) {
    const displayLocations = this.block.getMemoryByTag('fragment:display');
    if (displayLocations.length > 0) {
        effectiveFragments = [...displayLocations[0].fragments];
    }
}
```

**But** SegmentOutputBehavior also reads `fragment:display` explicitly:

```typescript
// SegmentOutputBehavior.ts line ~36
private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
    const displayLocs = ctx.block.getMemoryByTag('fragment:display');
    ...
}
```

If SegmentOutputBehavior passes non-empty fragments (which it does — it constructs a merged array), the BehaviorContext fallback never triggers. But if a future behavior calls `ctx.emitOutput('metric', [])` expecting the fallback, it gets different fragments than SegmentOutputBehavior would construct (no dedup, no tracked merge).

**Risk**: The fallback creates an implicit contract that's easy to violate. Callers don't know if they'll get display fragments or nothing.

**Recommendation**: Make the fragment population explicit in all callers. Remove the implicit fallback, or document it as the canonical "default fragments" behavior.

---

### 6.7 ⚠️ INCONSISTENCY: `now` Drift During Unmount Chain

During unmount, behaviors execute sequentially:
1. TimerOutputBehavior.onUnmount — reads `clock.now` → computes elapsed₁
2. SegmentOutputBehavior.onUnmount — reads `clock.now` → computes elapsed₂  
3. HistoryRecordBehavior.onUnmount — reads `clock.now` → computes elapsed₃

If the clock is **frozen** (snapshot clock from ExecutionContext), all three get the same value. But `BehaviorContext` is created with `runtime.clock` during mount, and during `unmount()` the block creates a fresh `BehaviorContext` **that may use a different clock**:

```typescript
// RuntimeBlock.ts next() creates a fresh BehaviorContext:
const nextContext = new BehaviorContext(this, clock, ...);
```

For unmount, the block reuses `_behaviorContext` from mount time **or** a fresh one depending on the lifecycle path. If the clock drifts between behavior executions (e.g., real-time clock not frozen), elapsed values diverge.

**Risk**: In production (non-test) scenarios with live clocks, the three elapsed computations could produce different values by milliseconds.

**Recommendation**: Ensure unmount uses a snapshot clock (frozen at unmount time) for all behavior callbacks.

---

## 7. Per-Block Output Volume Analysis

### Simple Leaf Block (e.g., "10 Burpees")

| # | Output Type | Source | Essential? |
|---|-------------|--------|-----------|
| 1 | `system` (push) | ScriptRuntime | Debug only |
| 2 | `system` (event-action: push) | ExecutionContext | Debug only |
| 3 | `segment` | SegmentOutputBehavior.onMount | ✅ Yes |
| 4 | `system` (next from parent) | RuntimeBlock | Debug only |
| 5 | `completion` | SegmentOutputBehavior.onUnmount | ✅ Yes |
| 6 | `system` (pop) | ScriptRuntime | Debug only |

**Total: 6 outputs. Essential: 2.**

### Container Block with Timer + Rounds (e.g., "3 rounds of...")

| # | Output Type | Source | Essential? |
|---|-------------|--------|-----------|
| 1 | `system` (push) | ScriptRuntime | Debug only |
| 2 | `segment` | SegmentOutputBehavior.onMount | ✅ Yes |
| 3 | `milestone` (Round 1) | RoundOutputBehavior.onMount | ✅ Yes |
| 4 | `milestone` (sound) | SoundCueBehavior.onMount | Audio only |
| ... | `system` × N | child push/pop/next/events | Debug only |
| ... | `milestone` per round | RoundOutputBehavior.onNext | ✅ Yes |
| ... | `milestone` per countdown second | SoundCueBehavior tick | Audio only |
| N-2 | `milestone` (sound) | SoundCueBehavior.onUnmount | Audio only |
| N-1 | `completion` | SegmentOutputBehavior.onUnmount | ✅ Yes |
| N | `system` (pop) | ScriptRuntime | Debug only |

**For 3 rounds × 3 children with 10s countdown: ~40-60 outputs. Essential: ~8.**

---

## 8. Consumer Impact

### AnalyticsTransformer

[src/services/AnalyticsTransformer.ts](../../src/services/AnalyticsTransformer.ts)

Processes **all** outputs via `fromOutputStatements()` — no filtering. Creates a `SegmentWithMetadata` for every output including:
- System outputs (zero-duration, no meaningful fragments)
- Sound milestones (zero-duration, only SoundFragment)

This inflates the segment count and confuses metrics extraction (`extractMetricsFromFragments` finds no numeric values in system fragments).

### useOutputStatements Hook

[src/runtime/hooks/useOutputStatements.ts](../../src/runtime/hooks/useOutputStatements.ts)

Categorizes outputs into `segments`, `completions`, `metrics` — but system and milestone outputs fall into none of these buckets and are only accessible via the raw `outputs` array.

### ExecutionLogService

[src/services/ExecutionLogService.ts](../../src/services/ExecutionLogService.ts)

Subscribes to output stream and maps by statement ID. System outputs (which have no `sourceStatementId` link to parser statements) create phantom entries.

---

## 9. Summary of Findings

| Issue | Severity | Type | Blocks Affected |
|-------|----------|------|-----------------|
| Timer elapsed computed 3× per unmount | Medium | 🔁 Repeat | All timer blocks |
| Timer data in both segment and milestone outputs | Medium | 🔁 Repeat | Container blocks with rounds |
| System outputs on every lifecycle event | High | 📢 Chatty | All blocks |
| Sound countdown milestones per second | Medium | 📢 Chatty | Timer blocks with sound cues |
| Three separate system output implementations | Medium | 🔁 Repeat (code) | System layer |
| BehaviorContext empty-fragment fallback | Low | ⚠️ Inconsistency | Behaviors calling emitOutput([]) |
| Clock drift during unmount chain | Low | ⚠️ Inconsistency | Timer blocks with live clock |

### Recommended Priority Actions

1. **Filter system outputs in consumers** — AnalyticsTransformer and ReviewGrid should skip `outputType === 'system'` unless in debug mode
2. **Consolidate elapsed computation** — single computation point in the unmount chain, shared via memory
3. **Extract system output factory** — shared `createSystemOutput()` replacing three implementations
4. **Consider event-based sound cues** — SoundCueBehavior could use events instead of output statements for transient audio triggers
5. **Add output budget/throttle** — cap the number of system outputs per execution turn to prevent runaway emission
