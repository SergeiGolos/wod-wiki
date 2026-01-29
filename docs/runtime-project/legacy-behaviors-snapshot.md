# Legacy Runtime Behaviors Snapshot

> **Snapshot Date:** 2026-01-27
> **Status:** To be removed and replaced with IBehaviorContext-based implementations.

This document serves as a reference for the functionality provided by legacy behaviors before their removal. This logic must be reimplemented using the new `IBehaviorContext` pattern.

## Core Behaviors

### TimerBehavior (`TimerBehavior.ts`)
- **Responsibility:** Manages time tracking, duration, and state (running/paused).
- **Key Features:**
  - Supports 'up' (count-up) and 'down' (countdown) directions.
  - Emits `timer:started` on push and `timer:complete` on pop.
  - Uses `TimerStateManager` helper to sync with memory/observables.
  - Handles pause/resume/reset logic.
  - exposes methods `getElapsedMs`, `getRemainingMs`, `start`, `stop`, `pause`, `resume`.

### BoundLoopBehavior (`BoundLoopBehavior.ts`)
- **Responsibility:** Executes a block for a fixed number of rounds.
- **Key Features:**
  - Uses `onNext` to determine completion.
  - Checks round count against `totalRounds`.
  - Coordinates with `ChildIndexBehavior` and `RoundPerLoopBehavior` to track progress.
  - Emits `TrackRoundAction` for analytics.
  - Marks block complete when rounds exceeded.

### SoundBehavior (`SoundBehavior.ts`)
- **Responsibility:** Triggers audio cues based on timer events.
- **Key Features:**
  - configures cues (threshold, sound file, volume).
  - Listens to `timer:tick` event via `onEvent`.
  - Checks thresholds (remaining time for countdown, elapsed for count-up).
  - Stateful: tracks which cues have triggered to avoid duplicates.
  - Uses `PlaySoundAction`.

### BoundTimerBehavior (`BoundTimerBehavior.ts`)
- **Responsibility:** A wrapper/variation of timer that likely enforces duration limits strictly.
- **Key Features:** Checks for completion in `onNext` or via timer events.

## Loop Coordination

### LoopCoordinatorBehavior (Deprecated Monolith)
- Split into `RoundPerLoop`, `RoundPerNext`, `ChildIndex`, etc.

### RoundPerLoopBehavior (`RoundPerLoopBehavior.ts`)
- Tracks rounds based on child block completion (looping over children).
- Increments round when child index wraps.

### ChildIndexBehavior (`ChildIndexBehavior.ts`)
- Tracks which child block is currently active in a container.
- Increments index on `onNext`.

## Display & Interaction

### RoundDisplayBehavior (`RoundDisplayBehavior.ts`)
- Updates UI memory with current round information (e.g., "Round 1/5").
- Reads memory from other behaviors to format strings.

### CompletionBehavior (`CompletionBehavior.ts`)
- Simple behavior that marks a block complete immediately or after condition.

### PopOnNextBehavior (`PopOnNextBehavior.ts`)
- Marks block complete immediately on `next()` call. Used for simple instructions/pause blocks that advance on user click.

## State & Flow

### WorkoutFlowStateMachine (`WorkoutFlowStateMachine.ts`)
- Manages high-level workout state (Preview, Running, Paused, Finished).

### HistoryBehavior (`HistoryBehavior.ts`)
- Records finished blocks to workout history.

---

## Migration Plan

All behaviors must be rewritten to implement `IBehaviorContext`:

1.  **Remove** `onPush`, `onPop`, `onEvent`.
2.  **Implement** `onMount(ctx)`:
    - Initialize logic.
    - `ctx.subscribe('tick', ...)` for timer logic.
    - `ctx.setMemory(...)` for state.
    - `ctx.emitOutput('segment', ...)` for start logs.
3.  **Implement** `onNext(ctx)`:
    - Handle iteration logic.
    - `ctx.emitOutput('segment', ...)` for new rounds.
4.  **Implement** `onUnmount(ctx)`:
    - `ctx.emitOutput('completion', ...)` for final results.
    - Cleanup happens automatically.

## References
Files located in `src/runtime/behaviors` (deleted in next step).
