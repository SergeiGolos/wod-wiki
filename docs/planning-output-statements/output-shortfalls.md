# Output Contract Shortfalls Analysis

> **Purpose**: Identify gaps between the generic output model (defined in [index.md](./index.md)) and the current codebase implementation. Each shortfall describes the expected behavior, current behavior, affected components, and recommended remediation.

---

## Summary

| # | Shortfall | Severity | Category |
|---|-----------|----------|----------|
| S1 | Leaf blocks emit no output on `next` (self-pop path) | Medium | Leaf output timing |
| S2 | No distinction between self-pop and parent-pop in output content | Medium | Output metadata |
| S3 | Container entry output lacks state identity | Low | Container output |
| S4 | `RoundOutputBehavior` does not emit milestone on mount (initial round) | Medium | Container state change |
| S5 | Runtime-tracked fragments not consistently included in leaf completions | High | Fragment flow |
| S6 | Duplicate completion outputs on blocks with both `SegmentOutputBehavior` and `TimerOutputBehavior` | Medium | Output deduplication |
| S7 | No explicit leaf/container classification on `IRuntimeBlock` | Low | Architecture |
| S8 | Container `next` milestone only covers round state, not timer state | Low | Container state change |

---

## S1: Leaf blocks emit no output on `next` (self-pop path)

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

### Current Behavior
Fragment inclusion in completion outputs is inconsistent:

| Behavior | Completion Fragments | Includes Runtime Data? |
|----------|---------------------|----------------------|
| `SegmentOutputBehavior.onUnmount` | `fragment:display` (parser fragments) | ❌ No runtime fragments |
| `TimerOutputBehavior.onUnmount` | `fragment:display` + duration fragment | ✅ Adds elapsed time |

- Blocks with `TimerOutputBehavior` get proper runtime-enriched completions.
- Blocks with only `SegmentOutputBehavior` (e.g., simple effort blocks without timers) get completions with only parser fragments — no runtime-tracked data (elapsed time from mount to unmount, etc.).
- When both behaviors are present on the same block, **two separate** `completion` outputs are emitted (see S6).
- Other runtime-tracked state beyond timers (e.g., actual rep counts if implemented, tracked metrics) has no standardized path into output fragments.

### Affected Files
- [src/runtime/behaviors/SegmentOutputBehavior.ts](../../src/runtime/behaviors/SegmentOutputBehavior.ts) — `onUnmount` only uses `fragment:display`
- [src/runtime/behaviors/TimerOutputBehavior.ts](../../src/runtime/behaviors/TimerOutputBehavior.ts) — `onUnmount` adds duration but is its own separate output

### Recommended Remediation
1. Define a `fragment:tracked` memory tag convention for runtime-collected fragments (elapsed, reps, etc.)
2. `SegmentOutputBehavior.onUnmount` (or a unified output behavior) reads both `fragment:display` AND `fragment:tracked` to produce a single rich completion output
3. Alternatively, consolidate `TimerOutputBehavior` into `SegmentOutputBehavior` so all completion output goes through one behavior that merges all fragment sources

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
| **S2** No self-pop vs parent-pop distinction | Medium — lost semantics | Low | 🟡 P2 |
| **S1** No output on `next` for self-pop | Medium — timing concern | Medium | 🟡 P2 |
| **S4** No initial round milestone | Medium — doc mismatch | Low | 🟡 P2 |
| **S3** Container entry lacks state identity | Low — inferrable from context | Medium | 🟢 P3 |
| **S8** Only round state in container milestones | Low — most changes covered by children | Medium | 🟢 P3 |
| **S7** No explicit leaf/container flag | Low — architectural quality | Low | 🟢 P3 |

---

## Cross-References

- **Generic Output Model**: [index.md](./index.md#generic-output-model)
- **Implementation Plan**: [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)
- **Behavior Source**: [src/runtime/behaviors/](../../src/runtime/behaviors/)
- **Output Statement Model**: [src/core/models/OutputStatement.ts](../../src/core/models/OutputStatement.ts)
- **Pop Lifecycle**: [src/runtime/actions/stack/PopBlockAction.ts](../../src/runtime/actions/stack/PopBlockAction.ts)
- **Forced Pop**: [src/runtime/actions/stack/ClearChildrenAction.ts](../../src/runtime/actions/stack/ClearChildrenAction.ts)
