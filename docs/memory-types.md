# Runtime Memory Types

This document outlines the items that write to the runtime memory, their schemas, and when they are written.
The memory model has been simplified into four core categories: `displaystack`, `timers`, `handlers`, and `metrics`.

## 1. Display Stack

### `displaystack`
- **Key**: `displaystack` (Enum: `DISPLAY_STACK`)
- **Schema**: `string[]` (List of Block IDs)
- **Written By**:
  - `TimerBlock` (via `PushStackItemAction` / `PopStackItemAction`)
  - `RoundsBlock`
  - `EffortBlock`
- **When**:
  - **Allocated**: When the first block pushes itself onto the display stack.
  - **Updated**: When blocks are mounted (push) or unmounted (pop). The last item in the list is considered the "active" context for display purposes.

## 2. Timers

### `timer:<blockId>`
- **Key**: `timer:<blockId>` (Enum: `TIMER_PREFIX` + blockId)
- **Schema**: `TimerState`
  ```typescript
  interface TimerState {
      blockId: string;
      label: string;
      format: 'up' | 'down' | 'time'; // 'time' for AMRAP/For Time
      durationMs?: number;
      card?: {
          title: string;
          subtitle: string;
      };
      spans: {
          start: number;
          stop?: number;
          state: 'new' | 'reported';
      }[];
      isRunning: boolean;
  }
  ```
- **Written By**: `TimerBehavior`
- **When**:
  - **Allocated**: When `TimerBlock` is pushed.
  - **Updated**: When timer starts, stops, pauses, or resumes.

## 3. Handlers

### `handler:<id>`
- **Key**: `handler:<id>` (Enum: `HANDLER_PREFIX` + id)
- **Schema**: `IEventHandler`
- **Written By**: `RegisterEventHandlerAction`
- **When**:
  - **Allocated**: When a block registers an event handler (e.g., `CompletionBehavior`).

## 4. Metrics

### `metrics:current`
- **Key**: `metrics:current` (Enum: `METRICS_CURRENT`)
- **Schema**: `CurrentMetrics`
  ```typescript
  interface CurrentMetrics {
      [key: string]: {
          value: number;
          unit: string;
          sourceId: string;
      };
  }
  ```
- **Written By**:
  - `RoundsBlock` (reps)
  - `EffortBlock` (reps)
  - `HistoryBehavior` (startTime)
- **When**:
  - **Allocated**: On first metric write.
  - **Updated**:
    - `reps`: Updated by `RoundsBlock` on round change or `EffortBlock` on rep increment.
    - `startTime`: Updated by `HistoryBehavior` on block push.
    - Other metrics can be added dynamically.

## Legacy / Internal

### `execution-record`
- **Key**: `execution-record`
- **Schema**: `ExecutionRecord`
- **Written By**: `ScriptRuntime`
- **When**:
  - **Allocated**: When a block is pushed onto the stack.
  - **Updated**: When a block is popped.
