# TimerBlock

**Description**: Represents a block that primarily manages a timer within a workout segment.

**Original Location**: `src/core/runtime/blocks/TimerBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `leaf: boolean` - Always true for TimerBlock (set in constructor)
*   `handlers: EventHandler[]` - Includes CompleteHandler for handling completion events

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], sources?: JitStatement[])` - Creates a new TimerBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, system buttons (end, pause), runtime buttons (complete), and duration reporting
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when completed
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops the timer when leaving
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No additional start setup (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No additional stop cleanup (returns empty array)

## Behavior

*   Designed for standalone timer statements (duration only, no metrics)
*   Handles scenarios like "30s", "2m", "1m30s"
*   Automatically starts timer on entry and stops on exit
*   Provides system controls (end, pause) and user completion button
*   Reports duration for countdown display if duration is specified

## Relationships
*   **Extends**: `[[RuntimeBlock]]`