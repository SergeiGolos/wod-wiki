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
    *   `duration`: The total duration of the timer in seconds (for countdowns).
    *   `currentTime`: The current time of the timer in seconds.
    *   `direction`: `'up'` or `'down'`.
*   **Methods**:
    *   `onPush`: Starts the timer (e.g., using `setInterval`).
    *   `onPop`: Stops the timer (e.g., using `clearInterval`).
    *   `onEvent(event)`: Will listen for external `timer:pause`, `timer:resume` events.
*   **Events Emitted**:
    *   `timer:tick`: Every second, with the `currentTime` as data.
    *   `timer:complete`: When the timer reaches its target (for countdowns).

### 2. `RoundsBehavior`

*   **Responsibility**: Manages the state of a round-based workout, including variable rep schemes.
*   **State (Allocated Memory)**:
    *   `totalRounds`: The total number of rounds.
    *   `currentRound`: The current round number.
    *   `repScheme`: An array of numbers for variable rep rounds (e.g., `[21, 15, 9]`).
*   **Methods**:
    *   `onPush`: Initializes `currentRound` to 1.
    *   `onNext`: When a child block (representing the work within a round) completes, it increments `currentRound`. If `currentRound > totalRounds`, it signals completion.
    *   **Provides Context for Compilation**: When a child `EffortBlock` is about to be compiled, this behavior provides the correct number of reps for the current round from `repScheme`.
*   **Events Emitted**:
    *   `rounds:changed`: When the round number changes.

### 3. `CompletionBehavior`

*   **Responsibility**: A generic behavior to determine when a block has completed its work. This is more specific than the existing `CompletionTrackingBehavior`.
*   **Configuration**: Configured with a condition function `isComplete(runtime, block) => boolean`.
*   **Methods**:
    *   `onNext`: After a child completes, it calls `isComplete`. If it returns true, it triggers a `block:complete` action.
    *   `onEvent`: Can listen for events (like `timer:complete` or child block completion) to determine completion.

## Concrete RuntimeBlock Implementations

### 1. `TimerBlock`

This block is used for workouts that are purely time-based (like AMRAP) or for timing how long a workout takes ("For Time").

*   **Example Workouts**:
    *   `Cindy`, `Mary` (AMRAP - countdown)
    *   `Fran`, `Grace` ("For Time" - count-up)
*   **Composition**:
    *   `TimerBehavior`: Configured with direction `'down'` for AMRAP or `'up'` for "For Time".
    *   `ChildAdvancementBehavior`: To execute the child block(s).
    *   `LazyCompilationBehavior`: To compile child blocks.
    *   `CompletionBehavior`:
        *   For countdown: Listens for the `timer:complete` event.
        *   For count-up: Listens for the completion of its child block, then stops the timer.
*   **Memory Allocation**:
    *   Countdown: `{ type: 'timer', initialValue: { duration: 1200, currentTime: 1200, direction: 'down' } }`
    *   Count-up: `{ type: 'timer', initialValue: { currentTime: 0, direction: 'up' } }`

### 2. `RoundsBlock`

This block is for workouts with a fixed number of rounds.

*   **Example Workouts**: `Barbara`, `Nancy`, `Helen`, `Fran`
*   **Composition**:
    *   `RoundsBehavior`: Configured with the total number of rounds and a `repScheme` if reps are variable.
    *   `ChildAdvancementBehavior`: To execute the child blocks for each round.
    *   `LazyCompilationBehavior`: To compile the round contents.
    *   `CompletionBehavior`: Configured to check if `currentRound > totalRounds` in the `RoundsBehavior`.
*   **Memory Allocation**:
    *   `{ type: 'rounds', initialValue: { totalRounds: 3, currentRound: 1, repScheme: [21, 15, 9] } }`

### 3. `EffortBlock`

This block represents a single exercise, like "21 Thrusters". It doesn't have children.

*   **Example Workouts**: `Thrusters` in `Fran`, `Pullups` in `Cindy`.
*   **Composition**:
    *   `CompletionBehavior`: Configured to listen for a `reps:complete` event, which would be triggered by the UI when the user indicates they have completed the reps.
*   **Memory Allocation**:
    *   `{ type: 'reps', initialValue: { target: 21, current: 0 } }` (target is set dynamically by `RoundsBehavior` if in a variable rep scheme).
    *   `{ type: 'exercise', initialValue: 'Thrusters' }`

## Handling Different Workout Structures

### For Time (Count-Up Timers)

Workouts like `Fran` are "For Time". The goal is to complete the work as fast as possible.

*   **Execution Flow**:
    1.  A top-level `TimerBlock` is created with `direction: 'up'`.
    2.  This `TimerBlock` wraps the block(s) representing the workout's work (e.g., a `RoundsBlock`).
    3.  The `TimerBlock` starts its timer when pushed.
    4.  When the inner `RoundsBlock` completes, it notifies the `TimerBlock`.
    5.  The `TimerBlock`'s `CompletionBehavior` catches this, stops the timer, and the final `currentTime` is the workout result.

### Variable Rep Schemes (e.g., 21-15-9)

*   **Execution Flow**:
    1.  The `JitCompiler` recognizes the `(21-15-9)` pattern and creates a `RoundsBlock`.
    2.  The `RoundsBehavior` within this block is configured with `totalRounds: 3` and `repScheme: [21, 15, 9]`.
    3.  When the `ChildAdvancementBehavior` needs to compile an exercise for the first round, the `RoundsBehavior` provides the context that `reps = 21`.
    4.  An `EffortBlock` is created with `target: 21`.
    5.  After all exercises for the first round are done, `onNext` is called on the `RoundsBlock`, `currentRound` becomes 2.
    6.  The process repeats for the second round, but this time `RoundsBehavior` provides `reps = 15`.

## Example: `Fran` Workout Execution

`Fran` is `(21-15-9)` of `Thrusters` and `Pullups`, "For Time".

1.  The `JitCompiler` creates a `TimerBlock` with `direction: 'up'`.
2.  Inside it, it compiles a `RoundsBlock` with `totalRounds: 3` and `repScheme: [21, 15, 9]`.
3.  The `TimerBlock` is pushed and starts counting up. Its `ChildAdvancementBehavior` pushes the `RoundsBlock`.
4.  The `RoundsBlock` is pushed. Its `ChildAdvancementBehavior` asks to compile `Thrusters`. The `RoundsBehavior` provides the context `reps: 21`.
5.  An `EffortBlock` for "21 Thrusters" is created and pushed.
6.  Once the user completes 21 reps, the `EffortBlock` is popped.
7.  The `RoundsBlock` then compiles and pushes an `EffortBlock` for "21 Pullups".
8.  This continues for the 15-rep and 9-rep rounds.
9.  When the final "9 Pullups" `EffortBlock` is popped, the `RoundsBlock` has completed all its children for all its rounds. Its `CompletionBehavior` marks it as complete.
10. The `RoundsBlock` is popped. The `TimerBlock` is notified that its child has completed.
11. The `TimerBlock`'s `CompletionBehavior` stops the timer. The value of `currentTime` is the final score.

This design provides a clear path to implementing the missing runtime logic in a way that is consistent with the existing architecture.
