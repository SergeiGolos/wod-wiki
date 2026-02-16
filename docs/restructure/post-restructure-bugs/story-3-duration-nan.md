# Story 3: Fix Duration Column Showing "NaN:NaN" (Displays as "NA:")

**Severity:** Low  
**Dependencies:** None  
**Blocked by:** Nothing  

## Problem

The "Duration" fixed column in the review grid shows "NA:" (which is actually `"NaN:NaN"` rendered from `formatDuration(NaN)`). The duration value comes from runtime elapsed time, not from the parser's planned duration. When the elapsed value is `NaN` (due to invalid or missing span data), it propagates all the way to the display.

## Root Cause — Code References

1. **`formatDuration()` has no NaN guard** — [GridRow.tsx#L179-L192](../../../../src/components/review-grid/GridRow.tsx) (or [useGridData.ts#L460-L473](../../../../src/components/review-grid/useGridData.ts)): The function checks `if (ms <= 0) return '0:00'`, but `NaN <= 0` evaluates to `false`, so `NaN` falls through and produces `"NaN:NaN"`.

2. **`row.duration` uses nullish coalescing that doesn't catch NaN** — [useGridData.ts#L199](../../../../src/components/review-grid/useGridData.ts): `const duration = (seg.duration ?? 0) * 1000`. The `??` operator only catches `null`/`undefined`, NOT `NaN`. So `NaN * 1000 = NaN`.

3. **`seg.duration` comes from runtime elapsed** — [AnalyticsTransformer.ts#L75](../../../../src/services/AnalyticsTransformer.ts): `const duration = output.elapsed / 1000`. If `output.elapsed` is `NaN` (e.g., from invalid `TimeSpan.started`), it propagates.

4. **`output.elapsed` can be NaN** — [OutputStatement.ts#L259-L262](../../../../src/core/models/OutputStatement.ts): When `this.spans.length === 0`, falls back to `this.timeSpan.duration`, which returns `NaN` if `started` is invalid.

5. **`DurationFragment` is never instantiated in production** — [DurationFragment.ts](../../../../src/runtime/compiler/fragments/DurationFragment.ts): The class exists but is only used in one test file. The parser creates `TimerFragment` (fragmentType=`Timer`, type=`"duration"`) instead. Neither feeds the fixed Duration column.

## Goal

The Duration column should show the **planned duration** from the code fragment (the value the user wrote, e.g., "5:00"). When no planned duration exists, it should show the elapsed time. When the value is `NaN` or invalid, it should show a graceful fallback like `"—"`.

## Expected Fix

1. **Add NaN guard to `formatDuration()`** — [GridRow.tsx](../../../../src/components/review-grid/GridRow.tsx) and/or [useGridData.ts](../../../../src/components/review-grid/useGridData.ts): Change guard from `if (ms <= 0)` to `if (!Number.isFinite(ms) || ms <= 0) return '—'`.

2. **Fix nullish coalescing for NaN** — [useGridData.ts#L199](../../../../src/components/review-grid/useGridData.ts): Change `(seg.duration ?? 0)` to `(Number.isFinite(seg.duration) ? seg.duration : 0)`.

3. **Prefer planned duration from parser fragments** — In [useGridData.ts](../../../../src/components/review-grid/useGridData.ts), when building `row.duration`, check if a `TimerFragment` with type `"duration"` exists in the segment's fragments and use its `value` (planned duration in ms). Fall back to `seg.duration` (runtime elapsed) only if no planned duration is available.

## Verification

- `bun run test` — no new failures
- In Storybook, the Duration column should show formatted durations (e.g., "5:00") instead of "NA:"
- Blocks without a timer should show "—" instead of "NaN:NaN"
