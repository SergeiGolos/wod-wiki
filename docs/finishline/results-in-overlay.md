# Results in Overlay - Implementation Strategy

## Overview
As per the refined results rendering strategy, line-specific result information should be integrated into the WOD overlay (WodCompanion). This provides context-aware feedback while the user is editing or hovering over specific lines in a WOD block.

## Goals
- Display metrics and performance data for the current line (under cursor or hover).
- Show how the specific line contributed to overall results (e.g., split times, rep counts).
- Provide a historical view of that specific line across multiple completions.

## Implementation Details

### Component: `WodCompanion`
The `WodCompanion` currently shows:
- [x] Global latest result (to be replaced by line-specific context).
- [x] Metric chips for the current statement.
- [x] Line-specific history/results via `LineExecutionSummaryCard`.

### Data Requirements
- The `WorkoutResult` objects stored in `wodResultsField` need to be accessible.
- Line-level mapping uses `sourceStatementId` on `IOutputStatement` logs (equals the 1-based content line number).
- *Note:* Only `segment`-type output statements are counted (excludes system/event/milestone noise).

### UI Plan
1. **Line Performance Indicator:** When a line has been executed in previous runs, show a small sparkline or summary next to the metric chips.
2. **Statement History:** Below the metric chips, show a list of performance for *this specific statement* from previous workouts.
   - Example: "Last 3: 0:45, 0:48, 0:42"
3. **Drill-down:** Clicking a line-specific result should open the review overlay filtered or focused on that specific segment.

## Next Steps
- [x] Verify that the runtime logs include enough metadata to identify line-level performance.
- [x] Create `useWodLineResults` hook to extract line-specific data from `WorkoutResult.data.logs`.
- [x] Implement the `LineExecutionSummaryCard` UI component in `WodCompanion.tsx`.
- [ ] Implement the sparkline / visual history indicator.
- [ ] Drill-down: clicking a line-specific result opens the review overlay filtered on that segment.
