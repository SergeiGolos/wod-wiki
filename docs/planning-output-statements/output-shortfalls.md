# Output Contract Shortfalls Analysis

> **Purpose**: Identify gaps between the generic output model (defined in [index.md](./index.md)) and the current codebase implementation. Each shortfall describes the expected behavior, current behavior, affected components, and recommended remediation.

###### Prompt Template:

> in document docs/planning-output-statements/output-shortfalls.md lets address issues ##

## Summary

| #   | Shortfall                                                                                          | Severity | Category               |
| --- | -------------------------------------------------------------------------------------------------- | -------- | ---------------------- |
| S1  | ~~Leaf blocks emit no output on `next` (self-pop path)~~ ✅ RESOLVED                              | Medium   | Leaf output timing     |
| S2  | No distinction between self-pop and parent-pop in output content                                   | Medium   | Output metadata        |
| S3  | Container entry output lacks state identity                                                        | Low      | Container output       |
| S4  | `RoundOutputBehavior` does not emit milestone on mount (initial round)                             | Medium   | Container state change |
| S5  | Runtime-tracked fragments not consistently included in leaf completions                            | High     | Fragment flow          |
| S6  | Duplicate completion outputs on blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior` | Medium   | Output deduplication   |
| S7  | No explicit leaf/container classification on `IRuntimeBlock`                                       | Low      | Architecture           |
| S8  | Container `next` milestone only covers round state, not timer state                                | Low      | Container state change |
| S9  | Non-timer leaf blocks have no elapsed time in outputs                                              | High     | Time tracking          |
| S10 | `calculateElapsed()` duplicated across three behaviors                                             | Medium   | Time tracking          |
| S11 | `timeSpan` conflates wall-clock interval with pause-aware elapsed                                  | Medium   | Time tracking          |

---

## S1: Leaf blocks emit no output on `next` (self-pop path) — ✅ RESOLVED

### Resolution

Implemented **Option 2** — enriched the unmount path with completion context so `SegmentOutputBehavior.onUnmount` propagates the block's `completionReason` into the emitted `OutputStatement`.

**Changes:**
1. **`IRuntimeBlock`** — Added `readonly completionReason?: string` to the interface, exposing the already-existing property from `RuntimeBlock`, `MockBlock`, and `TestableBlock`.
2. **`OutputOptions`** — Added `completionReason?: string` so behaviors can pass the reason through `emitOutput`.
3. **`IOutputStatement` / `OutputStatement`** — Added `completionReason?: string` field and wired it through `OutputStatementOptions` → constructor.
4. **`BehaviorContext.emitOutput`** — Forwards `_options?.completionReason` into the `OutputStatement` constructor.
5. **`SegmentOutputBehavior.onUnmount`** — Reads `ctx.block.completionReason` and passes it as `completionReason` in the output options.

Downstream consumers can now distinguish `'user-advance'` (self-pop) from `'forced-pop'` (parent-pop) on completion outputs.

### Expected (Generic Model)
> Leaf blocks should generate output either on `next` when they know they're going to pop themselves, or on the pop if `next` was not called.

The model envisions that when a leaf decides to end itself (user clicks "next"), it should be the one to generate the completion output — the leaf **knows** it's about to terminate and can capture its final state at that moment.

### Current Behavior
`PopOnNextBehavior.onNext()` calls `ctx.markComplete('user-advance')` and returns `PopBlockAction`. It emits **no output**. The output is then generated later by `SegmentOutputBehavior.onUnmount()` and/or `TimerOutputBehavior.onUnmount()` during the unmount lifecycle triggered by `PopBlockAction`.

### Impact
- In the self-pop case, the output is functionally correct — it still fires during unmount. However, the leaf has no opportunity to add context that only exists at the `next()` decision point (e.g., "user-advance" vs "timer-expired" as completion reason in fragments).
- The behavior chain processes `onNext` for all behaviors before `PopBlockAction` runs, so no behavior currently has a "last chance to capture state before pop" on the next call.

### Affected Files
- [src/runtime/behaviors/PopOnNextBehavior.ts](../../src/runtime/behaviors/PopOnNextBehavior.ts)
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts)

### Recommended Remediation
Two options:
1. **Add output to `PopOnNextBehavior.onNext`** — Emit `completion` in `onNext` before returning `PopBlockAction`. Would require suppressing duplicate output from `SegmentOutputBehavior.onUnmount`.
2. **Enrich `onUnmount` with completion context** — Pass a `completionReason` or similar through `BlockLifecycleOptions` so that `SegmentOutputBehavior.onUnmount` can differentiate self-pop from parent-pop and include appropriate metadata.

**Recommendation**: Option 2 is lower-risk. The unmount path already works correctly; enriching it with completion context preserves the existing pattern while adding the metadata distinction the generic model requires.

---

## S2: No distinction between self-pop and parent-pop in output content

### Expected (Generic Model)
> Leaf blocks should generate output on `next` when they self-pop, OR on pop if `next` was not called (parent-forced pop). These are distinct scenarios that should be identifiable in the output stream.

### Current Behavior
Both self-pop and parent-pop produce identical `completion` outputs via `SegmentOutputBehavior.onUnmount()`. The `OutputStatement` has no field to distinguish:
- **Self-pop**: User clicked next → `PopOnNextBehavior` → `markComplete('user-advance')` → `PopBlockAction` → unmount
- **Parent-pop**: Timer expired → `ClearChildrenAction` → `PopBlockAction` → `markComplete('forced-pop')` → unmount

While `PopBlockAction` correctly sets `completionReason` on the block (`'user-advance'` vs `'forced-pop'`), this metadata is **not propagated** to the `OutputStatement`.

### Impact
- Downstream consumers (history panel, analytics) cannot distinguish between completed work (user finished) and interrupted work (timer forced stop).
- The output stream treats both scenarios identically, losing important semantic information.

### Affected Files
- [src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts) — no `completionReason` field
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — `onUnmount` doesn't read completion context
- [src/runtime/actions/stack/PopBlockAction.ts](../../src/runtime/actions/stack/PopBlockAction.ts) — sets reason on block but not on output

### Recommended Remediation
1. Add `completionReason?: string` to `IOutputStatement` interface
2. Pass completion reason through `IBehaviorContext` or `BlockLifecycleOptions` to `onUnmount`
3. `SegmentOutputBehavior.onUnmount` reads the reason and includes it in the emitted output metadata

---

## S3: Container entry output lacks state identity

### Expected (Generic Model)
> Container blocks should create an output on entry identifying their state — timer duration, round count (current/total), label.

### Current Behavior
Container blocks with `SegmentOutputBehavior` emit a `segment` on mount containing `fragment:display` memory. However:
- **Round state** (`round.current`, `round.total`) is initialized by `RoundInitBehavior.onMount()` but is **not included** in the `SegmentOutputBehavior.onMount()` output as fragments.
- **Timer state** (duration, direction) is initialized by `TimerInitBehavior.onMount()` but is **not included** in the segment output as a fragment.
- The `fragment:display` memory only contains parser-level fragments (label, exercise info), not the runtime state that identifies the container's configuration.

### Impact
- The entry `segment` for a container like "3 Rounds of..." doesn't explicitly carry the `round={current:1, total:3}` information in its fragments.
- The planning docs show entries like `segment` with `rounds: 1/3` or `timer: 20:00 countdown`, but these fragments are not actually present in the emitted output.

### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — only reads `fragment:display`
- [src/runtime/behaviors/RoundInitBehavior.ts](../../src/runtime/behaviors/RoundInitBehavior.ts) — initializes round state but doesn't add to display fragments

### Recommended Remediation
Container entry output should merge runtime state fragments (round, timer) alongside parser display fragments. Options:
1. `RoundInitBehavior.onMount` could write a `Rounds` fragment to `fragment:display` memory
2. `SegmentOutputBehavior.onMount` could be extended to also read from `round` and `timer` memory tags and synthesize fragments
3. A new `ContainerOutputBehavior` could handle this concern specifically for container blocks

---

## S4: `RoundOutputBehavior` does not emit milestone on mount (initial round)

### Expected (Generic Model)
> Container blocks should create an output on entry identifying their state.

The planning docs (e.g., [fixed-round-loop.md](./fixed-round-loop.md)) show the Loop block emitting `milestone` with `rounds: 1/3` on mount (step 6). This is the container announcing its initial round state.

### Current Behavior
`RoundOutputBehavior.onMount()` is intentionally empty ("segment output is handled elsewhere"). The initial round state is never emitted as a `milestone`. The first `milestone` only appears when `round.current` advances from 1→2 on the first `onNext` after all children complete.

### Impact
- The output stream has no `milestone` showing the initial round state (e.g., "Round 1 of 3").
- The planning doc tables show this output but it's not generated by the code.
- The initial round can be inferred from the container's `segment` entry, but only if S3 is also resolved.

### Affected Files
- [src/runtime/behaviors/RoundOutputBehavior.ts](../../src/runtime/behaviors/RoundOutputBehavior.ts) — `onMount` returns `[]`

### Recommended Remediation
Either:
1. `RoundOutputBehavior.onMount()` emits a `milestone` with `Round 1 of N` — matches planning docs
2. S3 is resolved so the container's `segment` entry carries the initial round state — eliminates need for a separate milestone

---

## S5: Runtime-tracked fragments not consistently included in leaf completions

### Expected (Generic Model)
> Leaf blocks contain display fragments that are designated and maintain certain memory fragments that should also be logged to the output. Completion outputs should include both prescribed fragments (parser) and tracked fragments (runtime memory — elapsed time, actual reps, etc.).

### Time Types Affected
- **elapsed** — only available in completion outputs for blocks that have `TimerOutputBehavior`
- **duration** — the prescribed timer value (parser fragment) is present on timer blocks but not explicitly paired with elapsed in non-timer blocks
- **timestamp** — `timeSpan.started`/`.ended` are set on all outputs, but these are wall-clock timestamps, not the pause-aware elapsed

### Current Behavior
Fragment inclusion in completion outputs is inconsistent:

| Behavior | Completion Fragments | Time Types Included |
|----------|---------------------|--------------------|
| `SegmentOutputBehavior.onUnmount` | `fragment:display` (parser fragments) | ❌ No elapsed, no spans, only `timeSpan` timestamps |
| `TimerOutputBehavior.onUnmount` | `fragment:display` + duration fragment | ✅ **elapsed** (computed from spans as `FragmentType.Timer` type `'duration'`) |

- Blocks with `TimerOutputBehavior` get proper runtime-enriched completions including **elapsed** time.
- Blocks with only `SegmentOutputBehavior` (e.g., simple effort blocks without timers) get completions with only parser fragments — no runtime-tracked data. Even though `executionTiming.startTime` and `executionTiming.completedAt` are set, the wall-clock **elapsed** (completedAt - startTime) is never computed or emitted as a fragment.
- When both behaviors are present on the same block, **two separate** `completion` outputs are emitted (see S6).
- Other runtime-tracked state beyond timers (e.g., actual rep counts if implemented, tracked metrics) has no standardized path into output fragments.

### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — `onUnmount` only uses `fragment:display`
- [src/runtime/behaviors/TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts) — `onUnmount` adds elapsed but is its own separate output

### Recommended Remediation
1. Define a `fragment:tracked` memory tag convention for runtime-collected fragments (elapsed, reps, etc.)
2. `SegmentOutputBehavior.onUnmount` (or a unified output behavior) reads both `fragment:display` AND `fragment:tracked` to produce a single rich completion output
3. For non-timer blocks, compute wall-clock elapsed from `executionTiming` (completedAt - startTime) and include as a duration fragment
4. Alternatively, consolidate `TimerOutputBehavior` into `SegmentOutputBehavior` so all completion output goes through one behavior that merges all fragment sources

---

## S6: Duplicate completion outputs on blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior`

