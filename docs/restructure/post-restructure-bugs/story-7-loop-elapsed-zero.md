# Story 7: Loop Blocks Report elapsed=0, total=0

**Severity:** Medium  
**Dependencies:** Story 2 (benefits from unified timer-result ownership)  
**Blocked by:** Nothing  
**Discovered:** 2026-02-16 audit  

## Problem

Blocks compiled by `GenericLoopStrategy` (e.g., `"3 Rounds"`, `"21-15-9 Thrusters"`) have `ReportOutputBehavior` but **no** `TimerBehavior`. When `ReportOutputBehavior.computeTimerResults()` runs on unmount and finds no `'timer'` memory, it falls to the no-timer fallback which writes `ElapsedFragment(0)` and `TotalFragment(0)`.

A 3-round loop that runs for 5 minutes will report elapsed=0, total=0.

## Root Cause — Code References

1. **`GenericLoopStrategy` adds no timer** — [GenericLoopStrategy.ts](../../../../src/runtime/compiler/strategies/components/GenericLoopStrategy.ts):
   ```typescript
   builder.addBehavior(new ReportOutputBehavior({ label }));
   builder.addBehavior(new HistoryRecordBehavior());
   // NO .asTimer() call — no TimerBehavior
   ```

2. **`ReportOutputBehavior.computeTimerResults()` no-timer fallback** — [ReportOutputBehavior.ts](../../../../src/runtime/behaviors/ReportOutputBehavior.ts):
   ```typescript
   // No timer → degenerate result
   const degenerateSpan = new TimeSpan(nowMs, nowMs);
   return [
       new ElapsedFragment(0, blockKey, now),      // always 0
       new TotalFragment(0, blockKey, now),          // always 0
       new SpansFragment([degenerateSpan], blockKey, now),
       new SystemTimeFragment(new Date(), blockKey),
   ];
   ```

3. **`GenericGroupStrategy` also missing** — [GenericGroupStrategy.ts](../../../../src/runtime/compiler/strategies/components/GenericGroupStrategy.ts): Group blocks don't add `ReportOutputBehavior` at all, so they never write `fragment:result`. This may be intentional (groups are containers), but means no elapsed/total/spans are recorded.

## Goal

Loop blocks should report wall-clock elapsed time even though they don't have a countdown timer. The elapsed value should reflect how long the loop actually ran from mount to unmount.

## Expected Fix

### Option A: Use `SystemTimeFragment` for wall-clock elapsed

When `ReportOutputBehavior.computeTimerResults()` detects no `'timer'` memory, compute wall-clock elapsed from `ctx.block.mountedAt` (or a similar timestamp) to `ctx.clock.now`:

```typescript
if (!timer) {
    const mountedAt = ctx.block.mountedAt; // needs to be exposed
    const elapsed = nowMs - mountedAt;
    return [
        new ElapsedFragment(elapsed, blockKey, now),
        new TotalFragment(elapsed, blockKey, now),
        new SpansFragment([new TimeSpan(mountedAt, nowMs)], blockKey, now),
        new SystemTimeFragment(new Date(), blockKey),
    ];
}
```

### Option B: Add a lightweight wall-clock timer to loop blocks

Have `GenericLoopStrategy` call `builder.asTimer()` with a count-up direction and no duration. This gives loop blocks a proper `TimerBehavior` that tracks spans without a countdown.

### Option C: Disable `computeTimerResults` for loop blocks

Pass `{ computeTimerResults: false }` to `ReportOutputBehavior` in `GenericLoopStrategy`. This avoids writing misleading elapsed=0 values, but means loop blocks have no elapsed tracking at all.

**Option A is recommended** — minimal change, provides accurate wall-clock elapsed without adding a full timer.

## Affected Block Types

- Rounds blocks (`GenericLoopStrategy`)
- Group blocks (`GenericGroupStrategy`) — no `ReportOutputBehavior` at all

## Verification

- `bun run test` — no new failures
- In Storybook, run a rounds block (e.g., `"3 Rounds\n  10 Push-ups\n  10 Squats"`) and let it complete
- `elapsed` should reflect total workout time, not 0
- `total` should match elapsed (no gaps/pauses in loop blocks)
