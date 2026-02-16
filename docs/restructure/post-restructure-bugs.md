# Post-Restructure Bug Fix User Stories

These user stories address bugs discovered after the behavior restructure (Phases 0–7). Each story identifies the root cause with specific code references, the goal, and the expected fix.

---

## Story 1: Remove Redundant "Timer" Column — Use "Spans" Instead

### Problem

The review grid displays two columns that represent the same underlying data:

- **"Spans" (fixed column)** — correctly bound to `row.relativeSpans`, sourced from `SpansFragment.spans` via `AnalyticsTransformer`
- **"Timer" (fragment column)** — bound to `FragmentType.Timer` cell, which at runtime contains the full `TimerState` object (including the same `spans[]` array) stuffed into a code fragment by `TimerBehavior`

The parser creates `TimerFragment` (type `"duration"`, fragmentType `FragmentType.Timer`) to represent a *planned duration* (e.g., `"5:00"` = 300000ms). But at runtime, `TimerBehavior.createTimerFragment()` overwrites this fragment type to carry the full `TimerState` object (spans, direction, durationMs). This means the "Timer" column in the grid shows a rendered `TimerState` object instead of anything meaningful, and it duplicates the data already shown by the "Spans" column.

### Root Cause — Code References

1. **`TimerBehavior.createTimerFragment()`** — [TimerBehavior.ts#L149-L157](../../../src/runtime/behaviors/TimerBehavior.ts): Creates a runtime fragment with `fragmentType: FragmentType.Timer` whose `value` is the full `TimerState` (spans, direction, durationMs). This is NOT the same shape as the parser's `TimerFragment` class.

2. **`ReportOutputBehavior.collectStateFragments()`** — [ReportOutputBehavior.ts#L105-L108](../../../src/runtime/behaviors/ReportOutputBehavior.ts): Reads `'timer'` memory tag and includes the `FragmentType.Timer` fragment (carrying `TimerState`) in output state fragments. This means every `'completion'` output includes both a `FragmentType.Timer` fragment AND a `SpansFragment` — same spans data in two fragments.

3. **Grid column definition** — [gridPresets.ts#L20](../../../src/components/review-grid/gridPresets.ts): `FragmentType.Timer` is listed in `ALL_FRAGMENT_COLUMNS` and `DEFAULT_VISIBLE_COLUMNS`, so it renders as a fragment column.

4. **Fixed "Spans" column** — [GridRow.tsx#L135-L138](../../../src/components/review-grid/GridRow.tsx): Correctly reads `row.relativeSpans` from `AnalyticsTransformer`.

### Goal

Eliminate the redundant "Timer" fragment column from the grid. Anything that needs timer/span data should read from the "Spans" fixed column (backed by `SpansFragment`). The parser-origin `TimerFragment` (planned duration) should feed into the "Duration" fixed column instead.

### Expected Fix

| File | Change |
|------|--------|
| [gridPresets.ts](../../../src/components/review-grid/gridPresets.ts) | Remove `FragmentType.Timer` from `ALL_FRAGMENT_COLUMNS` (line ~20) and `DEFAULT_VISIBLE_COLUMNS` (line ~39) |
| [gridPresets.ts](../../../src/components/review-grid/gridPresets.ts) | Remove `FragmentType.Timer` case from `isNumericFragmentType()` (line ~219) |
| [useGraphData.ts](../../../src/components/review-grid/useGraphData.ts) | Remove `FragmentType.Timer` from `FRAGMENT_GRAPH_COLORS` (line ~182) and `getUnitForColumn()` (line ~202) |
| [ReportOutputBehavior.ts](../../../src/runtime/behaviors/ReportOutputBehavior.ts) | In `collectStateFragments()`, stop including `'timer'` memory tag fragments in state output. Timer memory should only be read by `computeTimerResults()` to produce `SpansFragment`/`ElapsedFragment`/`TotalFragment` |

### Verification

- `bun run test` — no new failures
- `bun x tsc --noEmit` — no new type errors
- In Storybook, the review grid should show the "Spans" column with correct time spans and the "Timer" fragment column should no longer appear

---

## Story 2: Fix Elapsed/Total Double-Write Between TimerBehavior and ReportOutputBehavior

### Problem

Both `TimerBehavior` and `ReportOutputBehavior` independently compute elapsed/total time and write to `fragment:result` memory during `onUnmount`. Depending on behavior execution order, this produces:

- **Duplicate fragments**: If `ReportOutputBehavior` runs first (writes via `pushMemory`), then `TimerBehavior` runs second (appends via `appendResultFragments`), the result contains duplicate `ElapsedFragment` and `TotalFragment` entries.
- **Open spans captured**: If `ReportOutputBehavior` runs before `TimerBehavior`, it captures still-open spans (last span's `ended === undefined`) in `SpansFragment`. `TimerBehavior` later closes the span, but the `SpansFragment` in the completion output is stale.
- **Blocks without timers get zero**: `ReportOutputBehavior.computeTimerResults()` defaults to `ElapsedFragment(0)` and `TotalFragment(0)` when no `timer` memory exists. Blocks like `GenericLoopStrategy`-compiled blocks (no timer) emit elapsed=0 even though they ran for real time.

### Root Cause — Code References

1. **`TimerBehavior.onUnmount()`** — [TimerBehavior.ts#L110-L120](../../../src/runtime/behaviors/TimerBehavior.ts): Closes spans, computes elapsed/total, calls `appendResultFragments()` which appends to existing `fragment:result` memory.

2. **`TimerBehavior.appendResultFragments()`** — [TimerBehavior.ts#L153-L164](../../../src/runtime/behaviors/TimerBehavior.ts): Uses **append** semantics — reads existing fragments and adds new ones.

3. **`ReportOutputBehavior.onUnmount()`** — [ReportOutputBehavior.ts#L73-L90](../../../src/runtime/behaviors/ReportOutputBehavior.ts): Independently calls `computeTimerResults()` and `writeResultMemory()`.

4. **`ReportOutputBehavior.writeResultMemory()`** — [ReportOutputBehavior.ts#L165-L173](../../../src/runtime/behaviors/ReportOutputBehavior.ts): Uses **replace** semantics via `updateMemory` if existing, or `pushMemory` if new.

5. **Behavior ordering in `SessionRootBlock`** — [SessionRootBlock.ts#L96-L101](../../../src/runtime/blocks/SessionRootBlock.ts): `ReportOutputBehavior` is added BEFORE `TimerBehavior`, so Report runs first during unmount and sees unclosed spans, then Timer appends duplicates.

### Goal

Only ONE behavior should own the `fragment:result` write. The `TimerBehavior` should own span lifecycle (opening/closing), and `ReportOutputBehavior` should own computing and writing the final elapsed/total/spans to `fragment:result`. The timer must close its spans BEFORE Report reads them.

### Expected Fix

1. **Remove `appendResultFragments()` from `TimerBehavior.onUnmount()`** — [TimerBehavior.ts#L117-L120](../../../src/runtime/behaviors/TimerBehavior.ts): `TimerBehavior` should ONLY close spans and update `'timer'` memory. It should NOT write to `fragment:result`. Delete the `appendResultFragments` call and method.

2. **Ensure `TimerBehavior` runs before `ReportOutputBehavior` in unmount** — Reorder behaviors in [SessionRootBlock.ts](../../../src/runtime/blocks/SessionRootBlock.ts) so `TimerBehavior` is added before `ReportOutputBehavior`. This ensures spans are closed before Report computes elapsed from them.

3. **In `ReportOutputBehavior.computeTimerResults()`**: No changes needed — it already correctly reads `timer` memory, computes elapsed from spans, and writes `fragment:result`. It just needs to see closed spans.

### Verification

- `bun run test` — no new failures
- After fix, `fragment:result` should contain exactly ONE `ElapsedFragment` and ONE `TotalFragment` per block
- All `SpansFragment` entries should have closed spans (no `ended === undefined`)

---

## Story 3: Fix Duration Column Showing "NaN:NaN" (Displays as "NA:")

### Problem

The "Duration" fixed column in the review grid shows "NA:" (which is actually `"NaN:NaN"` rendered from `formatDuration(NaN)`). The duration value comes from runtime elapsed time, not from the parser's planned duration. When the elapsed value is `NaN` (due to invalid or missing span data), it propagates all the way to the display.

### Root Cause — Code References

1. **`formatDuration()` has no NaN guard** — [GridRow.tsx#L179-L192](../../../src/components/review-grid/GridRow.tsx) (or [useGridData.ts#L460-L473](../../../src/components/review-grid/useGridData.ts)): The function checks `if (ms <= 0) return '0:00'`, but `NaN <= 0` evaluates to `false`, so `NaN` falls through and produces `"NaN:NaN"`.

2. **`row.duration` uses nullish coalescing that doesn't catch NaN** — [useGridData.ts#L199](../../../src/components/review-grid/useGridData.ts): `const duration = (seg.duration ?? 0) * 1000`. The `??` operator only catches `null`/`undefined`, NOT `NaN`. So `NaN * 1000 = NaN`.

3. **`seg.duration` comes from runtime elapsed** — [AnalyticsTransformer.ts#L75](../../../src/services/AnalyticsTransformer.ts): `const duration = output.elapsed / 1000`. If `output.elapsed` is `NaN` (e.g., from invalid `TimeSpan.started`), it propagates.

4. **`output.elapsed` can be NaN** — [OutputStatement.ts#L259-L262](../../../src/core/models/OutputStatement.ts): When `this.spans.length === 0`, falls back to `this.timeSpan.duration`, which returns `NaN` if `started` is invalid.

5. **`DurationFragment` is never instantiated in production** — [DurationFragment.ts](../../../src/runtime/compiler/fragments/DurationFragment.ts): The class exists but is only used in one test file. The parser creates `TimerFragment` (fragmentType=`Timer`, type=`"duration"`) instead. Neither feeds the fixed Duration column.

### Goal

The Duration column should show the **planned duration** from the code fragment (the value the user wrote, e.g., "5:00"). When no planned duration exists, it should show the elapsed time. When the value is `NaN` or invalid, it should show a graceful fallback like `"—"`.

### Expected Fix

1. **Add NaN guard to `formatDuration()`** — [GridRow.tsx](../../../src/components/review-grid/GridRow.tsx) and/or [useGridData.ts](../../../src/components/review-grid/useGridData.ts): Change guard from `if (ms <= 0)` to `if (!Number.isFinite(ms) || ms <= 0) return '—'`.

2. **Fix nullish coalescing for NaN** — [useGridData.ts#L199](../../../src/components/review-grid/useGridData.ts): Change `(seg.duration ?? 0)` to `(Number.isFinite(seg.duration) ? seg.duration : 0)`.

3. **Prefer planned duration from parser fragments** — In [useGridData.ts](../../../src/components/review-grid/useGridData.ts), when building `row.duration`, check if a `TimerFragment` with type `"duration"` exists in the segment's fragments and use its `value` (planned duration in ms). Fall back to `seg.duration` (runtime elapsed) only if no planned duration is available.

### Verification

- `bun run test` — no new failures
- In Storybook, the Duration column should show formatted durations (e.g., "5:00") instead of "NA:"
- Blocks without a timer should show "—" instead of "NaN:NaN"

---

## Story 4: Fix Round Tracking — Stuck at Round 1

### Problem

The `ReEntryBehavior` never advances the round counter past 1. The user always sees "Round 1 of N" regardless of how many children have completed.

### Root Cause — Code References

There are two interacting bugs:

#### Bug A: `allCompleted` is never `true` when ReEntryBehavior reads it

`ChildSelectionBehavior.onNext()` — [ChildSelectionBehavior.ts#L117-L153](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): When the last child index exceeds `totalChildren`, the behavior immediately enters `shouldLoop()`. If looping is enabled, it resets `childIndex = 0` and calls `dispatchNext()` which sets `dispatchedOnLastNext = true` and increments `childIndex` to 1.

`allChildrenCompleted` getter — [ChildSelectionBehavior.ts#L174-L176](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): Returns `this.allChildrenExecuted && !this.dispatchedOnLastNext`. Since `dispatchedOnLastNext` is `true` after dispatching the first child of the next cycle, `allChildrenCompleted` is ALWAYS `false`.

`writeChildrenStatus()` — [ChildSelectionBehavior.ts#L263-L271](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): Writes `allCompleted: this.allChildrenCompleted` which is `false`.

`ReEntryBehavior.onNext()` — [ReEntryBehavior.ts#L53-L55](../../../src/runtime/behaviors/ReEntryBehavior.ts): Gates advancement on `childStatus.allCompleted`. Since it's always `false`, round never advances.

#### Bug B: `shouldLoop` uses `<=` instead of `<` for rounds-remaining

`shouldLoop()` — [ChildSelectionBehavior.ts#L228](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): The condition `round.current <= round.total` returns `true` when `current === total` (the last round). This causes an **extra loop** — children are dispatched for round N+1 even though only N rounds were requested. The correct condition is `round.current < round.total`.

#### Bug C: Behavior execution order

In `SessionRootBlock.buildBehaviors()` — [SessionRootBlock.ts#L106-L131](../../../src/runtime/blocks/SessionRootBlock.ts):
- `ReEntryBehavior` is at index 2
- `ChildSelectionBehavior` is at index 4

During `onNext()`, `ReEntryBehavior` reads `children:status` BEFORE `ChildSelectionBehavior` writes it. So even if `allCompleted` were written correctly, `ReEntryBehavior` sees the STALE value from the previous cycle.

### Goal

Round advancement should work correctly:
- `children:status.allCompleted` should be `true` at the moment all N children have been executed for the current round and before looping begins
- `ReEntryBehavior` should read the CURRENT status (not stale)
- Looping should stop after exactly the configured number of rounds

### Expected Fix

1. **Write `allCompleted = true` BEFORE looping in `ChildSelectionBehavior.onNext()`** — [ChildSelectionBehavior.ts#L129-L148](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): When `childIndex >= totalChildren` and `shouldLoop()` returns `true`, write `children:status` with `allCompleted: true` BEFORE resetting `childIndex` and dispatching the next child. This signals to `ReEntryBehavior` that a complete cycle occurred.

2. **Fix `shouldLoop` condition** — [ChildSelectionBehavior.ts#L228](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): Change `round.current <= round.total` to `round.current < round.total`.

3. **Reorder behaviors in `SessionRootBlock`** — [SessionRootBlock.ts](../../../src/runtime/blocks/SessionRootBlock.ts): Move `ChildSelectionBehavior` BEFORE `ReEntryBehavior` in the behaviors array so that children:status is written before ReEntry reads it.

   Recommended behavior order:
   ```
   1. TimerBehavior         (writes timer memory)
   2. ChildSelectionBehavior (writes children:status)
   3. ReEntryBehavior        (reads children:status, writes round)
   4. WaitingToStartInjector (gate)
   5. RoundsEndBehavior      (reads round)
   6. ReportOutputBehavior   (reads round, timer, children:status)
   7. LabelingBehavior       (reads round)
   8. ButtonBehavior         (controls)
   ```

### Verification

- `bun run test` — no new failures
- In Storybook, round counter should advance from "Round 1" → "Round 2" → ... → "Round N" as children complete
- Block should complete (pop) after all N rounds finish, not after N+1

---

## Story 5: Fix Timer Completion — Block Stuck at Zero, Never Pops

### Problem

When a countdown timer reaches zero, the timer sits at 0:00 and the block never pops from the stack. The expected behavior is: timer expires → children are cleared → parent block receives `next()` → `CompletedBlockPopBehavior` pops the parent → next block begins.

### Root Cause — Code References

The `TimerEndingBehavior` in `complete-block` mode does fire correctly when elapsed ≥ durationMs. It:
1. Calls `ctx.markComplete('timer-expired')` — [TimerEndingBehavior.ts#L62](../../../src/runtime/behaviors/TimerEndingBehavior.ts)
2. Returns `[new ClearChildrenAction(...)]` — [TimerEndingBehavior.ts#L68](../../../src/runtime/behaviors/TimerEndingBehavior.ts)

The `ClearChildrenAction` works as designed — [ClearChildrenAction.ts#L36-L86](../../../src/runtime/actions/stack/ClearChildrenAction.ts):
1. Pops all blocks above the target block
2. Queues a `NextAction` so the target block gets `next()`

The `NextAction` calls `currentBlock.next(runtime)` — [NextAction.ts#L43](../../../src/runtime/actions/stack/NextAction.ts).

But the problem is that `CompletedBlockPopBehavior` — [CompletedBlockPopBehavior.ts#L33-L36](../../../src/runtime/behaviors/CompletedBlockPopBehavior.ts) — only exists on blocks where `ChildrenStrategy` adds it ([ChildrenStrategy.ts#L87](../../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts)). It is only added when the builder `hasBehavior(TimerEndingBehavior)`.

For **leaf timer blocks** (no children, no `ChildrenStrategy`), `TimerEndingBehavior` marks complete and returns `ClearChildrenAction`. But `ClearChildrenAction` on a leaf block with no children just queues a `NextAction`. When `next()` fires, the block's behaviors process it — but `LeafExitBehavior.onNext()` checks `this.config.onNext` (which is `true`) and returns `PopBlockAction`. **So leaf blocks should work.**

The issue is with **parent blocks with children** (AMRAP, EMOM). The chain is:
1. `TimerEndingBehavior` tick handler fires → returns `ClearChildrenAction`
2. But the tick handler **returns actions from an event callback**, not from a lifecycle method
3. The `EventBus.dispatch()` collects these actions — [EventBus.ts#L160-L166](../../../src/runtime/events/EventBus.ts)
4. `ScriptRuntime.handle()` calls `this.doAll(actions)` — [ScriptRuntime.ts#L160](../../../src/runtime/ScriptRuntime.ts)

The critical question is whether the `ClearChildrenAction` → `NextAction` chain is processed correctly within `doAll()`. Let me trace the execution:

- `ClearChildrenAction.do()` pops children and returns `[...sideEffects, new NextAction()]`
- `NextAction.do()` calls `currentBlock.next()` which calls behaviors' `onNext()`
- `CompletedBlockPopBehavior.onNext()` checks `ctx.block.isComplete` — the block was marked complete by `TimerEndingBehavior`
- Returns `[new PopBlockAction()]`

This chain **should work** if `CompletedBlockPopBehavior` is present. The bug is likely that:

**`CompletedBlockPopBehavior` is NOT added to certain block configurations.**

Check [ChildrenStrategy.ts#L82-L87](../../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts):
```typescript
if (hasCountdownCompletion) {
    builder.addBehavior(new CompletedBlockPopBehavior());
}
```

`hasCountdownCompletion` is `builder.hasBehavior(TimerEndingBehavior)`. If `TimerEndingBehavior` is added AFTER `ChildrenStrategy` runs (e.g., via `BlockBuilder.asTimer()` called after `ChildrenStrategy.apply()`), then `hasBehavior(TimerEndingBehavior)` returns `false` — and `CompletedBlockPopBehavior` is never added.

**Strategy execution order** in [JitCompiler.ts](../../../src/runtime/JitCompiler.ts): Strategies are applied by priority. `ChildrenStrategy` is an enhancement strategy that runs after component strategies. The component strategy (e.g., `AmrapLogicStrategy`) calls `builder.asTimer()` which adds `TimerEndingBehavior`. Then `ChildrenStrategy` runs and checks `hasBehavior(TimerEndingBehavior)`. This SHOULD find it.

But another scenario: if `TimerEndingBehavior` config is `{ ending: { mode: 'complete-block' } }` — the timer marks complete but `ClearChildrenAction` might fail if the block has no children on the stack at that moment (all children may have already completed and popped naturally). In that case, `ClearChildrenAction` does nothing (the while loop finds `current.key === targetBlockKey` immediately) and queues `NextAction`. `NextAction` fires `next()`, and if `ChildSelectionBehavior` tries to loop (because `shouldLoop` bug from Story 4 returns `true`), it dispatches a NEW child instead of letting `CompletedBlockPopBehavior` pop the block. The newly dispatched child is never completed (timer already expired), creating a stuck state.

### Goal

When a countdown timer expires on ANY block type (leaf or parent), the block must pop from the stack. The flow should be:
1. Timer expires → block marked complete → children cleared
2. After children clear → `next()` on parent → parent pops because it's marked complete
3. No new children should be dispatched after the block is marked complete

### Expected Fix

1. **Ensure `ChildSelectionBehavior` respects `isComplete`** — [ChildSelectionBehavior.ts#L117-L120](../../../src/runtime/behaviors/ChildSelectionBehavior.ts): The `onNext()` method already checks `if (ctx.block.isComplete)` at line 119 and returns early without dispatching children. Verify this guard fires correctly when `markComplete` is called during a tick handler.

2. **Ensure `CompletedBlockPopBehavior` is always added** — [ChildrenStrategy.ts#L82-L87](../../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts): Verify that `builder.hasBehavior(TimerEndingBehavior)` returns `true` at the time `ChildrenStrategy` runs. If strategy ordering is the issue, consider always adding `CompletedBlockPopBehavior` to container blocks (it's a no-op when `isComplete` is false).

3. **Fix interaction with Story 4 (`shouldLoop` bug)** — The `shouldLoop` returning `true` on the last round can cause `ChildSelectionBehavior` to dispatch a new child even after `markComplete`. Fix the `shouldLoop` condition (Story 4) and verify the `isComplete` guard short-circuits before `shouldLoop` is ever called.

4. **Add debug logging** — Temporarily add logging to `TimerEndingBehavior` tick handler, `ClearChildrenAction.do()`, and `CompletedBlockPopBehavior.onNext()` to trace the exact point where the chain breaks.

### Verification

- `bun run test` — no new failures
- In Storybook, start a countdown timer (e.g., "0:10 Run") and let it reach zero
- The block should automatically pop and the next block (or session end) should appear
- For AMRAP: timer expires → all children clear → AMRAP block pops → session advances

---

## Summary Table

| Story | Bug | Root File(s) | Severity |
|-------|-----|-------------|----------|
| 1 | Timer column duplicates Spans column | `gridPresets.ts`, `ReportOutputBehavior.ts` | Low |
| 2 | Double-write of elapsed/total to fragment:result | `TimerBehavior.ts`, `ReportOutputBehavior.ts`, `SessionRootBlock.ts` | Medium |
| 3 | Duration shows "NaN:NaN" | `GridRow.tsx`, `useGridData.ts`, `AnalyticsTransformer.ts` | Low |
| 4 | Round counter stuck at 1 | `ChildSelectionBehavior.ts`, `ReEntryBehavior.ts`, `SessionRootBlock.ts` | High |
| 5 | Timer at zero, block never pops | `TimerEndingBehavior.ts`, `ChildrenStrategy.ts`, `ChildSelectionBehavior.ts` | High |

### Recommended Fix Order

1. **Story 4** (Round tracking) — fixes the `shouldLoop` bug and behavior ordering, which is a prerequisite for Story 5
2. **Story 5** (Timer completion) — depends on Story 4's `shouldLoop` fix to prevent children dispatch after completion
3. **Story 2** (Double-write) — requires behavior reordering from Story 4 and Timer cleanup
4. **Story 3** (Duration NaN) — independent, can be done in parallel with Stories 4/5
5. **Story 1** (Timer column removal) — independent, can be done in parallel with any story
