# Runtime Block Implementation Details

This document proposes the implementation details for the concrete `RuntimeBlock` classes required to execute the various workout types defined in the WOD Wiki project. The proposed design follows the existing behavior-based architecture.

## Core Concepts

Instead of complex inheritance, we will create specialized `RuntimeBlock` classes that are composed of specific behaviors. This approach is consistent with the current `RuntimeBlock` implementation and provides flexibility and reusability.

We will introduce three main block types:
1.  **`TimerBlock`**: Manages time-based workout segments.
2.  **`RoundsBlock`**: Manages workouts with a specific number of rounds.
3.  **`EffortBlock`**: Represents a single exercise or movement within a round.

To support these blocks, we will need to create new behaviors.

## New Behaviors

### 1. `TimerBehavior`

*   **Responsibility**: Manages a timer, either counting down from a specific duration or counting up. It will emit `timer:tick` events.
*   **State (Allocated Memory)**:
    *   `duration`: The total duration of the timer in seconds.
    *   `currentTime`: The current time of the timer in seconds.
    *   `direction`: `'up'` or `'down'`.
*   **Methods**:
    *   `onPush`: Starts the timer (e.g., using `setInterval`).
    *   `onPop`: Stops the timer (e.g., using `clearInterval`).
    *   `onEvent(event)`: Will listen for external `timer:pause`, `timer:resume` events.
*   **Events Emitted**:
    *   `timer:tick`: Every second, with the `currentTime` as data.
    *   `timer:complete`: When the timer reaches its target.

### 2. `RoundsBehavior`

*   **Responsibility**: Manages the state of a round-based workout.
*   **State (Allocated Memory)**:
    *   `totalRounds`: The total number of rounds.
    *   `currentRound`: The current round number.
*   **Methods**:
    *   `onPush`: Initializes `currentRound` to 1.
    *   `onNext`: When a child block (representing the work within a round) completes, it increments `currentRound`. If `currentRound > totalRounds`, it signals completion.
*   **Events Emitted**:
    *   `rounds:changed`: When the round number changes.

### 3. `CompletionBehavior`

*   **Responsibility**: A generic behavior to determine when a block has completed its work. This is more specific than the existing `CompletionTrackingBehavior`.
*   **Configuration**: Configured with a condition function `isComplete(runtime, block) => boolean`.
*   **Methods**:
    *   `onNext`: After a child completes, it calls `isComplete`. If it returns true, it triggers a `block:complete` action.
    *   `onEvent`: Can listen for events (like `timer:complete`) to determine completion.

## Concrete RuntimeBlock Implementations

### 1. `TimerBlock`

This block is used for workouts that are purely time-based, like a 20-minute AMRAP.

*   **Example Workouts**: `Cindy`, `Mary`
*   **Composition**:
    *   `TimerBehavior`: Configured with the workout duration (e.g., 20 minutes) and direction `'down'`.
    *   `ChildAdvancementBehavior`: To execute the child blocks (the exercises within the AMRAP).
    *   `LazyCompilationBehavior`: To compile the exercises just-in-time.
    *   `CompletionBehavior`: Configured to listen for the `timer:complete` event from the `TimerBehavior`.
*   **Memory Allocation**:
    *   `{ type: 'timer', initialValue: { duration: 1200, currentTime: 1200, direction: 'down' } }`

### 2. `RoundsBlock`

This block is for workouts with a fixed number of rounds, like "5 rounds for time".

*   **Example Workouts**: `Barbara`, `Nancy`, `Helen`
*   **Composition**:
    *   `RoundsBehavior`: Configured with the total number of rounds (e.g., 5).
    *   `ChildAdvancementBehavior`: To execute the child blocks for each round.
    *   `LazyCompilationBehavior`: To compile the round contents.
    *   `CompletionBehavior`: Configured to check if `currentRound > totalRounds` in the `RoundsBehavior`.
*   **Memory Allocation**:
    *   `{ type: 'rounds', initialValue: { totalRounds: 5, currentRound: 1 } }`

### 3. `EffortBlock`

This block represents a single exercise, like "21 Thrusters". It doesn't have children.

*   **Example Workouts**: `Thrusters` in `Fran`, `Pullups` in `Cindy`.
*   **Composition**:
    *   `CompletionBehavior`: Configured to listen for a `reps:complete` event, which would be triggered by the UI when the user indicates they have completed the reps.
*   **Memory Allocation**:
    *   `{ type: 'reps', initialValue: { target: 21, current: 0 } }`
    *   `{ type: 'exercise', initialValue: 'Thrusters' }`

## Example: `Cindy` Workout Execution

`Cindy` is a `20:00 AMRAP` of `5 Pullups`, `10 Pushups`, `15 Air Squats`.

1.  The `JitCompiler` sees the `20:00 AMRAP` and creates a `TimerBlock` with a 20-minute `TimerBehavior`. The exercises are passed as child statements.
2.  The `TimerBlock` is pushed to the stack. Its `TimerBehavior` starts a 20-minute countdown.
3.  The `ChildAdvancementBehavior` of the `TimerBlock` asks the `JitCompiler` to compile the first child: `5 Pullups`.
4.  The compiler creates an `EffortBlock` for `5 Pullups`.
5.  The `EffortBlock` is pushed. It waits for UI interaction to complete the 5 reps.
6.  When the user confirms 5 reps are done, the `EffortBlock` is popped.
7.  The `TimerBlock`'s `onNext` is called, and its `ChildAdvancementBehavior` compiles and pushes the `EffortBlock` for `10 Pushups`.
8.  This continues for the `15 Air Squats`.
9.  When the `15 Air Squats` block is popped, the `ChildAdvancementBehavior` sees it's at the end of the children and loops back to the `5 Pullups`.
10. This cycle continues until the `TimerBehavior` in the `TimerBlock` emits `timer:complete`.
11. The `CompletionBehavior` of the `TimerBlock` catches this event and completes the block, ending the workout.

This design provides a clear path to implementing the missing runtime logic in a way that is consistent with the existing architecture.
