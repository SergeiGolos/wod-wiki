# TimerBehavior

## 1. Overview

The `TimerBehavior` is a fundamental `IRuntimeBehavior` for managing time-based aspects of a workout. It provides a high-precision timer that can operate in two primary modes: count-up (like a stopwatch) and count-down (like a traditional timer).

This behavior is the engine behind any time-based block, such as "For Time," "AMRAP," or timed rest periods. It handles the core logic of starting, stopping, pausing, and resuming, while emitting regular events that the UI can use to display the elapsed or remaining time.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(direction: 'up' | 'down' = 'up', durationMs?: number)
```

The behavior is configured with two parameters:

1.  **`direction`**: Determines the timer's mode. It can be `'up'` (the default) for a count-up timer or `'down'` for a countdown.
2.  **`durationMs`** (Optional): For countdown timers, this specifies the total duration in milliseconds from which the timer will count down.

### State

-   `intervalId`: Holds the ID of the `setInterval` function that drives the timer's ticks.
-   `startTime`, `elapsedMs`, `pauseTime`: Private fields used to calculate the elapsed time with high precision using `performance.now()`.
-   `_isPaused`: A boolean flag to track the paused state.
-   `timeSpansRef`, `isRunningRef`: References to locations in the runtime's shared memory. This is the modern way the timer exposes its state publicly.

## 3. Interaction with the Runtime and Block

### `onPush()` Hook

-   This hook is called when the timer's block is pushed onto the stack.
-   It allocates two public memory references using `runtime.memory.allocate()`:
    -   `timer-time-spans`: Stores an array of `TimeSpan` objects, allowing for accurate time tracking across multiple pause/resume cycles.
    -   `timer-is-running`: A boolean flag indicating the current running state.
-   It initializes the timer state, sets `startTime`, and starts the `setInterval` tick loop (which runs every 100ms).
-   It emits a `timer:started` event.

### `onPop()` Hook

-   When the block is popped, this hook stops the timer.
-   It clears the `setInterval` to stop the tick loop.
-   It updates the shared memory by closing the last `TimeSpan` and setting `isRunning` to `false`.

### `onDispose()` Hook

-   The `dispose` method is implemented to provide a fallback cleanup mechanism, ensuring the `setInterval` is cleared if it's still running.

### The `tick()` Method

-   This private method is the heart of the timer.
-   It calculates the elapsed time.
-   For countdown timers, it checks if the `remainingMs` has reached zero. If so, it stops the timer and emits a `timer:complete` event.
-   For all timers, it emits a `timer:tick` event containing the `elapsedMs`, `displayTime`, and (for countdowns) `remainingMs`.

## 4. Public API and State Management

`TimerBehavior` exposes a rich set of methods for controlling and querying its state:

-   `start()`, `stop()`, `pause()`, `resume()`: These methods manipulate the timer's state by adding or closing `TimeSpan` objects in the shared memory, providing robust control over the timer's lifecycle.
-   `isRunning(): boolean`, `isPaused(): boolean`: These methods read from the shared memory to report the current state.
-   `getElapsedMs(): number`, `getTotalElapsed(): number`: These methods provide high-precision elapsed time, with `getTotalElapsed` calculating the total time by summing all `TimeSpan` objects.
-   `getTimeSpans(): TimeSpan[]`: Returns the array of time spans, which is useful for UI components that need to render a detailed history of the timer's activity.
