# Story 6: EMOM Interval Reset Erases Span History

**Severity:** High  
**Dependencies:** None  
**Blocked by:** Nothing  
**Discovered:** 2026-02-16 audit  

## Problem

When an EMOM (or any interval-based) block resets its timer at the end of each interval, `TimerEndingBehavior.resetIntervalState()` **replaces all accumulated spans** with a single new span. On final unmount, `ReportOutputBehavior.computeTimerResults()` sees only the **last interval's** span, so elapsed/total/spans are dramatically wrong.

For a 10-round EMOM with 60-second intervals:
- **Expected:** elapsed ≈ 600s, spans = 10 entries
- **Actual:** elapsed ≈ 60s, spans = 1 entry (only the last interval)

## Root Cause — Code References

1. **`TimerEndingBehavior.resetIntervalState()`** — [TimerEndingBehavior.ts](../../../../src/runtime/behaviors/TimerEndingBehavior.ts): Replaces the entire `spans` array with a single new span:
   ```typescript
   private resetIntervalState(ctx: IBehaviorContext, timer: TimerState): void {
       const now = ctx.clock.now.getTime();
       ctx.setMemory('timer', {
           ...timer,
           spans: [new TimeSpan(now)]  // ALL previous spans ERASED
       });
   }
   ```

2. **`ReportOutputBehavior.computeTimerResults()`** — [ReportOutputBehavior.ts](../../../../src/runtime/behaviors/ReportOutputBehavior.ts): Computes elapsed from `timer.spans`. With only 1 span remaining, elapsed = last interval duration.

3. **`calculateElapsed()`** — [calculateElapsed.ts](../../../../src/runtime/time/calculateElapsed.ts): Iterates `timer.spans` and sums durations. With erased history, the sum covers only the final interval.

## Goal

EMOM/interval blocks should preserve their full span history across interval resets so that the final elapsed/total/spans values reflect the entire workout duration.

## Expected Fix

### Option A: Accumulate spans instead of replacing

In `resetIntervalState()`, **append** the new span to the existing spans array instead of replacing:

```typescript
private resetIntervalState(ctx: IBehaviorContext, timer: TimerState): void {
    const now = ctx.clock.now.getTime();
    // Close the current span
    const closedSpans = this.closeCurrentSpan(timer.spans, now);
    ctx.setMemory('timer', {
        ...timer,
        spans: [...closedSpans, new TimeSpan(now)]  // APPEND new span
    });
}
```

### Option B: Track cumulative elapsed separately

Add a `cumulativeElapsed` field to `TimerState` that accumulates elapsed time across interval resets. `computeTimerResults()` would read this instead of computing from spans alone.

**Option A is recommended** — it preserves the span-based architecture and gives full visibility into per-interval timing.

## Affected Block Types

- EMOM blocks (`IntervalLogicStrategy`)
- Any future block type using `TimerEndingBehavior` in `'reset-interval'` mode

## Verification

- `bun run test` — no new failures
- In Storybook, run an EMOM block (e.g., `"EMOM 3\n  10 Push-ups"`) and let it complete
- `elapsed` should reflect total workout time, not just the last interval
- `spans` should contain one entry per interval
