# TimedGroupBlock

**Description**: Represents a group of workout segments that are collectively timed.

**Original Location**: `src/core/runtime/blocks/TimedGroupBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `childIndex: number` - Current index within child statements (private, starts at 0)
*   `timerId?: string` - Unique identifier for the timer if this block starts one (private)
*   `duration?: number` - Duration extracted from source statements during construction

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], source?: JitStatement[])` - Creates a new TimedGroupBlock and extracts duration from source
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, duration, and buttons if duration exists, then calls next
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages progression through child statements with optional timer inheritance
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer if one was started
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer and buttons if not already done during enter
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

## Behavior

*   Represents a group of workout segments that are collectively timed
*   Extracts duration from first source statement during construction
*   Generates unique timer IDs for tracking multiple timers
*   Uses PushStatementWithTimerAction when duration exists to inherit timing to children
*   Uses PushStatementAction when no duration for normal execution
*   Sets up duration reporting and appropriate buttons (end, pause, complete) when timed
*   Handles end events to allow early termination
*   Automatically progresses through child statements using consecutive grouping
*   Stops timer when leaving the block or when execution completes

## Relationships
*   **Extends**: `[[RuntimeBlock]]`