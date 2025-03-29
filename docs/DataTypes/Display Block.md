# Display Block Interface

This document defines the interface between the runtime and the clock display for CrossFit-style competitions in the wod.wiki application.

## Overview

The Display Block is responsible for presenting visual information about the current workout state to the user. It receives updates from the runtime system via the `SetDisplayAction` and visualizes the workout's progress, timing, and current state.

## TimerDisplay Interface

The core interface between the runtime and display is the `TimerDisplay` interface:

```typescript
export interface TimerDisplay {
    // Time fields
    elapsed: number;      // Time elapsed in seconds
    remaining?: number;   // Time remaining in seconds (for timed workouts)
    
    // Current state
    state: string;        // "ready", "running", "paused", "completed"
    
    // Descriptive content
    label?: string;       // Description of current exercise/block
    
    // Round information
    round?: number;       // Current round
    totalRounds?: number; // Total rounds in workout
}
```

## Extended Display Requirements for CrossFit Competitions

While the current interface covers basic timing needs, CrossFit-style competitions require additional display elements to effectively communicate workout state:

```typescript
export interface EnhancedTimerDisplay extends TimerDisplay {
    // Current movement details
    currentMovement?: string;        // Active movement (e.g., "Push-ups")
    targetReps?: number;             // Target repetitions for current movement
    completedReps?: number;          // Completed repetitions
    
    // Visual indicators
    intensity?: "low" | "medium" | "high";  // Workout intensity level
    
    // Timing segments
    workInterval?: number;           // Duration of work interval (seconds)
    restInterval?: number;           // Duration of rest interval (seconds)
    isRestPeriod?: boolean;          // Whether in rest or work period
    
    // Additional workout metrics
    caloriesBurned?: number;         // Estimated calories burned
    movementEfficiency?: number;     // Efficiency measure (0-100%)
    
    // Competition specific
    heatNumber?: number;             // Competition heat number
    laneNumber?: number;             // Athlete lane assignment
    athleteName?: string;            // Athlete name
    
    // Audio cues
    audioAlert?: "start" | "halfway" | "timeWarning" | "finish"; // Audio notification type
}
```

## Display States

The display should handle the following states with appropriate visual treatment:

1. **Ready**: Initial state before workout begins
   - Show workout preview
   - Display "Start" button prominently
   - Show total expected duration

2. **Running**: Active workout execution
   - Display elapsed time with large numerals
   - Show current movement with rep counts
   - Indicate current round / total rounds
   - Present rest/work intervals clearly

3. **Paused**: Temporarily halted workout
   - Indicate paused state visually
   - Freeze timers
   - Show resume/reset options

4. **Completed**: Finished workout
   - Display total time
   - Show workout summary statistics
   - Present "Save Results" option
   - Display completion animation/indicator

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

The SetDisplayAction serves as the communication mechanism between the runtime and the display. When workout state changes:

1. A compiler strategy recognizes a state change
2. The strategy creates a SetDisplayAction with updated display information
3. The action is applied, updating the display state
4. The display component re-renders with the new information

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

## Example State Transitions

```
Ready → Running:
{
  elapsed: 0,
  state: "running",
  label: "3 Rounds For Time",
  round: 1,
  totalRounds: 3,
  currentMovement: "Push-ups",
  targetReps: 15,
  completedReps: 0
}

Running (mid-workout):
{
  elapsed: 120,
  state: "running",
  label: "3 Rounds For Time",
  round: 2,
  totalRounds: 3,
  currentMovement: "Air Squats",
  targetReps: 20,
  completedReps: 12
}

Paused:
{
  elapsed: 210,
  state: "paused",
  label: "3 Rounds For Time",
  round: 3,
  totalRounds: 3
}

Completed:
{
  elapsed: 345,
  state: "completed",
  label: "3 Rounds For Time",
  round: 3,
  totalRounds: 3
}