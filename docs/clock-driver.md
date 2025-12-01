# Clock Driver Architecture

## Overview

The Clock Driver architecture defines how runtime blocks target and update specific elements of the workout display (the "Track Screen"). The goal is to allow granular control where different blocks can independently drive the **Primary Timer**, **Secondary Timers**, **Activity Card**, and **Control Buttons**.

## Display Channels

The display is divided into distinct "Channels" that blocks can target:

1.  **Primary Timer**: The main, large clock display. Usually shows the active segment's time (e.g., current interval, AMRAP countdown).
2.  **Secondary Timers**: Smaller, auxiliary clocks. Used for parent containers (e.g., total workout time, EMOM parent timer).
3.  **Activity Card**: The central content area showing the current instruction, exercise, or status (e.g., "10 Burpees", "Rest").
4.  **Controls**: The interactive buttons (Start, Pause, Next, etc.).

## Targeting Mechanism

Blocks target these channels by emitting specific **Display Actions** with a `role` or `target` property.

### 1. Timer Targeting

When pushing a timer display, a block specifies its `role`:

*   `'primary'`: Forces this timer to be the Main Clock.
*   `'secondary'`: Forces this timer to be a Secondary Timer.
*   `'auto'` (Default): The system determines placement based on hierarchy (Leaf = Primary, Root/Parent = Secondary).

```typescript
// Example: Pushing a Secondary Timer (e.g., Total Workout Time)
new PushTimerDisplayAction({
  id: 'total-time',
  role: 'secondary', // Explicitly target secondary slot
  label: 'Total Time',
  ...
})
```

### 2. Card Targeting

Cards are pushed to a stack, but we can introduce "Slots" or "Types" to refine targeting:

*   `'active-block'`: The main instruction card (default).
*   `'overlay'`: A modal or overlay card (e.g., "Get Ready").
*   `'info'`: A persistent info card (e.g., Heart Rate Zone).

```typescript
// Example: Pushing the Active Exercise Card
new PushCardDisplayAction({
  id: 'exercise-card',
  type: 'active-block', // Targets the main card area
  title: '10 Pushups',
  ...
})
```

### 3. Control Targeting

Controls are often tied to the active block, but can be decoupled. A block can register controls independently of timers or cards.

```typescript
// Example: Registering Global Controls
new RegisterControlsAction({
  buttons: [
    { id: 'stop', label: 'Stop Workout', action: 'stop' }
  ]
})
```

## Memory Structure & Decoupling

To support this, we decouple the monolithic `TimerState` into specialized memory components:

1.  **`TimerMemory`**: Stores strictly time-related data (start, stop, spans, duration).
2.  **`CardMemory`**: Stores content data (title, subtitle, metrics).
3.  **`ControlMemory`**: Stores available buttons and their states.

A single Runtime Block can allocate and manage these independently.

### Example: "EMOM" Block

An EMOM block might manage:
1.  **Secondary Timer**: Its own 10-minute countdown (Total EMOM time).
2.  **Controls**: "Next Round" button.

It *delegates* the **Primary Timer** and **Activity Card** to its children (the specific minute intervals).

### Example: "Rest" Block

A Rest block might manage:
1.  **Primary Timer**: A 1-minute countdown.
2.  **Activity Card**: "Rest" instruction.
3.  **Controls**: "Skip Rest" button.

## Inheritance & Defaults

The system employs a **"Bubble-Up"** or **"Stack-Top"** strategy for defaults:

1.  **Primary Timer**: Defaults to the *Leaf* (most deeply nested) active block's timer.
2.  **Secondary Timers**: Defaults to the *Parent* blocks' timers (bubbling up the stack).
3.  **Activity Card**: Defaults to the *Leaf* active block's card.

This ensures that by default, the user sees "what am I doing right now" (Leaf) as the primary focus, while keeping context (Parent) visible but secondary.

## Implementation Strategy

1.  **Split `TimerStateManager`**: Refactor into `TimerDisplayManager` and `CardDisplayManager`.
2.  **Update Actions**: Ensure `PushTimerDisplayAction` and `PushCardDisplayAction` support explicit `role` properties.
3.  **Update `StackedClockDisplay`**:
    *   Render `PrimaryTimer` from the stack entry with `role: 'primary'` OR the top of the stack.
    *   Render `SecondaryTimers` from entries with `role: 'secondary'` OR the rest of the stack.
