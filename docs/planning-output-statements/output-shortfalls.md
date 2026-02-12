# Output Contract Shortfalls Analysis

> **Purpose**: Identify gaps between the generic output model (defined in [index.md](./index.md)) and the current codebase implementation. Each shortfall describes the expected behavior, current behavior, affected components, and recommended remediation.

###### Prompt Template:

> in document docs/planning-output-statements/output-shortfalls.md lets address issues ##

## Summary

| #   | Shortfall                                                                                                         | Severity | Category               |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------- | ---------------------- |
| S1  | ~~Leaf blocks emit no output on `next` (self-pop path)~~ ✅ RESOLVED                                               | Medium   | Leaf output timing     |
| S2  | ~~No distinction between self-pop and parent-pop in output content~~ ✅ RESOLVED                                   | Medium   | Output metadata        |
| S3  | ~~Container entry output lacks state identity~~ ✅ RESOLVED                                                        | Low      | Container output       |
| S4  | ~~`RoundOutputBehavior` does not emit milestone on mount (initial round)~~ ✅ RESOLVED                             | Medium   | Container state change |
| S5  | ~~Runtime-tracked fragments not consistently included in leaf completions~~ ✅ RESOLVED                            | High     | Fragment flow          |
| S6  | ~~Duplicate completion outputs on blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior`~~ ✅ RESOLVED | Medium   | Output deduplication   |
| S7  | No explicit leaf/container classification on `IRuntimeBlock`                                                      | Low      | Architecture           |
| S8  | Container `next` milestone only covers round state, not timer state                                               | Low      | Container state change |
| S9  | ~~Non-timer leaf blocks have no elapsed time in outputs~~ ✅ RESOLVED                                              | High     | Time tracking          |
| S10 | ~~`calculateElapsed()` duplicated across three behaviors~~ ✅ RESOLVED                                             | Medium   | Time tracking          |
| S11 | ~~`timeSpan` conflates wall-clock interval with pause-aware elapsed~~ ✅ RESOLVED                                | Medium   | Time tracking          |

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

## S2: No distinction between self-pop and parent-pop in output content — ✅ RESOLVED

### Resolution

Resolved as part of the **S1 implementation**. The `completionReason` field was added across the entire output pipeline, enabling downstream consumers to distinguish self-pop (`'user-advance'`) from parent-pop (`'forced-pop'`) and other completion scenarios.

**Changes (same as S1):**
1. **`IRuntimeBlock`** — `readonly completionReason?: string` exposes the block's completion reason.
2. **`OutputOptions`** — `completionReason?: string` allows behaviors to pass the reason through `emitOutput`.
3. **`IOutputStatement` / `OutputStatement`** — `completionReason?: string` field carries the reason on the output model.
4. **`BehaviorContext.emitOutput`** — Forwards `_options?.completionReason` into the `OutputStatement` constructor.
5. **`SegmentOutputBehavior.onUnmount`** — Reads `ctx.block.completionReason` and passes it as `completionReason` in the output options.

**Test coverage** in `SegmentOutputBehavior.test.ts`:
- `'user-advance'` completionReason propagated on self-pop unmount
- `'forced-pop'` completionReason propagated on parent-pop unmount
- `undefined` completionReason when block has no reason

Additional integration tests validate end-to-end in `amrap-pattern.test.ts`, `for-time-single.test.ts`, `timer-block.test.ts`, and `clear-children.test.ts`.

### Original Analysis

#### Expected (Generic Model)
> Leaf blocks should generate output on `next` when they self-pop, OR on pop if `next` was not called (parent-forced pop). These are distinct scenarios that should be identifiable in the output stream.

#### Previous Behavior
Both self-pop and parent-pop produced identical `completion` outputs via `SegmentOutputBehavior.onUnmount()`. The `OutputStatement` had no field to distinguish:
- **Self-pop**: User clicked next → `PopOnNextBehavior` → `markComplete('user-advance')` → `PopBlockAction` → unmount
- **Parent-pop**: Timer expired → `ClearChildrenAction` → `PopBlockAction` → `markComplete('forced-pop')` → unmount

While `PopBlockAction` correctly set `completionReason` on the block (`'user-advance'` vs `'forced-pop'`), this metadata was **not propagated** to the `OutputStatement`.

#### Affected Files
- [src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts) — now has `completionReason` field
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — `onUnmount` now reads completion context
- [src/runtime/actions/stack/PopBlockAction.ts](../../src/runtime/actions/stack/PopBlockAction.ts) — sets reason on block, now flows to output

---

## S3: Container entry output lacks state identity — ✅ RESOLVED

### Resolution

Implemented **Option 2** — extended `SegmentOutputBehavior.onMount` to also read from `'round'` and `'timer'` memory tags and merge those runtime state fragments alongside the parser display fragments.

**Changes:**
1. **`SegmentOutputBehavior`** — Added `getRuntimeStateFragments()` method that reads `'round'` and `'timer'` memory tags from the block.
2. **`SegmentOutputBehavior.onMount`** — Now calls `getRuntimeStateFragments()` and merges the results with `fragment:display` fragments, deduplicating by `fragmentType:type` key to avoid repeats when the same fragment already exists in display memory.
3. **`onUnmount` unchanged** — Completion output still uses only `fragment:display`, keeping the completion output focused on prescribed fragments (runtime state at completion is captured by other means like `completionReason`).

**Key design decisions:**
- Deduplication uses `fragmentType:type` composite key — if a `Timer:timer` fragment already exists in `fragment:display` (from the parser), the runtime's `Timer:timer` fragment is skipped.
- `RoundInitBehavior` and `TimerInitBehavior` both run before `SegmentOutputBehavior` in the behavior chain (registered earlier in strategies), so their memory is available when `onMount` reads it.

**Test coverage** in `SegmentOutputBehavior.test.ts` (6 new tests):
- Round fragments included in segment output on mount
- Timer fragments included in segment output on mount
- Display + round + timer fragments merged correctly on mount
- Deduplication when display already has a timer fragment
- Completion output does not include runtime state fragments

### Original Analysis

#### Expected (Generic Model)
> Container blocks should create an output on entry identifying their state — timer duration, round count (current/total), label.

#### Previous Behavior
Container blocks with `SegmentOutputBehavior` emitted a `segment` on mount containing only `fragment:display` memory. Round and timer state were initialized by their respective behaviors but not included in the segment output.

#### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — now reads `'round'` and `'timer'` memory tags on mount
- [src/runtime/behaviors/RoundInitBehavior.ts](../../src/runtime/behaviors/RoundInitBehavior.ts) — unchanged (state already written to `'round'` memory)

---

## S4: `RoundOutputBehavior` does not emit milestone on mount (initial round) — ✅ RESOLVED

### Resolution

Implemented **Option 1** — `RoundOutputBehavior.onMount()` now emits a `milestone` with the initial round state (e.g., "Round 1 of 3"), matching the planning docs.

**Changes:**
1. **`RoundOutputBehavior.onMount`** — Now reads `'round'` memory and emits a `milestone` output with a `FragmentType.Rounds` fragment, using the same pattern as `onNext`. This ensures the output stream has a milestone for the initial round, not just for subsequent round advances.

**Test coverage** in `RoundOutputBehavior.test.ts` (9 tests):
- Initial milestone emitted on mount with bounded rounds (e.g., "Round 1 of 3")
- Initial milestone emitted on mount with unbounded rounds (e.g., "Round 1")
- No milestone emitted when no round state exists
- Returns empty actions array on mount
- Round advance milestones still emitted on `onNext`
- No output on unmount (unchanged)
- Lifecycle pairing: mount milestone followed by next milestone with no gap

Integration tests updated in `amrap-pattern.test.ts`, `emom-pattern.test.ts`, and `performance.test.ts` to account for the additional initial milestone.

### Original Analysis

#### Expected (Generic Model)
> Container blocks should create an output on entry identifying their state.

The planning docs (e.g., [fixed-round-loop.md](./fixed-round-loop.md)) show the Loop block emitting `milestone` with `rounds: 1/3` on mount (step 6). This is the container announcing its initial round state.

#### Previous Behavior
`RoundOutputBehavior.onMount()` was intentionally empty ("segment output is handled elsewhere"). The initial round state was never emitted as a `milestone`. The first `milestone` only appeared when `round.current` advanced from 1→2 on the first `onNext` after all children completed.

#### Affected Files
- [src/runtime/behaviors/RoundOutputBehavior.ts](../../src/runtime/behaviors/RoundOutputBehavior.ts) — `onMount` now emits initial round milestone

---

## S5: Runtime-tracked fragments not consistently included in leaf completions — ✅ RESOLVED

### Resolution

Consolidated all completion output into `SegmentOutputBehavior.onUnmount`. It now merges three fragment sources into a single rich completion output:

1. **`fragment:display`** — parser-prescribed fragments (existing)
2. **`fragment:tracked`** — runtime-tracked fragments written by other behaviors (existing)
3. **Elapsed duration** — computed directly by `SegmentOutputBehavior` (new)

**Elapsed computation strategy:**
- If `timer` memory exists → pause-aware elapsed from timer spans via `calculateElapsed()`
- Else if `executionTiming.startTime` exists → wall-clock elapsed (`completedAt - startTime`)
- Else → no elapsed (gracefully skipped)

`TimerOutputBehavior` is no longer registered in any strategy. Its elapsed computation is now inlined in `SegmentOutputBehavior.getElapsedFragment()`. The file remains for backward compatibility but is deprecated.

**This also resolves S6, S9, and S10:**
- **S6**: No duplicate completions — `TimerOutputBehavior` no longer emits its own completion
- **S9**: Non-timer blocks now get elapsed from `executionTiming` fallback
- **S10**: `calculateElapsed()` extracted to shared utility `src/runtime/time/calculateElapsed.ts`

**Changes:**
1. **`SegmentOutputBehavior`** — Added `getElapsedFragment()` method with timer-span-first / executionTiming-fallback strategy. `onUnmount` merges display + tracked + elapsed with deduplication.
2. **`src/runtime/time/calculateElapsed.ts`** — New shared utility with `calculateElapsed()` and `formatDuration()`.
3. **`TimerOutputBehavior`** — Now only writes to `fragment:tracked` memory (no output emission). Deprecated — `SegmentOutputBehavior` computes elapsed directly.
4. **`TimerCompletionBehavior`** — Uses shared `calculateElapsed` from `src/runtime/time/calculateElapsed.ts`.
5. **`HistoryRecordBehavior`** — Uses shared `calculateElapsed` from `src/runtime/time/calculateElapsed.ts`.
6. **Strategies** — `TimerOutputBehavior` removed from `GenericTimerStrategy`, `EffortFallbackStrategy`, `AmrapLogicStrategy`, `IntervalLogicStrategy`.
7. **`behaviors/index.ts`** — `TimerOutputBehavior` export removed (deprecated comment added).

**Test coverage** in `SegmentOutputBehavior.test.ts` (7 new tests):
- Elapsed from timer spans included in completion
- Pause-aware elapsed from multiple spans
- Wall-clock elapsed for non-timer blocks via `executionTiming`
- Fallback to `clock.now` when `completedAt` not set
- No duplication when tracked fragment already has duration
- No elapsed when no timer and no executionTiming
- Timer spans preferred over executionTiming when both exist

Integration tests updated: `timer-block.test.ts`, `performance.test.ts`.

### Original Analysis

#### Expected (Generic Model)
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

## S6: Duplicate completion outputs on blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior` — ✅ RESOLVED

