# Story 4: Fix Round Tracking — Stuck at Round 1

**Severity:** High  
**Dependencies:** None  
**Blocks:** Story 5, Story 2  

## Problem

The `ReEntryBehavior` never advances the round counter past 1. The user always sees "Round 1 of N" regardless of how many children have completed.

## Root Cause — Code References

There are three interacting bugs:

### Bug A: `allCompleted` is never `true` when ReEntryBehavior reads it

`ChildSelectionBehavior.onNext()` — [ChildSelectionBehavior.ts#L117-L153](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts): When the last child index exceeds `totalChildren`, the behavior immediately enters `shouldLoop()`. If looping is enabled, it resets `childIndex = 0` and calls `dispatchNext()` which sets `dispatchedOnLastNext = true` and increments `childIndex` to 1.

`allChildrenCompleted` getter — [ChildSelectionBehavior.ts#L174-L176](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts): Returns `this.allChildrenExecuted && !this.dispatchedOnLastNext`. Since `dispatchedOnLastNext` is `true` after dispatching the first child of the next cycle, `allChildrenCompleted` is ALWAYS `false`.

`writeChildrenStatus()` — [ChildSelectionBehavior.ts#L263-L271](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts): Writes `allCompleted: this.allChildrenCompleted` which is `false`.

`ReEntryBehavior.onNext()` — [ReEntryBehavior.ts#L53-L55](../../../../src/runtime/behaviors/ReEntryBehavior.ts): Gates advancement on `childStatus.allCompleted`. Since it's always `false`, round never advances.

### Bug B: `shouldLoop` uses `<=` instead of `<` for rounds-remaining

`shouldLoop()` — [ChildSelectionBehavior.ts#L228](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts): The condition `round.current <= round.total` returns `true` when `current === total` (the last round). This causes an **extra loop** — children are dispatched for round N+1 even though only N rounds were requested. The correct condition is `round.current < round.total`.

### Bug C: Behavior execution order

In `SessionRootBlock.buildBehaviors()` — [SessionRootBlock.ts#L106-L131](../../../../src/runtime/blocks/SessionRootBlock.ts):
- `ReEntryBehavior` is at index 2
- `ChildSelectionBehavior` is at index 4

During `onNext()`, `ReEntryBehavior` reads `children:status` BEFORE `ChildSelectionBehavior` writes it. So even if `allCompleted` were written correctly, `ReEntryBehavior` sees the STALE value from the previous cycle.

## Goal

Round advancement should work correctly:
- `children:status.allCompleted` should be `true` at the moment all N children have been executed for the current round and before looping begins
- `ReEntryBehavior` should read the CURRENT status (not stale)
- Looping should stop after exactly the configured number of rounds

## Expected Fix

### Fix 1: Write `allCompleted = true` BEFORE looping

**File:** [ChildSelectionBehavior.ts#L129-L148](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts)

When `childIndex >= totalChildren` and `shouldLoop()` returns `true`, write `children:status` with `allCompleted: true` BEFORE resetting `childIndex` and dispatching the next child. This signals to `ReEntryBehavior` that a complete cycle occurred.

### Fix 2: Fix `shouldLoop` condition

**File:** [ChildSelectionBehavior.ts#L228](../../../../src/runtime/behaviors/ChildSelectionBehavior.ts)

Change `round.current <= round.total` to `round.current < round.total`.

### Fix 3: Reorder behaviors in `SessionRootBlock`

**File:** [SessionRootBlock.ts](../../../../src/runtime/blocks/SessionRootBlock.ts)

Move `ChildSelectionBehavior` BEFORE `ReEntryBehavior` in the behaviors array so that `children:status` is written before `ReEntryBehavior` reads it.

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

## Verification

- `bun run test` — no new failures
- In Storybook, round counter should advance from "Round 1" → "Round 2" → ... → "Round N" as children complete
- Block should complete (pop) after all N rounds finish, not after N+1
