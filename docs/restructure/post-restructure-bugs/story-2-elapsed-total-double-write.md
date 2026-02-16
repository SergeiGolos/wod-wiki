# Story 2: Fix Elapsed/Total Double-Write Between TimerBehavior and ReportOutputBehavior

**Severity:** Medium  
**Dependencies:** Story 4 (behavior reordering)  
**Blocked by:** Story 4  

## Problem

Both `TimerBehavior` and `ReportOutputBehavior` independently compute elapsed/total time and write to `fragment:result` memory during `onUnmount`. Depending on behavior execution order, this produces:

- **Duplicate fragments**: If `ReportOutputBehavior` runs first (writes via `pushMemory`), then `TimerBehavior` runs second (appends via `appendResultFragments`), the result contains duplicate `ElapsedFragment` and `TotalFragment` entries.
- **Open spans captured**: If `ReportOutputBehavior` runs before `TimerBehavior`, it captures still-open spans (last span's `ended === undefined`) in `SpansFragment`. `TimerBehavior` later closes the span, but the `SpansFragment` in the completion output is stale.
- **Blocks without timers get zero**: `ReportOutputBehavior.computeTimerResults()` defaults to `ElapsedFragment(0)` and `TotalFragment(0)` when no `timer` memory exists. Blocks like `GenericLoopStrategy`-compiled blocks (no timer) emit elapsed=0 even though they ran for real time.

## Root Cause — Code References

1. **`TimerBehavior.onUnmount()`** — [TimerBehavior.ts#L110-L120](../../../../src/runtime/behaviors/TimerBehavior.ts): Closes spans, computes elapsed/total, calls `appendResultFragments()` which appends to existing `fragment:result` memory.

2. **`TimerBehavior.appendResultFragments()`** — [TimerBehavior.ts#L153-L164](../../../../src/runtime/behaviors/TimerBehavior.ts): Uses **append** semantics — reads existing fragments and adds new ones.

3. **`ReportOutputBehavior.onUnmount()`** — [ReportOutputBehavior.ts#L73-L90](../../../../src/runtime/behaviors/ReportOutputBehavior.ts): Independently calls `computeTimerResults()` and `writeResultMemory()`.

4. **`ReportOutputBehavior.writeResultMemory()`** — [ReportOutputBehavior.ts#L165-L173](../../../../src/runtime/behaviors/ReportOutputBehavior.ts): Uses **replace** semantics via `updateMemory` if existing, or `pushMemory` if new.

5. **Behavior ordering in `SessionRootBlock`** — [SessionRootBlock.ts#L96-L101](../../../../src/runtime/blocks/SessionRootBlock.ts): `ReportOutputBehavior` is added BEFORE `TimerBehavior`, so Report runs first during unmount and sees unclosed spans, then Timer appends duplicates.

## Goal

Only ONE behavior should own the `fragment:result` write. The `TimerBehavior` should own span lifecycle (opening/closing), and `ReportOutputBehavior` should own computing and writing the final elapsed/total/spans to `fragment:result`. The timer must close its spans BEFORE Report reads them.

## Expected Fix

1. **Remove `appendResultFragments()` from `TimerBehavior.onUnmount()`** — [TimerBehavior.ts#L117-L120](../../../../src/runtime/behaviors/TimerBehavior.ts): `TimerBehavior` should ONLY close spans and update `'timer'` memory. It should NOT write to `fragment:result`. Delete the `appendResultFragments` call and method.

2. **Ensure `TimerBehavior` runs before `ReportOutputBehavior` in unmount** — Reorder behaviors in [SessionRootBlock.ts](../../../../src/runtime/blocks/SessionRootBlock.ts) so `TimerBehavior` is added before `ReportOutputBehavior`. This ensures spans are closed before Report computes elapsed from them.

3. **In `ReportOutputBehavior.computeTimerResults()`**: No changes needed — it already correctly reads `timer` memory, computes elapsed from spans, and writes `fragment:result`. It just needs to see closed spans.

## Verification

- `bun run test` — no new failures
- After fix, `fragment:result` should contain exactly ONE `ElapsedFragment` and ONE `TotalFragment` per block
- All `SpansFragment` entries should have closed spans (no `ended === undefined`)
