# Runtime Memory Types

This document outlines the items that write to the runtime memory, their schemas, and when they are written.

## Core Runtime

### `execution-record`
- **Key**: `execution-record`
- **Schema**: `ExecutionRecord`
  ```typescript
  interface ExecutionRecord {
      id: string;
      blockId: string;
      parentId: string | null;
      type: string;
      label: string;
      startTime: number;
      endTime?: number;
      status: 'active' | 'completed';
      metrics: any[];
  }
  ```
- **Written By**: `ScriptRuntime`
- **When**:
  - **Allocated**: When a block is pushed onto the stack (`stack.push`).
  - **Updated**: When a block is popped from the stack (`stack.pop`), setting `endTime` and `status`.

### `handler`
- **Key**: `handler`
- **Schema**: `IEventHandler`
- **Written By**: `RegisterEventHandlerAction`
- **When**:
  - **Allocated**: When a block registers an event handler (e.g., `CompletionBehavior`).

## Timer System

### `timer-time-spans`
- **Key**: `timer-time-spans` (Enum: `TIMER_TIME_SPANS`)
- **Schema**: `TimeSpan[]`
  ```typescript
  interface TimeSpan {
      start?: Date;
      stop?: Date;
  }
  ```
- **Written By**: `TimerBehavior`
- **When**:
  - **Allocated**: When `TimerBlock` is pushed (via `TimerBehavior.onPush`).
  - **Updated**: When timer starts, stops, pauses, or resumes.

### `timer-is-running`
- **Key**: `timer-is-running` (Enum: `TIMER_IS_RUNNING`)
- **Schema**: `boolean`
- **Written By**: `TimerBehavior`
- **When**:
  - **Allocated**: When `TimerBlock` is pushed.
  - **Updated**: When timer starts, stops, pauses, or resumes.

## Display System

### `display:stack-state`
- **Key**: `display:stack-state` (Enum: `DISPLAY_STACK_STATE`)
- **Schema**: `IDisplayStackState`
  ```typescript
  interface IDisplayStackState {
      timerStack: ITimerDisplayEntry[];
      cardStack: IDisplayCardEntry[];
      workoutState: 'idle' | 'running' | 'paused' | 'complete';
      currentRound?: number;
      totalRounds?: number;
  }
  ```
- **Written By**:
  - `PushCardDisplayAction` / `PopCardDisplayAction` / `UpdateCardDisplayAction`
  - `PushTimerDisplayAction` / `PopTimerDisplayAction` / `UpdateTimerDisplayAction`
  - `SetWorkoutStateAction`
  - `SetRoundsDisplayAction`
  - `ResetDisplayStackAction`
- **When**:
  - **Allocated**: On first write (usually by `SetWorkoutStateAction` or first display action).
  - **Updated**: Whenever the display stack changes (cards/timers added/removed) or workout state changes.

## Metrics & State

### `metric:reps`
- **Key**: `metric:reps` (Enum: `METRIC_REPS`)
- **Schema**: `number`
- **Written By**: `RoundsBlock`
- **When**:
  - **Allocated**: When `RoundsBlock` is initialized (constructor).
  - **Updated**: When advancing to the next round (`next()`).

### `effort`
- **Key**: `effort`
- **Schema**: `EffortState`
  ```typescript
  interface EffortState {
      exerciseName: string;
      currentReps: number;
      targetReps: number;
  }
  ```
- **Written By**: `EffortBlock`
- **When**:
  - **Allocated**: When `EffortBlock` is mounted.
  - **Updated**: When reps are incremented or set.

### `metric:start-time`
- **Key**: `metric:start-time` (Enum: `METRIC_START_TIME`)
- **Schema**: `number` (Timestamp)
- **Written By**: `HistoryBehavior`
- **When**:
  - **Allocated**: When any block with `HistoryBehavior` is pushed.
