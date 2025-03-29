# Runtime Block

Represents the _execution state_ of a section of the Statement Tree. It contains:

- A unique ID (`blockId`).
- An index tracking position in execution flow (`blockIndex`).
- A stack representing the hierarchy of statements.
- Round information tracking current and total rounds.
- Metrics for performance tracking.
- Event history.
- An event handler to process runtime events.

## Overview

The RuntimeBlock is a core data structure in the wod.wiki execution engine that represents a discrete executable unit within a workout script.

It maintains both **state and behavior** for a specific section of the workout.

## Interface Definition

```typescript
export interface RuntimeBlock {    
    blockId: number;       // Unique identifier for the block
    blockIndex: number;    // Position in execution flow
    stack: StatementNode[];    // Hierarchy of statements
    label: string;         // Display label for the block
    round: [number, number]; // [current round, total rounds]
    metrics: RuntimeMetric[]; // Performance metrics
    events: TimerEvent[];     // Event history
    onEvent(event: RuntimeEvent): IRuntimeAction[]; // Event handler
}
```

## Components

### State Properties

- **blockId**: Unique identifier for referencing the block
- **blockIndex**: Tracks the position in execution flow
- **stack**: Represents the hierarchy of statements being executed
- **label**: Human-readable description of the block
- **round**: Array containing [currentRound, totalRounds] information
- **metrics**: Collection of performance metrics for this block
- **events**: History of timer events that have occurred in this block

### Behavior

- **onEvent(event: RuntimeEvent)**: Processes runtime events and returns actions
  - Takes a `RuntimeEvent` (start, stop, lap, etc.)
  - Returns an array of `IRuntimeAction` objects to update the UI

## Integration with Action System

The RuntimeBlock follows the action-based architecture of the wod.wiki runtime system:

1. It receives events through the `onEvent()` method
2. Processes them based on its current state
3. Returns IRuntimeAction[] objects that define UI updates

## Event Processing Flow

```ascii
┌──────────────┐      ┌───────────────┐       ┌────────────────┐
│ RuntimeEvent │─────▶│ RuntimeBlock  │──────▶│ IRuntimeAction │
└──────────────┘      │ .onEvent()    │       │     Array      │
                      └───────────────┘       └────────────────┘
```

## Usage Examples

RuntimeBlocks are typically:

- Created by compiler strategies during script interpretation
- Managed by the TimerRuntime component
- Executed in sequence as the workout progresses
- Generated dynamically for repeating structures

The RuntimeBlock represents the bridge between the static workout definition and the dynamic execution model of the wod.wiki platform.
