# Runtime Behaviors Deep Dive

This document provides a technical deep dive into the **Runtime Behaviors** that power the WodWiki execution engine. Behaviors are composable logic units that are attached to `RuntimeBlock`s to define their functionality.

## Architecture

WodWiki uses a **Composition over Inheritance** model for Runtime Blocks. Instead of a deep class hierarchy (e.g., `TimerBlock` extends `Block`), blocks are lightweight containers that hold a collection of `IRuntimeBehavior`s.

Each behavior implements the `IRuntimeBehavior` interface, allowing it to hook into the block's lifecycle:
*   `onPush`: Called when the block is added to the stack (Mount).
*   `onNext`: Called when the runtime advances (Execution step).
*   `onPop`: Called when the block is removed from the stack (Unmount).
*   `onDispose`: Called when the block is destroyed.

## Core Behaviors

### 1. TimerBehavior
**File:** `src/runtime/behaviors/TimerBehavior.ts`

The `TimerBehavior` is responsible for all time-tracking functionality. It is used by `TimerBlock` and can be configured for count-up ("For Time") or count-down ("AMRAP") modes.

#### State Model
The behavior maintains its state in **Runtime Memory** (public visibility) to support persistence and UI updates:
*   **`TIMER_TIME_SPANS` (`TimeSpan[]`)**: A list of start/stop timestamps.
    *   `start`: Date when the timer started (or resumed).
    *   `stop`: Date when the timer paused (or undefined if running).
    *   Total elapsed time is calculated by summing the duration of all closed spans + the duration of the current open span.
*   **`TIMER_IS_RUNNING` (`boolean`)**: Simple flag indicating if the timer is active.

#### Precision Timing
*   Uses `performance.now()` for sub-millisecond internal precision.
*   Uses `setInterval` (~100ms) to emit `timer:tick` events for the UI.
*   **Drift Correction**: Elapsed time is always calculated as `now - startTime` (adjusted for pauses), rather than accumulating tick deltas, ensuring zero drift over long workouts.

#### Lifecycle Hooks
*   **`onPush`**: Starts the timer (creates a new `TimeSpan`). Emits `timer:started`.
*   **`onPop`**: Stops the timer (closes the current `TimeSpan`).
*   **`dispose`**: Clears the tick interval.

---

### 2. LoopCoordinatorBehavior
**File:** `src/runtime/behaviors/LoopCoordinatorBehavior.ts`

This is the most complex behavior, acting as the "brain" for parent blocks (`RoundsBlock`, `TimerBlock` with children). It orchestrates the execution of child statements.

#### Loop State
It tracks execution using a 3-part state model:
1.  **`index`**: Total number of advancements (0, 1, 2, ...).
2.  **`position`**: Which child group to execute next (`index % childGroups.length`).
3.  **`rounds`**: How many full loops have completed (`Math.floor(index / childGroups.length)`).

#### Loop Types
The behavior supports different execution modes defined by `LoopType`:
*   **`FIXED`**: Runs for a specific number of `totalRounds`.
*   **`REP_SCHEME`**: Runs once for each value in a `repScheme` array (e.g., [21, 15, 9]).
*   **`TIME_BOUND`**: (AMRAP) Runs indefinitely until a timer expires.
*   **`INTERVAL`**: (EMOM) Runs on a fixed time interval.

#### JIT Compilation
On `onNext`, the behavior:
1.  Calculates the next `position`.
2.  Identifies the `childGroupIds` (statement IDs) for that position.
3.  Calls `runtime.jit.compile()` to convert those statements into a new `RuntimeBlock`.
4.  Returns a `PushBlockAction` to execute that new block.

#### Context Passing
For `REP_SCHEME` loops, the behavior allows the parent block to retrieve the current rep count (`getRepsForCurrentRound()`). The parent `RoundsBlock` then publishes this to `METRIC_REPS` memory, allowing child `EffortBlock`s to inherit the correct rep count dynamically.

---

### 3. CompletionBehavior
**File:** `src/runtime/behaviors/CompletionBehavior.ts`

A generic behavior that determines when a block is finished. It decouples the *condition* of completion from the *action* of completing.

#### Logic
*   **Condition**: Accepts a predicate function `(runtime, block) => boolean`.
*   **Triggers**: Checks the condition on `onNext` (standard) and optionally on `onPush` (for instant completion) or specific events.
*   **Action**: When the condition is met, it:
    1.  Emits `block:complete`.
    2.  Returns a `PopBlockAction` to remove the block from the stack.

#### Usage Examples
*   **TimerBlock**: Condition = `timer.elapsed >= duration` OR `children.isComplete`.
*   **RoundsBlock**: Condition = `loopCoordinator.rounds >= totalRounds`.
*   **EffortBlock**: Condition = `currentReps >= targetReps`.

---

### 4. HistoryBehavior
**File:** `src/runtime/behaviors/HistoryBehavior.ts`

A utility behavior for analytics and logging.

*   **`onPush`**: Records the `startTime` and allocates `METRIC_START_TIME` in public memory. This allows the UI to show when a specific block started.
*   **`onDispose`**: Previously handled logging, now largely handled by the `ScriptRuntime` stack hooks, but remains as an extension point for block-specific metrics.

---

## Event Handling System

While not a "Behavior" in the strict sense, the **Event Handling** system is crucial for the behavior ecosystem.

### BlockCompleteEventHandler
**File:** `src/runtime/behaviors/BlockCompleteEventHandler.ts`

This handler closes the execution loop:
1.  A child block finishes (e.g., `EffortBlock` reaches 21 reps).
2.  Its `CompletionBehavior` emits `block:complete`.
3.  `BlockCompleteEventHandler` catches this event.
4.  It verifies the event belongs to the *current* block on the stack.
5.  It returns a `PopBlockAction`.
6.  The runtime pops the child.
7.  The runtime calls `onNext` on the *parent* block.
8.  The parent's `LoopCoordinatorBehavior` advances to the next child.

## Legacy Behaviors
*   **`CompletionTrackingBehavior`**: Deprecated. Replaced by `LoopCoordinatorBehavior`'s built-in completion logic.
*   **`ParentContextBehavior`**: Simple container for parent references. Largely superseded by the memory-based context inheritance system (`runtime.memory.search`).