### Resolution

Resolved as part of the **S5 consolidation**. `TimerOutputBehavior` is no longer registered in any strategy, so blocks only have `SegmentOutputBehavior` emitting a single `completion` output on unmount. The elapsed duration that `TimerOutputBehavior` used to compute is now computed directly by `SegmentOutputBehavior.getElapsedFragment()`.

### Original Analysis

#### Expected (Generic Model)
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
| ~~**S5**~~ | ~~Runtime fragments missing from completions~~ | ~~Medium~~ | ✅ Resolved |
| ~~**S6**~~ | ~~Duplicate completion outputs~~ | ~~Low~~ | ✅ Resolved |
| ~~**S9**~~ | ~~Non-timer leaves missing elapsed~~ | ~~Low~~ | ✅ Resolved |
| ~~**S2**~~ | ~~No self-pop vs parent-pop distinction~~ | ~~Medium~~ | ✅ Resolved |
| ~~**S1**~~ | ~~No output on `next` for self-pop~~ | ~~Medium~~ | ✅ Resolved |
| ~~**S4**~~ | ~~No initial round milestone~~ | ~~Low~~ | ✅ Resolved |
| ~~**S10**~~ | ~~calculateElapsed duplicated 3x~~ | ~~Low~~ | ✅ Resolved |
| **S11** timeSpan conflates wall-clock and elapsed | Medium — semantic ambiguity | Medium | 🟡 P2 |
| ~~**S3**~~ | ~~Container entry lacks state identity~~ | ~~Low~~ | ✅ Resolved |
| **S8** Only round state in container milestones | Low — most changes covered by children | Medium | 🟢 P3 |
| **S7** No explicit leaf/container flag | Low — architectural quality | Low | 🟢 P3 |

