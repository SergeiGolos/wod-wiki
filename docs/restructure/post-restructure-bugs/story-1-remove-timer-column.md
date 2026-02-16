# Story 1: Remove Redundant "Timer" Column — Use "Spans" Instead

**Severity:** Low  
**Dependencies:** None  
**Blocked by:** Nothing  

## Problem

The review grid displays two columns that represent the same underlying data:

- **"Spans" (fixed column)** — correctly bound to `row.relativeSpans`, sourced from `SpansFragment.spans` via `AnalyticsTransformer`
- **"Timer" (fragment column)** — bound to `FragmentType.Timer` cell, which at runtime contains the full `TimerState` object (including the same `spans[]` array) stuffed into a code fragment by `TimerBehavior`

The parser creates `TimerFragment` (type `"duration"`, fragmentType `FragmentType.Timer`) to represent a *planned duration* (e.g., `"5:00"` = 300000ms). But at runtime, `TimerBehavior.createTimerFragment()` overwrites this fragment type to carry the full `TimerState` object (spans, direction, durationMs). This means the "Timer" column in the grid shows a rendered `TimerState` object instead of anything meaningful, and it duplicates the data already shown by the "Spans" column.

## Root Cause — Code References

1. **`TimerBehavior.createTimerFragment()`** — [TimerBehavior.ts#L149-L157](../../../../src/runtime/behaviors/TimerBehavior.ts): Creates a runtime fragment with `fragmentType: FragmentType.Timer` whose `value` is the full `TimerState` (spans, direction, durationMs). This is NOT the same shape as the parser's `TimerFragment` class.

2. **`ReportOutputBehavior.collectStateFragments()`** — [ReportOutputBehavior.ts#L105-L108](../../../../src/runtime/behaviors/ReportOutputBehavior.ts): Reads `'timer'` memory tag and includes the `FragmentType.Timer` fragment (carrying `TimerState`) in output state fragments. This means every `'completion'` output includes both a `FragmentType.Timer` fragment AND a `SpansFragment` — same spans data in two fragments.

3. **Grid column definition** — [gridPresets.ts#L20](../../../../src/components/review-grid/gridPresets.ts): `FragmentType.Timer` is listed in `ALL_FRAGMENT_COLUMNS` and `DEFAULT_VISIBLE_COLUMNS`, so it renders as a fragment column.

4. **Fixed "Spans" column** — [GridRow.tsx#L135-L138](../../../../src/components/review-grid/GridRow.tsx): Correctly reads `row.relativeSpans` from `AnalyticsTransformer`.

## Goal

Eliminate the redundant "Timer" fragment column from the grid. Anything that needs timer/span data should read from the "Spans" fixed column (backed by `SpansFragment`). The parser-origin `TimerFragment` (planned duration) should feed into the "Duration" fixed column instead.

## Expected Fix

| File | Change |
|------|--------|
| [gridPresets.ts](../../../../src/components/review-grid/gridPresets.ts) | Remove `FragmentType.Timer` from `ALL_FRAGMENT_COLUMNS` (line ~20) and `DEFAULT_VISIBLE_COLUMNS` (line ~39) |
| [gridPresets.ts](../../../../src/components/review-grid/gridPresets.ts) | Remove `FragmentType.Timer` case from `isNumericFragmentType()` (line ~219) |
| [useGraphData.ts](../../../../src/components/review-grid/useGraphData.ts) | Remove `FragmentType.Timer` from `FRAGMENT_GRAPH_COLORS` (line ~182) and `getUnitForColumn()` (line ~202) |
| [ReportOutputBehavior.ts](../../../../src/runtime/behaviors/ReportOutputBehavior.ts) | In `collectStateFragments()`, stop including `'timer'` memory tag fragments in state output. Timer memory should only be read by `computeTimerResults()` to produce `SpansFragment`/`ElapsedFragment`/`TotalFragment` |

## Verification

- `bun run test` — no new failures
- `bun x tsc --noEmit` — no new type errors
- In Storybook, the review grid should show the "Spans" column with correct time spans and the "Timer" fragment column should no longer appear