### Expected (Generic Model)
> Each block should emit exactly one `completion` output on exit.

### Current Behavior
Blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior` emit **two** `completion` outputs on unmount:
1. `SegmentOutputBehavior.onUnmount()` → `completion` with `fragment:display` only
2. `TimerOutputBehavior.onUnmount()` → `completion` with `fragment:display` + duration fragment

This violates the "no duplicate outputs for the same lifecycle event" validation rule already documented in the checklist.

### Impact
- Downstream consumers processing the output stream see two completions for one block exit.
- The richer `TimerOutputBehavior` completion contains a superset of the `SegmentOutputBehavior` completion, making the first one redundant.
- Filtering logic must disambiguate which completion is the "real" one.

### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts)
- [src/runtime/behaviors/TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts)
- All strategies that compose both behaviors on the same block

### Recommended Remediation
1. **Guard pattern**: `SegmentOutputBehavior.onUnmount` checks whether `TimerOutputBehavior` is present and skips its own completion if so
2. **Merge pattern**: Remove `TimerOutputBehavior` and have `SegmentOutputBehavior.onUnmount` optionally read timer memory and append the duration fragment when available
3. **Single output behavior**: Replace both with a unified `BlockOutputBehavior` that handles all output emission with a single mount/unmount pair

---

## S7: No explicit leaf/container classification on `IRuntimeBlock`

### Expected (Generic Model)
> The system should have a clear, queryable distinction between leaf blocks (active work) and container blocks (round/timer managers).

### Current Behavior
There is no `isLeaf` or `isContainer` property on `IRuntimeBlock`. The distinction is emergent from behavior composition:
- Leaf = has `PopOnNextBehavior`
- Container = has `ChildRunnerBehavior`

This makes it impossible to select output behavior based on block category without introspecting the behavior list.

### Impact
- Output behaviors cannot easily branch logic based on "am I on a leaf or a container?"
- Testing and validation must check for the presence of specific behaviors rather than a declarative flag
- The `OutputStatement.isLeaf` property (computed from children count) is about the output hierarchy, not the block hierarchy

### Affected Files
- [src/runtime/contracts/IRuntimeBlock.ts](../../src/runtime/contracts/IRuntimeBlock.ts)
- [src/runtime/RuntimeBlock.ts](../../src/runtime/RuntimeBlock.ts) (or wherever `IRuntimeBlock` is implemented)

### Recommended Remediation
Add `readonly isLeaf: boolean` to `IRuntimeBlock`. Set during block construction based on whether the block has `ChildRunnerBehavior` or based on the strategy that built it. This enables output behaviors to make category-aware decisions.

---

## S8: Container `next` milestone only covers round state, not timer state

### Expected (Generic Model)
> Container blocks should create an output on state changes from next/advance. Outputs should identify their state.

### Current Behavior
`RoundOutputBehavior.onNext()` emits milestones for **round advances** only. Other state changes that occur during a container's `next()` are not logged:
- Timer resets (EMOM interval timer restarting for the next round)
- `childIndex` changes (which child is about to be pushed)
- Phase transitions (work → rest → work in containers with rest blocks)

Only behaviors that perform state mutations (`RoundAdvanceBehavior`, `ChildLoopBehavior`, `ChildRunnerBehavior`) know about these transitions, but they don't emit output.

### Impact
- The output stream captures round progression but not other meaningful container state changes.
- For EMOM, the interval timer reset between rounds is invisible in the output stream unless explicitly logged.
- The generic model asks that **all** state-mutating transitions produce output; currently only round advance does.

### Affected Files
- [src/runtime/behaviors/RoundOutputBehavior.ts](../../src/runtime/behaviors/RoundOutputBehavior.ts) — only state-change emitter
- [src/runtime/behaviors/ChildRunnerBehavior.ts](../../src/runtime/behaviors/ChildRunnerBehavior.ts) — mutates childIndex, no output
- [src/runtime/behaviors/ChildLoopBehavior.ts](../../src/runtime/behaviors/ChildLoopBehavior.ts) — resets childIndex, no output

### Recommended Remediation
Evaluate which additional state changes warrant output:
- **Timer reset** on EMOM interval boundaries — likely yes, as a `milestone`
- **childIndex** changes — likely no, too granular (child mount/unmount already captured)
- **Phase transitions** — captured implicitly by child `segment`/`completion` pairs currently

Focus on timer-reset milestones for EMOM/interval patterns as the highest-value addition.

---

## Priority Matrix

| Shortfall | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| **S5** Runtime fragments missing from completions | High — output data fidelity | Medium | 🔴 P1 |
| **S6** Duplicate completion outputs | Medium — consumer confusion | Low | 🔴 P1 |
| **S9** Non-timer leaves missing elapsed | High — silent time loss | Low | 🔴 P1 |
| **S2** No self-pop vs parent-pop distinction | Medium — lost semantics | Low | 🟡 P2 |
| ~~**S1**~~ | ~~No output on `next` for self-pop~~ | ~~Medium~~ | ~~Medium~~ | ✅ Resolved |
| **S4** No initial round milestone | Medium — doc mismatch | Low | 🟡 P2 |
| **S10** calculateElapsed duplicated 3x | Medium — maintenance risk | Low | 🟡 P2 |
| **S11** timeSpan conflates wall-clock and elapsed | Medium — semantic ambiguity | Medium | 🟡 P2 |
| **S3** Container entry lacks state identity | Low — inferrable from context | Medium | 🟢 P3 |
| **S8** Only round state in container milestones | Low — most changes covered by children | Medium | 🟢 P3 |
| **S7** No explicit leaf/container flag | Low — architectural quality | Low | 🟢 P3 |

---

## S9: Non-timer leaf blocks have no elapsed time in outputs

### Expected (Generic Model)
> All leaf blocks should track time spent on them. Even a simple effort block ("10 Pushups" with no timer) has a duration — the time from when the athlete started that exercise to when they advanced. This elapsed time should appear in the completion output.

### Time Types Affected
- **elapsed** — the core gap: non-timer blocks compute no elapsed value
- **timestamp** — `executionTiming.startTime` and `.completedAt` are set on all blocks, but never differenced into an elapsed value
- **spans** — non-timer blocks have no `TimerState`, therefore no spans to derive elapsed from

### Current Behavior
Non-timer leaf blocks (effort blocks without `TimerInitBehavior`) have:
- ✅ `executionTiming.startTime` set by `PushBlockAction`
- ✅ `executionTiming.completedAt` set by `PopBlockAction`
- ✅ `timeSpan.started` / `timeSpan.ended` on the `OutputStatement` (from `BehaviorContext.emitOutput`)
- ❌ **No elapsed duration fragment** — `TimerOutputBehavior` is absent, so no one computes `completedAt - startTime`
- ❌ **No spans** — no `TimerState` means `calculateElapsed()` has nothing to iterate

The time data exists (timestamps are recorded) but is never transformed into an **elapsed** value in the output.

### Impact
- Simple effort blocks like "30 Clean & Jerk" in Grace report completion without timing data in fragments.
- The history panel and analytics consumers have `timeSpan.started`/`.ended` but must compute elapsed themselves.
- This violates the generic model: leaf completion outputs should include runtime-tracked time.

### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — emits completion without elapsed
- [src/runtime/actions/stack/PushBlockAction.ts](../../src/runtime/actions/stack/PushBlockAction.ts) — records `startTime`
- [src/runtime/actions/stack/PopBlockAction.ts](../../src/runtime/actions/stack/PopBlockAction.ts) — records `completedAt`

### Recommended Remediation
1. In `SegmentOutputBehavior.onUnmount` (or a unified output behavior), compute elapsed from `executionTiming`: `completedAt.getTime() - startTime.getTime()`
2. Emit this as a `FragmentType.Timer` fragment with `type: 'duration'` and `origin: 'runtime'`
3. This gives all leaf blocks elapsed time in their completion output, even without a dedicated timer

---

## S10: `calculateElapsed()` duplicated across three behaviors

### Expected
> The function that computes elapsed time from spans should be defined once and reused.

### Current Behavior
The same `calculateElapsed(timer: TimerState, now: number): number` function is duplicated in:
1. `TimerCompletionBehavior` — used to check if timer has expired
2. `TimerOutputBehavior` — used to compute elapsed for the completion fragment
3. `HistoryRecordBehavior` — used to compute elapsed for the history event

All three copies have identical logic:
```typescript
function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}
```

### Impact
- If elapsed calculation logic changes (e.g., to handle edge cases like negative spans), all three copies must be updated.
- Risk of divergence: one copy could be fixed while others remain incorrect.
- The duplication obscures that elapsed is a **derived time type** — it should have a single canonical computation.

### Affected Files
- [src/runtime/behaviors/TimerCompletionBehavior.ts](../../src/runtime/behaviors/TimerCompletionBehavior.ts)
- [src/runtime/behaviors/TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts)
- [src/runtime/behaviors/HistoryRecordBehavior.ts](../../src/runtime/behaviors/HistoryRecordBehavior.ts)

### Recommended Remediation
1. Extract `calculateElapsed` to a shared utility (e.g., `src/runtime/time/calculateElapsed.ts` or as a static method on `TimerState`)
2. Import and use from all three behaviors
3. Consider adding `elapsed(now: number): number` as a method on `TimerState` itself, making elapsed derivation a first-class concern of the type

---

## S11: `timeSpan` conflates wall-clock interval with pause-aware elapsed

### Expected (Generic Model)
> The time data in outputs should clearly represent what it measures. Wall-clock interval (start to end including pauses) and pause-aware elapsed (actual running time) are different values that serve different purposes.

### Time Types Affected
- **timestamp** — `timeSpan.started`/`.ended` are wall-clock timestamps (correct for their type)
- **elapsed** — not explicitly represented in `timeSpan`; must be derived from span list
- **spans** — the span-level detail that enables pause-aware elapsed is not surfaced in the output

### Current Behavior
`BehaviorContext.emitOutput()` constructs `OutputStatement.timeSpan` as:
```
timeSpan.started = first TimerState span's started timestamp
timeSpan.ended   = clock.now at emission time
```

This produces a **wall-clock interval** — it spans from block start to block end, including any paused time. If the workout was paused for 5 minutes during a 2-minute exercise, `timeSpan` shows a 7-minute interval, not the 2-minute elapsed.

The **elapsed** value (pause-aware, 2 minutes) is only available:
- As a fragment in `TimerOutputBehavior` completion output (if present)
- In the `history:record` event as `elapsedMs`
- By manually iterating the block's `TimerState.spans[]` (not surfaced in output)

### Impact
- Consumers that use `timeSpan.ended - timeSpan.started` for duration get **wall-clock time**, not **active time**
- There's no standard way for an output consumer to get pause-aware elapsed from the output alone (unless `TimerOutputBehavior` emitted a fragment)
- The distinction between the five time types (timestamp, elapsed, duration, total, spans) is not enforced at the output level

### Affected Files
- [src/runtime/BehaviorContext.ts](../../src/runtime/BehaviorContext.ts) — `emitOutput()` constructs timeSpan
- [src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts) — `timeSpan` property

### Recommended Remediation
Two approaches (not mutually exclusive):
1. **Add `elapsed` to OutputStatement** — A computed `elapsedMs` field alongside `timeSpan`, derived from spans when available, falling back to `timeSpan.ended - timeSpan.started` when no spans exist. Makes the distinction explicit.
2. **Add `spans` to OutputStatement** — Include the raw `TimeSpan[]` so consumers can compute elapsed themselves and understand the pause/resume pattern. More data but more flexible.
3. **Document the semantics** — At minimum, clearly document that `timeSpan` is wall-clock interval and that pause-aware elapsed requires the timer fragment or span data.

---

## Cross-References

- **Generic Output Model**: [index.md](./index.md#generic-output-model)
- **Time Taxonomy**: [index.md](./index.md#time-taxonomy)
- **Implementation Plan**: [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)
- **Behavior Source**: [src/runtime/behaviors/](../../src/runtime/behaviors/)
- **Output Statement Model**: [src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts)
- **Pop Lifecycle**: [src/runtime/actions/stack/PopBlockAction.ts](../../src/runtime/actions/stack/PopBlockAction.ts)
- **Forced Pop**: [src/runtime/actions/stack/ClearChildrenAction.ts](../../src/runtime/actions/stack/ClearChildrenAction.ts)
- **Timer State / Memory Types**: [src/runtime/memory/MemoryTypes.ts](../../src/runtime/memory/MemoryTypes.ts)
- **TimeSpan Model**: [src/runtime/models/TimeSpan.ts](../../src/runtime/models/TimeSpan.ts)
- **BehaviorContext (emitOutput)**: [src/runtime/BehaviorContext.ts](../../src/runtime/BehaviorContext.ts)