---

## S9: Non-timer leaf blocks have no elapsed time in outputs — ✅ RESOLVED

### Resolution

Resolved as part of the **S5 consolidation**. `SegmentOutputBehavior.getElapsedFragment()` now computes wall-clock elapsed from `executionTiming` (`completedAt - startTime`) when no timer state exists. All leaf blocks — with or without timers — now include an elapsed duration fragment in their completion output.

### Original Analysis

#### Expected (Generic Model)
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

## S10: `calculateElapsed()` duplicated across three behaviors — ✅ RESOLVED

### Resolution

Resolved as part of the **S5 consolidation**. `calculateElapsed()` and `formatDuration()` extracted to a shared utility at `src/runtime/time/calculateElapsed.ts`. All three previous consumers now import from this single location:
- `TimerCompletionBehavior` — checks if timer has expired
- `HistoryRecordBehavior` — computes elapsed for history event
- `SegmentOutputBehavior` — computes elapsed for completion fragment

### Original Analysis

#### Expected
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

## S11: `timeSpan` conflates wall-clock interval with pause-aware elapsed — ✅ RESOLVED

### Resolution

Implemented **Options 1+2** — added raw `spans` array and computed `elapsed`/`total` properties to `OutputStatement`, making the distinction between pause-aware active time and wall-clock interval explicit.

