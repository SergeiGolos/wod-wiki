# Block-Behavior Crosswalk

This document provides a crosswalk between the primary `RuntimeBlock` types (as defined by their compilation strategy) and the `IRuntimeBehavior` instances that compose them. It also includes a detailed comparison of all available behaviors.

---

## Block Composition

This section details the behaviors that are attached to each of the main block types when they are compiled by their corresponding strategy.

### 1. Effort Block

-   **Strategy**: `EffortStrategy`
-   **Description**: The default block type for simple, repetition-based tasks. It is used when no other specific strategy (like Timer or Rounds) matches.

**Behaviors Used**:

-   `ChildAdvancementBehavior` *(if children exist)*
-   `LazyCompilationBehavior` *(if children exist)*

### 2. Timer Block

-   **Strategy**: `TimerStrategy`
-   **Description**: A parent block for time-bound workouts, such as an AMRAP or a timed rest period.

**Behaviors Used**:

-   `TimerBehavior`
-   `ChildAdvancementBehavior` *(if children exist)*
-   `LazyCompilationBehavior` *(if children exist)*

### 3. Rounds Block

-   **Strategy**: `RoundsStrategy`
-   **Description**: A parent block for workouts structured into multiple rounds.

**Behaviors Used**:

-   `RoundsBehavior` *(Note: This is an assumed behavior based on the strategy's purpose, as it was not explicitly in the strategy's source code at the time of writing)*
-   `ChildAdvancementBehavior` *(if children exist)*
-   `LazyCompilationBehavior` *(if children exist)*

---

## Behavior Comparison Matrix

This table provides a detailed comparison of each available `IRuntimeBehavior`, outlining its function at each lifecycle stage.

| Behavior                       | `onPush`                                                                 | `onNext`                                                                                             | `onPop`                                       | `onDispose`                                       | Notes                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **`ChildAdvancementBehavior`** | -                                                                        | Increments the internal child index. Returns no actions.                                             | -                                             | -                                                 | Manages the sequential execution of child blocks. Provides state for other behaviors like `LazyCompilationBehavior`.                |
| **`CompletionBehavior`**       | -                                                                        | Evaluates its `condition` function. Emits a `block:complete` event if the condition is met.          | -                                             | -                                                 | Provides a generic, configurable way to detect block completion based on a condition function and optional trigger events.          |
| **`CompletionTrackingBehavior`** | -                                                                        | Checks the `isComplete()` status of `ChildAdvancementBehavior` and updates its own internal flag.    | -                                             | -                                                 | Acts as a simple flag to signal when a block with children has finished executing all of them.                                      |
| **`LazyCompilationBehavior`**  | -                                                                        | Compiles the current child statement (provided by `ChildAdvancementBehavior`) into a new `RuntimeBlock`. | -                                             | Clears the internal compilation cache if enabled. | Implements a Just-In-Time (JIT) compilation strategy to improve performance. Can optionally cache compiled blocks.                 |
| **`ParentContextBehavior`**    | - (No-op)                                                                | -                                                                                                    | -                                             | -                                                 | Holds a reference to the parent `RuntimeBlock`, enabling context-aware execution and data sharing between parent and child blocks.    |
| **`RoundsBehavior`**           | Allocates shared memory for round state (`currentRound`, `totalRounds`). | Increments the round counter and updates shared memory. Emits `rounds:changed` or `rounds:complete`. | -                                             | Releases the allocated shared memory.             | Manages round tracking, supports variable rep schemes, and provides compilation context for child blocks.                             |
| **`TimerBehavior`**            | Allocates shared memory for timer state and starts the `setInterval` tick. | -                                                                                                    | Stops the timer and closes the final `TimeSpan`. | Clears the `setInterval` to stop the tick loop.   | Manages time tracking (count-up/down), emits `timer:tick` events, and supports pause/resume functionality through shared memory. |
