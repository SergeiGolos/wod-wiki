# Deep Dive: Start/Stop Events and Timer Block Handling

This document outlines how start/stop events and timer blocks are handled in the runtime, focusing on event registration, state management, and testing strategies.

## 1. Architecture Overview

The system uses an event-driven architecture to decouple the runtime execution from tracking and reporting.

### Key Components

| Component | Responsibility |
|-----------|----------------|
| `BlockContext` | Gatekeeper for block-specific memory operations and event dispatching. |
| `EventBus` | Central hub for dispatching and subscribing to events (`IEvent`). |
| `SpanTrackingHandler` | Observer that implements `IEventHandler` to track block execution lifetimes (spans). |
| `TimerBehavior` | Manages timer logic, internal state, and updates the shared memory state. |
| `TimerStateManager` | Orchestrates memory allocation and display actions for timers. |

---

## 2. Event Registration & Flow

### Span Tracking
Events are "registered" by adding handlers to the `EventBus`. The `SpanTrackingHandler` is the primary subscriber for execution-related events.

1.  **Registration**: In `ScriptRuntime` constructor, the `SpanTrackingHandler` is registered for:
    *   `stack:push`: Captures when a block starts execution.
    *   `stack:pop`: Captures when a block finishes execution.
    *   `memory:set`: (Observed for secondary tracking, though spans are primarily stack-driven).

2.  **Execution Flow**:
    *   **Push**: `ScriptRuntime.pushBlock()` → `EventBus.dispatch(StackPushEvent)` → `SpanTrackingHandler.handleStackPush()` → Creates and starts a `RuntimeSpan`.
    *   **Pop**: `ScriptRuntime.popBlock()` → `EventBus.dispatch(StackPopEvent)` → `SpanTrackingHandler.handleStackPop()` → Stops the `RuntimeSpan` and archives it.

### Timer Specific Events
`TimerBehavior` also emits semantic events for UI and orchestration:
*   `timer:started`: Emitted when the timer behavior is first pushed.
*   `timer:tick`: Emitted periodically (via `TimerDisplayAction` updates) to update UI.

---

## 3. Timer Block Handling

Timer blocks (implemented via `TimerBehavior`) manage their state across both internal instance variables and shared memory (for persistence and UI).

### Start Sequence
1.  **`onPush(runtime, block)`**:
    - Initializes `TimerStateManager`.
    - Allocates a `RuntimeSpan` in public memory via `block.context.allocate()`.
    - Dispatches `timer:started` event.
    - If `autoStart` is enabled, calls `start()`.

2.  **`start()`**:
    - Creates a new `TimeSpan` (a slice of time with a start/end).
    - Updates the `RuntimeSpan` in memory via `stateManager.updateState()`.
    - `stateManager.updateState()` calls `block.context.set()`, which dispatches a `memory:set` event.

### Stop/Pause Sequence
1.  **`stop()` / `pause()`**:
    - Captures the current `elapsedMs`.
    - Closes the active `TimeSpan` by setting its end timestamp.
    - Updates memory via `stateManager`.
    - If stopped, the timer is marked as inactive in its memory reference.

---

## 4. How This Is Tested

Testing focuses on ensuring that events are dispatched correctly and that state transitions are accurate.

### Test Categories

#### A. Span Tracking Tests (`SpanTrackingHandler.test.ts`)
- **Objective**: Verify that the tracker correctly mirrors the stack state.
- **Scenarios**:
    - Push block → Verify `getActiveSpan(blockId)` is not null and has a start time.
    - Pop block → Verify span is moved to `getCompletedSpans()` and has an end time.
    - Nested blocks → Verify parent/child relationships in spans.

#### B. Memory Event Tests (`context-memory-events.test.ts`)
- **Objective**: Ensure `BlockContext` correctly dispatches events when memory is manipulated.
- **Scenarios**:
    - `context.allocate()` → Verify `MemoryAllocateEvent` is dispatched.
    - `context.set()` → Verify `MemorySetEvent` is dispatched with old and new values.

#### C. Timer Behavior Tests (`TimerBehavior.test.ts`)
- **Objective**: Verify the logic of `TimerBehavior` and its interaction with `TimerStateManager`.
- **Scenarios**:
    - `onPush` setup: Verify memory allocation and initial display actions.
    - `start/stop` cycles: Verify that multiple `TimeSpan` objects are created and stored.
    - Persistence: Verify that `getElapsedMs()` returns the sum of all stored spans.

#### D. Integration Tests (`orchestration.test.ts`)
- **Objective**: Verify the full cycle from script execution to event tracking.
- **Scenarios**:
    - Run a script with timers → Inspect the `runtime.tracker` (SpanTrackingHandler) to ensure all blocks resulted in closed spans with correct durations.

---

## 5. Key Contracts

- **Time Tracking**: Uses `Unix Epoch` milliseconds for all timestamps to ensure consistency across serialization.
- **Reactive Updates**: UI components (like `TimerDisplay`) listen to `timer:tick` or observe memory changes triggered by `memory:set` events.
- **Performance**: Event dispatching must be non-blocking. `SpanTrackingHandler` updates its internal Map which is an $O(1)$ operation.