**Time Semantics:**
- A **timestamp** is a degenerate `TimeSpan` where `started === ended` (zero duration — a point-in-time marker)
- Multiple spans on a timer fragment represent active (unpaused) execution periods
- **`elapsed`** = sum of all individual span durations (pause-aware active time)
- **`total`** = from start of first span to end of last span (wall-clock bracket, includes paused time)
- When no spans are available, both `elapsed` and `total` fall back to `timeSpan.duration`

**Changes:**
1. **`IOutputStatement`** — Added `spans: ReadonlyArray<TimeSpan>`, `elapsed: number`, `total: number` to the interface.
2. **`OutputStatementOptions`** — Added optional `spans?: TimeSpan[]` so behaviors can pass raw span data through `emitOutput`.
3. **`OutputStatement`** — Stores defensive copy of spans; computed `elapsed` (sum of span durations) and `total` (first start to last end) getters with `timeSpan.duration` fallback.
4. **`BehaviorContext.emitOutput()`** — Extracts spans from the block's timer memory and passes them to the `OutputStatement` constructor alongside the existing `timeSpan`.
5. **`AnalyticsTransformer`** — Uses `output.elapsed` (pause-aware) instead of `output.timeSpan.duration` (wall-clock).
6. **`RuntimeHistoryLog`** — Uses `output.elapsed` for duration display.
7. **`ResultsTable`** — Uses `output.elapsed` for duration display.
8. **`AnalyticsTransformer.test.ts`** — Mock outputs updated with `spans`, `elapsed`, `total` properties.

**Test coverage** in `OutputStatementFragmentSource.test.ts` (10 new tests):
- Default empty spans array
- Spans stored and accessible
- Elapsed computed as sum of span durations (pause-aware)
- Total computed as wall-clock bracket (first start to last end)
- Fallback to `timeSpan.duration` when no spans
- Timestamp (start === end) as zero-duration span
- Multiple timestamps with zero elapsed but nonzero total
- Single continuous span (elapsed === total)
- Mixed timestamps and spans
- Defensive copy (readonly spans array)

### Original Analysis
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
