# wod.wiki Runtime System: Event Handlers and Actions

This document identifies the behaviors of all handlers in the WOD Wiki runtime system, organized by their respective directories.

## Inputs Directory (`src/core/runtime/inputs`)

The inputs directory contains event classes and their corresponding handlers that process user interactions and system events.

### Display Events

- **DisplayEvent**: Represents a request to update the UI display with a duration span.
  - Contains target display and span duration information.
  - Timestamp is automatically set on creation.

- **DisplayHandler**: Transforms DisplayEvents into UI update actions.
  - Matches events with name 'display'.
  - Converts DisplayEvents into SetDurationAction to update UI clock displays.

### Navigation Events

- **NextStatementEvent**: Signals to move to the next workout statement.
  - Optional blockId parameter for targeting specific blocks.
  - Used for advancing workout progression.

- **NextStatementHandler**: Processes next statement requests.
  - Matches events with name 'next'.
  - Creates GoToNextAction to advance the workout state.

### Timer Control Events

- **StartEvent**: Triggers the timer to start running.
  - Simple event with timestamp and name 'start'.

- **StartHandler**: Processes start events.
  - Triggers StartTimerAction to begin timing.
  - Updates clock display with current state.
  - Sets appropriate UI buttons (end, pause).

- **StopEvent**: Triggers the timer to stop.
  - Contains timestamp and name 'stop'.

- **StopHandler**: Processes stop events.
  - Creates appropriate actions to halt the timer.
  - Updates UI elements to reflect stopped state.

- **ResetEvent**: Resets the timer and workout state.
  - Simple event for resetting to initial state.

- **ResetHandler**: Processes reset requests.
  - Creates ResetAction to return to initial state.
  - Updates UI elements accordingly.

- **TickEvent**: Generated at regular intervals during timing.
  - Used for time-based updates and checks.

- **TickHandler**: Processes tick events.
  - Checks remaining duration on current block.
  - If duration reaches zero, creates CompleteEvent.
  - Key part of the automatic progression system.

### Workout Flow Events

- **CompleteEvent**: Signals completion of a workout segment.
  - Generated when a timed segment finishes.

- **CompleteHandler**: Processes completion events.
  - Creates actions to handle completed segments.
  - May trigger progression to next segment.

- **EndEvent**: Signals the workout has reached its end.
  - Marks the formal end of a workout session.

- **EndHandler**: Processes end events.
  - Updates UI to show workout completion.
  - May trigger result display or summary.

- **LapEvent**: Marks the beginning or completion of a lap.
  - Used for tracking rounds in repeating workouts.

- **LapHandler**: Processes lap transitions.
  - Updates round counters and lap tracking.
  - Part of the round-tracking system.

### Auxiliary Events

- **RunEvent**: Used to run/execute the current statement.
  - Initiates execution of the current workout state.

- **RunHandler**: Processes run events.
  - Creates actions to execute the current workout statement.

- **SaveEvent**: Triggers saving workout results or state.
  - Used for persisting workout data.

- **SaveHandler**: Processes save requests.
  - Creates actions to persist workout data.

- **SoundEvent**: Triggers audio feedback.
  - Contains sound information to play.

- **SoundHandler**: Processes sound events.
  - Creates PlaySoundAction to provide audio feedback.

## Actions Directory (`src/core/runtime/actions`)

The actions directory contains action classes that modify the runtime state and produce side effects.

### Timer Control Actions

- **StartTimerAction**: Begins timing for the current workout block.
  - Creates new lap entry with start timestamp.
  - Creates DisplayEvents for primary and total timers.
  - Updates UI to show running timer.

- **StopTimerAction**: Halts the current running timer.
  - Records stop timestamp in current lap.
  - Updates display to show stopped state.

- **CompleteTimerAction**: Marks the current timer as completed.
  - Records completion in runtime state.
  - May trigger progression to next segment.

- **ResetAction**: Resets the runtime to initial state.
  - Clears all state including laps, results.
  - Returns UI to ready state.

### Navigation Actions

- **GoToNextAction**: Advances to the next workout statement.
  - Calls runtime.next() to progress workout.

- **GoToStatementAction**: Jumps to a specific statement.
  - Allows for non-sequential progression.
  - Used in complex workout structures.

- **GotoEndAction**: Jumps to the end of the workout.
  - Used to finish a workout early.

- **IdleStatementAction**: Sets the runtime to idle state.
  - Used when no action is needed but state should update.

### Communication Actions

- **NotifyRuntimeAction**: Passes an event back to the runtime.
  - Creates a feedback loop for continuous processing.
  - Key mechanism for chaining events.

- **PlaySoundAction**: Produces audio feedback.
  - Used for timers, completions, etc.
  - Enhances user experience with audio cues.

## Interaction Model

The runtime system uses an event-driven architecture where:

1. **Events** (inputs directory) represent user interactions or system occurrences.
2. **Handlers** process these events and create appropriate actions.
3. **Actions** (actions directory) modify the runtime state and produce side effects.

This separation of concerns allows for a clean, maintainable architecture and makes the system extensible for new workout types and interactions.
