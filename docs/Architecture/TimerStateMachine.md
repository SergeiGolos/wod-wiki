# Timer State Machine

## Overview

The wod.wiki timer state machine is responsible for executing workout scripts and communicating state changes and events to the user interface. This document outlines the state machine's architecture, state transitions, and how it interacts with the results display component.

## Core Components

### Timer Runtime

The `TimerRuntime` class is the central component that manages workout execution. It consists of:

1. **State Management**: Tracks the current state of workout execution
2. **Event Processing**: Handles events like tick, start, pause, resume, and stop
3. **Action Generation**: Produces actions that update UI components

### State Machine Architecture

```
┌─────────────────┐       ┌────────────────┐       ┌──────────────┐
│                 │       │                │       │              │
│     IDLE        ├──────►│    RUNNING     ├──────►│   COMPLETED  │
│                 │       │                │       │              │
└────────┬────────┘       └────────┬───────┘       └──────────────┘
         │                         │
         │                         │
         │                         ▼
         │                ┌────────────────┐
         └───────────────┤     PAUSED     │
                         │                │
                         └────────────────┘
```

#### States

1. **IDLE**: Initial state, waiting for a start event
2. **RUNNING**: Executing workout instructions, processing tick events
3. **PAUSED**: Temporarily halted execution, waiting for resume
4. **COMPLETED**: Workout execution finished

#### Events

1. **start**: Transitions from IDLE to RUNNING
2. **pause**: Transitions from RUNNING to PAUSED
3. **resume**: Transitions from PAUSED to RUNNING
4. **stop**: Transitions from any state to IDLE
5. **tick**: State update within RUNNING (occurs every 100ms)
6. **complete**: Transitions from RUNNING to COMPLETED

## Action Flow

The timer runtime processes events and generates actions through the following flow:

1. Events are added to the event stack (e.g., start, tick)
2. The runtime processes events using compiler strategies
3. Compiler strategies generate actions based on the event and current state
4. Actions update the UI components (display, buttons, results)

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐     ┌─────────────┐
│          │     │              │     │                │     │             │
│  Events  ├────►│  TimerRuntime├────►│ CompilerStrategy ├────►│  Actions   │
│          │     │              │     │                │     │             │
└──────────┘     └──────────────┘     └────────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
                     ┌────────────┐     ┌────────────┐     ┌─────────────┐
                     │            │     │            │     │             │
                     │   Display  │◄────┤   Buttons  │◄────┤   Results   │
                     │            │     │            │     │             │
                     └────────────┘     └────────────┘     └─────────────┘
```

## Compiler Strategies

The runtime uses a composite pattern with multiple compiler strategies to handle different workout structures:

1. **CompoundStrategy**: Orchestrates multiple strategies
2. **RepeatingGroupStrategy**: Handles round patterns like (21-15-9)
3. **AMRAPStrategy**: Handles "As Many Rounds As Possible" workouts
4. **RepeatingStatementStrategy**: Handles repeated statement blocks
5. **StatementStrategy**: Processes individual workout statements
6. **SingleUnitStrategy**: Handles single exercise units

Each strategy:
- Implements the `ICompilerStrategy` interface
- Processes specific workout structures
- Returns `IRuntimeAction[]` arrays instead of direct UI updates

## Runtime Actions

Actions are the communication mechanism between the runtime and UI components:

1. **SetDisplayAction**: Updates the timer display (time, current exercise)
2. **SetButtonAction**: Updates available control buttons based on state
3. **SetResultAction**: Records workout progress in the results table

Actions follow the Command pattern, with each action having an `apply()` method that updates the appropriate UI state.

## Results Display Integration

The results display receives event data from the runtime through the action system:

1. Runtime generates `SetResultAction` objects with workout metrics
2. Actions are applied to update the results state 
3. Results component renders the updated data in tabular format

### Results Data Structure

Results are organized by:
- **Block ID**: Identifies the workout section
- **Round**: Tracks repetition within a block
- **Timestamp**: Records when the event occurred
- **Metrics**: Specific measurements (time, reps, weight)

## Event Flow Example

For a simple "3 rounds for time" workout:

1. User clicks "Run"
2. `start` event added to stack
3. Runtime transitions to RUNNING state
4. Timer starts incrementing through tick events
5. Each completed exercise generates a SetResultAction
6. Results table updates with completion data
7. When all rounds complete, runtime transitions to COMPLETED
8. Final results and statistics displayed

## Debugging Timer Issues

If the timer is not working:

1. Verify compiler strategies are properly registered in CompoundStrategy
2. Check event handling in useTimerRuntime hook
3. Confirm actions are correctly applying UI updates
4. Examine runtime initialization with valid workout script
5. Verify no errors in the browser console

## Performance Considerations

- Tick interval set to 100ms for balance of responsiveness and performance
- Use of React's useState and useRef for efficient state management
- Separation of concerns between runtime state and UI updates
