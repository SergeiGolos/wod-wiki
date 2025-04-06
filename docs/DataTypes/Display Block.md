# Display Block Data Structures

This document defines the primary data structures used by the runtime system to communicate display-related state information for the wod.wiki application. These types are defined in `src/core/timer.types.ts`.

## Overview

The runtime system uses these data structures, primarily via actions like `DisplayUpdateAction`, to convey the necessary information for UI components to render the timer and related workout state.

## `TimerDisplayBag` Interface

The `TimerDisplayBag` is a general-purpose structure for basic timer display updates.

```typescript
export interface TimerDisplayBag {
    elapsed: number;            // Time elapsed in milliseconds
    remaining?: number;         // Time remaining in milliseconds (optional)
    label?: string;             // Description of current state/exercise (optional)
    bag: { [key: string]: IClock } // Generic property bag for additional, unstructured data
}
```

- **`elapsed`**: The primary value representing the time that has passed, usually for the current segment or the total workout, measured in milliseconds.
- **`remaining`**: An optional value indicating the time left, typically used in timed segments or workouts (e.g., FOR TIME caps, AMRAP durations), measured in milliseconds.
- **`label`**: An optional string providing context for the current timer state (e.g., "Work", "Rest", "Round 1/5", current exercise name).
- **`bag`**: A flexible key-value store allowing the runtime to pass additional, context-specific information to the display without needing to modify the core interface structure frequently.

## `ElapsedState` Interface

The `ElapsedState` interface provides a more structured representation of a specific timed segment's state, often used internally by runtime blocks or handlers dealing with intervals or distinct phases.

```typescript
export interface ElapsedState {
    elapsed: number;        // Current elapsed time in milliseconds *within this specific state/segment*
    duration: number;       // Total planned duration in milliseconds of this state/segment
    remaining?: number;      // Calculated remaining time in milliseconds for this state/segment (optional)
    spans?: ResultSpan[];    // Array of time spans recorded within this state (optional, see Result Block.md)
    state: string;          // Descriptive name for this state (e.g., "Work", "Rest", "Warmup", "Cooldown")
}
```

- **`elapsed`**: How much time has passed *within* this specific state (e.g., time elapsed in the current work interval).
- **`duration`**: The total intended length of this state (e.g., the total duration of the work interval).
- **`remaining`**: The calculated time left within this state (`duration - elapsed`).
- **`spans`**: An optional array of `ResultSpan` objects, potentially used to record specific timings or laps that occurred during this state.
- **`state`**: A string identifier classifying the nature of this timed segment.