# Runtime Architecture: Blocks, Strategies, and Behaviors

This document provides a detailed overview of the runtime architecture in WodWiki, focusing on how execution blocks are constructed, the strategies used to select them, and the behaviors that define their logic.

## Overview

The WodWiki runtime executes workouts using a **Block-Based Architecture**. 
1.  **CodeStatements** (parsed from markdown) are compiled into **RuntimeBlocks**.
2.  **Strategies** determine which Block to create based on the statement's fragments (Timer, Rounds, etc.).
3.  **Behaviors** are composable logic units attached to Blocks that handle specific functionality (timing, looping, completion).
4.  **JitCompiler** (Just-In-Time Compiler) orchestrates this process, compiling statements into blocks on demand.

## Compilation Strategies

The `JitCompiler` iterates through registered strategies to find the first one that matches a given set of `CodeStatement`s. The order of strategies matters (priority).

| Strategy | Priority | Match Condition | Produces | Description |
| :--- | :--- | :--- | :--- | :--- |
| **TimeBoundRoundsStrategy** | High | `Timer` + (`Rounds` OR `AMRAP`) | `RoundsBlock`* | AMRAPs or time-capped rounds. *Currently creates RoundsBlock directly due to architectural limitation (should wrap in Timer).* |
| **IntervalStrategy** | High | `Timer` + `EMOM` | `RuntimeBlock`* | EMOMs (Every Minute On the Minute). *Partial implementation.* |
| **TimerStrategy** | Medium | `Timer` fragment | `TimerBlock` | Simple time-based blocks (e.g., "For Time", "20:00"). |
| **RoundsStrategy** | Medium | `Rounds` fragment (no Timer) | `RoundsBlock` | Round-based workouts (e.g., "3 Rounds", "21-15-9"). |
| **GroupStrategy** | Low | Statement has children | `RuntimeBlock`* | Structural grouping for nested exercises. *Partial implementation.* |
| **EffortStrategy** | Lowest | Default (no Timer/Rounds) | `EffortBlock` | Single exercise efforts (e.g., "10 Pushups"). Leaf nodes. |

*> *Note: Some strategies are marked as partial implementation or have architectural notes in the code.*

## Runtime Blocks

Blocks are the executable units of a workout. They manage their own state, memory, and lifecycle.

### 1. TimerBlock
**Produced by:** `TimerStrategy`
**Purpose:** Manages time-based execution (Count-up or Countdown).

*   **Configuration:**
    *   `direction`: 'up' (For Time) or 'down' (Countdown/AMRAP).
    *   `durationMs`: Duration for countdowns.
    *   `children`: Optional child statements (e.g., exercises to do within the time).
*   **Behaviors:**
    *   `TimerBehavior`: Manages the actual timer logic (start, stop, pause, resume, tick events).
    *   `HistoryBehavior`: Tracks execution history.
    *   `LoopCoordinatorBehavior`: (If children exist) Manages the execution of child blocks (executes once).
    *   `CompletionBehavior`: Completes when timer finishes (if countdown) OR when children complete.
*   **Memory:**
    *   Allocates `TIMER_TIME_SPANS` (public) to track start/stop times.
    *   Allocates `TIMER_IS_RUNNING` (public) to track state.

### 2. RoundsBlock
**Produced by:** `RoundsStrategy`, `TimeBoundRoundsStrategy`
**Purpose:** Manages multi-round execution (Fixed rounds, Rep Schemes, or Infinite/AMRAP).

*   **Configuration:**
    *   `totalRounds`: Number of rounds (or Infinity).
    *   `repScheme`: Optional array of reps per round (e.g., `[21, 15, 9]`).
    *   `children`: Child statements to execute in each round.
*   **Behaviors:**
    *   `LoopCoordinatorBehavior`: The core logic. Cycles through child groups for each round. Handles rep scheme context.
    *   `CompletionBehavior`: Completes when `LoopCoordinator` reports completion.
    *   `HistoryBehavior`: Tracks execution history.
*   **Memory:**
    *   Allocates `METRIC_REPS` (public) if a rep scheme is used. This allows child `EffortBlock`s to inherit the correct rep count for the current round.
*   **Logic:**
    *   On `next()`, it advances the round index.
    *   Updates the public `METRIC_REPS` memory so children know how many reps to do.

### 3. EffortBlock
**Produced by:** `EffortStrategy`
**Purpose:** Tracks completion of a specific exercise (Leaf Node).

*   **Configuration:**
    *   `exerciseName`: Name of the exercise.
    *   `targetReps`: Number of reps to complete.
*   **Behaviors:**
    *   `CompletionBehavior`: Completes when `currentReps >= targetReps`.
*   **Memory:**
    *   Allocates `effort:{blockId}` (private) to track `currentReps`, `targetReps`, and `exerciseName`.
*   **Logic:**
    *   **Inheritance:** If no reps are explicitly defined in the fragment, it searches `runtime.memory` for `METRIC_REPS` (public) to inherit reps from a parent `RoundsBlock`.
    *   **Tracking:** Supports incremental (tap) or bulk (set) rep updates.
    *   **Events:** Emits `reps:updated` and `reps:complete`.

## Runtime Behaviors

Behaviors are reusable components that implement specific logic for blocks. They hook into the block's lifecycle (`onPush`, `onNext`, `onPop`, `onDispose`).

> **Deep Dive**: For a detailed technical breakdown of each behavior, see [Runtime Behaviors Deep Dive](./Runtime_Behaviors_Deep_Dive.md).

### TimerBehavior
*   **Responsibility:** Precision time tracking.
*   **Mechanics:** Uses `performance.now()` for sub-ms precision. Emits `timer:tick` events (~10Hz).
*   **State:** Persists state in `TimeSpan[]` memory to support pause/resume and history.

### LoopCoordinatorBehavior
*   **Responsibility:** Orchestrating child block execution.
*   **Modes:**
    *   `FIXED`: Run children X times.
    *   `REP_SCHEME`: Run children for each value in a rep scheme.
    *   `INTERVAL`: (Planned) Run children on a fixed interval (EMOM).
    *   `TIME_BOUND`: (Planned) Run children until time expires.
*   **Logic:** JIT compiles child statements into blocks as needed. Maintains the "Cursor" (current child, current round).

### CompletionBehavior
*   **Responsibility:** determining when a block is finished.
*   **Logic:** Accepts a condition function (predicate). Checks this condition on `onNext` (and optionally `onPush` or specific events). Returns a `PopBlockAction` when complete.

### HistoryBehavior
*   **Responsibility:** Logging execution start/end for analytics.

## Order of Operations (Execution Flow)

1.  **Mount (`onPush`)**:
    *   Block is pushed to stack.
    *   `TimerBehavior` starts the clock (if present).
    *   `EffortBlock` allocates memory.
    *   `CompletionBehavior` checks if already complete (optional).

2.  **Execution (`onNext`)**:
    *   Called when a child completes or when the runtime needs the next action.
    *   `LoopCoordinatorBehavior` determines the next child to push.
        *   If current round finished -> Advance round.
        *   If all rounds finished -> Signal completion.
    *   `RoundsBlock` updates public rep metrics for the new round.
    *   `CompletionBehavior` checks if the block itself is done.

3.  **Unmount (`onPop`)**:
    *   Block is removed from stack.
    *   `TimerBehavior` stops the clock.
    *   Resources are cleaned up.

4.  **Disposal**:
    *   Final cleanup of memory references and listeners.
