# Story 5: Fix Timer Completion — Block Stuck at Zero, Never Pops

**Severity:** High  
**Dependencies:** Story 4 (`shouldLoop` fix)  
**Blocked by:** Story 4  

## Problem

When a countdown timer reaches zero, the timer sits at 0:00 and the block never pops from the stack. The expected behavior is: timer expires → children are cleared → parent block receives `next()` → `CompletedBlockPopBehavior` pops the parent → next block begins.

## Root Cause — Code References

The `TimerEndingBehavior` in `complete-block` mode does fire correctly when elapsed ≥ durationMs. It:
1. Calls `ctx.markComplete('timer-expired')` — [TimerEndingBehavior.ts#L62](../../../../src/runtime/behaviors/TimerEndingBehavior.ts)
2. Returns `[new ClearChildrenAction(...)]` — [TimerEndingBehavior.ts#L68](../../../../src/runtime/behaviors/TimerEndingBehavior.ts)

The `ClearChildrenAction` works as designed — [ClearChildrenAction.ts#L36-L86](../../../../src/runtime/actions/stack/ClearChildrenAction.ts):
1. Pops all blocks above the target block
2. Queues a `NextAction` so the target block gets `next()`

The `NextAction` calls `currentBlock.next(runtime)` — [NextAction.ts#L43](../../../../src/runtime/actions/stack/NextAction.ts).

### Why leaf blocks work

For **leaf timer blocks** (no children, no `ChildrenStrategy`): `TimerEndingBehavior` marks complete and returns `ClearChildrenAction`. `ClearChildrenAction` on a leaf with no children above it just queues `NextAction`. When `next()` fires, `LeafExitBehavior.onNext()` returns `PopBlockAction`. Leaf blocks pop correctly.

### Why parent blocks (AMRAP, EMOM) get stuck

`CompletedBlockPopBehavior` — [CompletedBlockPopBehavior.ts#L33-L36](../../../../src/runtime/behaviors/CompletedBlockPopBehavior.ts) — only exists on blocks where `ChildrenStrategy` adds it ([ChildrenStrategy.ts#L87](../../../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts)). It is only added when the builder `hasBehavior(TimerEndingBehavior)`.

The expected chain is:
1. `TimerEndingBehavior` tick handler → `ClearChildrenAction`
2. `ClearChildrenAction.do()` pops children → returns `NextAction`
3. `NextAction.do()` calls `currentBlock.next()` → behaviors' `onNext()`
4. `CompletedBlockPopBehavior.onNext()` checks `ctx.block.isComplete` → `PopBlockAction`

This chain **should work** if `CompletedBlockPopBehavior` is present. The bug is the interaction with Story 4's `shouldLoop`:

When `ClearChildrenAction` clears all children and queues `NextAction`, the block's `next()` fires. `ChildSelectionBehavior.onNext()` runs and:
- It checks `ctx.block.isComplete` at [line 119](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts) — **this should short-circuit**
- But if `shouldLoop()` bug (Story 4, `<=` instead of `<`) returns `true` AND the `isComplete` check has a timing issue, `ChildSelectionBehavior` dispatches a NEW child
- The newly dispatched child never completes (timer already expired), creating a stuck state

### Strategy ordering verification

Strategy execution order in [JitCompiler.ts](../../../../src/runtime/JitCompiler.ts): Component strategies (e.g., `AmrapLogicStrategy`) run first and call `builder.asTimer()` which adds `TimerEndingBehavior`. Then `ChildrenStrategy` runs and checks `hasBehavior(TimerEndingBehavior)` — this should find it and add `CompletedBlockPopBehavior`.

### Event-to-action chain

The tick handler returns actions from an event callback:
1. `EventBus.dispatch()` collects actions — [EventBus.ts#L160-L166](../../../../src/runtime/events/EventBus.ts)
2. `ScriptRuntime.handle()` calls `this.doAll(actions)` — [ScriptRuntime.ts#L160](../../../../src/runtime/ScriptRuntime.ts)
3. `doAll()` processes `ClearChildrenAction` → its `do()` returns `NextAction` → processed inline

## Goal

When a countdown timer expires on ANY block type (leaf or parent), the block must pop from the stack:
1. Timer expires → block marked complete → children cleared
2. After children clear → `next()` on parent → parent pops because it's marked complete
3. No new children should be dispatched after the block is marked complete

## Expected Fix

### Fix 1: Verify `ChildSelectionBehavior` respects `isComplete`

**File:** [ChildSelectionBehavior.ts#L117-L120](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts)

The `onNext()` method already checks `if (ctx.block.isComplete)` at line 119 and returns early without dispatching children. Verify this guard fires correctly when `markComplete` is called during a tick handler.

### Fix 2: Ensure `CompletedBlockPopBehavior` is always added to container blocks

**File:** [ChildrenStrategy.ts#L82-L87](../../../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts)

Verify that `builder.hasBehavior(TimerEndingBehavior)` returns `true` at the time `ChildrenStrategy` runs. If strategy ordering is the issue, consider always adding `CompletedBlockPopBehavior` to container blocks (it's a no-op when `isComplete` is false).

### Fix 3: Fix interaction with Story 4 (`shouldLoop` bug)

The `shouldLoop` returning `true` on the last round can cause `ChildSelectionBehavior` to dispatch a new child even after `markComplete`. Fix the `shouldLoop` condition (Story 4) and verify the `isComplete` guard short-circuits before `shouldLoop` is ever called.

### Fix 4: Add debug logging (temporary)

Temporarily add logging to `TimerEndingBehavior` tick handler, `ClearChildrenAction.do()`, and `CompletedBlockPopBehavior.onNext()` to trace the exact point where the chain breaks.

## Verification

- `bun run test` — no new failures
- In Storybook, start a countdown timer (e.g., "0:10 Run") and let it reach zero
- The block should automatically pop and the next block (or session end) should appear
- For AMRAP: timer expires → all children clear → AMRAP block pops → session advances
