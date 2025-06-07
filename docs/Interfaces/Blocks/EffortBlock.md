# EffortBlock

**Description**: Represents a block of effort in a workout, typically a leaf-level executable segment.

**Original Location**: `src/core/runtime/blocks/EffortBlock.ts`

## Properties

*   Inherits all properties from `RuntimeBlock`
*   `leaf: boolean` - Always true for EffortBlock (set in constructor)
*   `handlers: EventHandler[]` - Includes CompleteHandler for handling completion events

## Methods

*   `constructor(compiledMetrics: RuntimeMetric[], sources?: JitStatement[])` - Creates a new EffortBlock with compiled metrics and optional legacy sources
*   `onEnter(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Sets up timer, buttons, and span display for effort execution
*   `onNext(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Pops the block when index >= 1
*   `onLeave(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - Stops timer and clears buttons when leaving
*   `onBlockStart(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No specific start actions (returns empty array)
*   `onBlockStop(runtime: ITimerRuntime): IRuntimeAction[]` (protected) - No specific stop actions (returns empty array)

## Behavior

*   Displays effort text with metric values (repetitions, resistance, distance) in parentheses
*   Shows a "Complete" button during execution
*   Starts and stops timer automatically on enter/leave
*   Updates span display to show current effort progress

## Relationships
*   **Extends**: `[[RuntimeBlock]]`