# Display Block Interface

This document defines the interface between the runtime and the clock display for CrossFit-style competitions in the wod.wiki application.

## Overview

The Display Block is responsible for presenting visual information about the current workout state to the user. It receives updates from the runtime system via the `SetDisplayAction` and visualizes the workout's progress, timing, and current state.

## Display Block Data Structures

This document defines the primary data structures used to manage and display the state of the timer and workout progression in the wod.wiki application.

## Overview

The Display Block component is responsible for presenting visual information about the current workout state to the user. It receives updates based on runtime events and visualizes the workout's progress, timing, and current state using specific data structures.

## `TimerDisplayBag` Interface

The core data structure used for basic timer display updates is the `TimerDisplayBag`:

```typescript
export interface TimerDisplayBag {
    elapsed: number;            // Time elapsed in milliseconds
    remaining?: number;         // Time remaining in milliseconds (optional)
    label?: string;             // Description of current state/exercise (optional)
    bag: { [key: string]: any } // Generic property bag for additional data
}
```

This interface provides the fundamental timing information (`elapsed`, `remaining`) and a contextual `label`. The `bag` property allows for flexible inclusion of other relevant display data as needed.

## `ElapsedState` Interface

For a more detailed representation of the timer's state, particularly for complex timing scenarios like intervals or specific workout segments, the `ElapsedState` interface is used:

```typescript
export interface ElapsedState {
    elapsed: number;        // Current elapsed time in milliseconds for the segment
    duration: number;       // Total duration in milliseconds of the segment
    remaining?: number;      // Remaining time in milliseconds for the segment (optional)
    spans?: ResultSpan[];    // Array of time spans within this state (optional)
    state: string;          // Descriptive state (e.g., "Work", "Rest", "Complete")
}
```
This structure tracks not only time but also the overall duration of a state, its descriptive name (`state`), and potentially breaks it down into smaller `ResultSpan` periods (defined in `Result Block.md`).

## Display States

The display should handle the following conceptual states with appropriate visual treatment based on the data received (primarily from `ElapsedState` or contextual information):

1.  **Ready**: Initial state before workout begins.
    *   Show workout preview.
    *   Display "Start" button prominently.
    *   Show total expected duration if available.

2.  **Running**: Active workout execution.
    *   Display primary timer (`elapsed`/`remaining` from `TimerDisplayBag` or `ElapsedState`) with large numerals.
    *   Show current context (`label` from `TimerDisplayBag` or `state` from `ElapsedState`).
    *   Indicate current round / total rounds if applicable (likely via `TimerDisplayBag.bag`).
    *   Present rest/work intervals clearly if using `ElapsedState`.

3.  **Paused**: Temporarily halted workout.
    *   Indicate paused state visually.
    *   Freeze timers.
    *   Show resume/reset options.

4.  **Completed**: Finished workout.
    *   Display final time (`elapsed` at completion).
    *   Show workout summary statistics (using data from `Result Block`).
    *   Present "Save Results" option.
    *   Display completion animation/indicator.

## Visual Hierarchy

The display should prioritize information based on the current phase of the workout:

1. **Primary**: Time (elapsed/remaining)
2. **Secondary**: Current movement and rep count
3. **Tertiary**: Round information and workout progress
4. **Quaternary**: Additional metrics and competition data

## Color Coding

The display should use consistent color coding:

- **Green**: Starting, positive indicators
- **Yellow**: Warnings, halfway points
- **Red**: Time critical, final seconds
- **Blue**: Rest periods
- **White/Gray**: Neutral information

## Interaction Events

The display should handle the following interaction events:

1. **Tap**: Toggle detailed information
2. **Long Press**: Access quick controls
3. **Swipe**: Navigate between views (if applicable)

## Implementation Approach

The runtime system communicates display updates primarily through actions that eventually update the UI state with `TimerDisplayBag` or derived information.

1.  A runtime handler processes an event (e.g., `TickEvent`, `CompleteEvent`).
2.  The handler determines the necessary display update.
3.  An action (e.g., `DisplayUpdateAction`) is generated containing a `TimerDisplayBag` or information used to derive the display state.
4.  The action is applied, updating the central state.
5.  The display component re-renders with the new information.

## Accessibility Considerations

The display should maintain accessibility by:

- Using high contrast colors
- Providing large, readable time displays
- Including haptic feedback for key transitions
- Supporting screen readers with appropriate ARIA attributes

## Responsive Design

The display should adapt to different screen sizes:

- Full-screen mode for active workouts
- Compact view for small devices
- Desktop optimized layout with additional metrics
- Tablet-friendly touch targets

## Future Enhancements

Potential future enhancements include:

- Heart rate integration
- Movement form feedback
- Video recording of key movements
- Social sharing of workout results
- Competitive leaderboard integration