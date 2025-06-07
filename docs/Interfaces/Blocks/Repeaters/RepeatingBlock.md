# RepeatingBlock

**Description**: Represents a block of workout segments that repeats a specified number of times.

**Original Location**: `src/core/runtime/blocks/RepeatingBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `childIndex: number` - Current index within child statements (private, starts at 0)
*   `roundIndex: number` - Current round/repetition index (private, starts at 0)
*   `lastLap: string` - Last lap indicator value (private)
*   `handlers: EventHandler[]` - Includes CompleteHandler and LapHandler for user interactions

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], source?: JitStatement[])` - Creates a new RepeatingBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up system buttons (end, pause) and runtime buttons (complete), then calls next
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Manages repetition logic, advancing through child statements and rounds
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer when leaving the block
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up block-level timer state if duration is specified
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No stop actions (returns empty array)

## Behavior

*   Manages repetition of child workout segments for a specified number of rounds
*   Tracks current position within child statements and current round
*   Supports timer inheritance - if the repeating block has a duration, it passes that to child statements
*   Uses PushStatementWithTimerAction for timer inheritance, PushStatementAction otherwise
*   Handles user completion and lap events through specialized handlers
*   Automatically advances through child statements and rounds based on lap indicators
*   Pops itself when all rounds are completed or end event is detected

## Relationships
*   **Extends**: `[[RuntimeBlock]]`