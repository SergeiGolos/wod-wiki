# Runtime Logic Overview

This document outlines the internal logic of the runtime system, focusing on how blocks are executed, how rounds are tracked, and what data is recorded.

## 1. Round Steps Calculation

Round tracking is primarily managed by the `LoopCoordinatorBehavior`. This behavior is attached to blocks that need to execute children multiple times (e.g., Rounds, EMOM, AMRAP).

### State Tracking
The `LoopCoordinatorBehavior` maintains a `LoopState` with three key properties:
- **`index`**: The total number of times `next()` has been called on this coordinator. Starts at -1.
- **`position`**: The current index within the list of child groups. Calculated as `index % childGroups.length`.
- **`rounds`**: The number of fully completed rounds. Calculated as `Math.floor(index / childGroups.length)`.

### Round Advancement
When `onNext()` is called (typically via the 'tick' event or user action):
1. `index` is incremented.
2. `position` and `rounds` are recalculated.
3. If `position === 0`, it signifies the start of a new round (or the very first round).
4. The coordinator checks if the total required rounds (if any) have been completed.

## 2. Child Step Execution

The `LoopCoordinatorBehavior` is responsible for determining and executing the next child block.

### Execution Flow
1. **Determine Child Group**: Using the current `position`, the coordinator looks up the corresponding array of statement IDs from `config.childGroups`.
2. **JIT Compilation**: The statement IDs are resolved to code statements and compiled Just-In-Time (JIT) into a new `RuntimeBlock`.
3. **Push to Stack**: A `PushBlockAction` is returned, which instructs the runtime to push this new child block onto the execution stack.
4. **Execution**: The runtime then focuses on this new child block. The parent (coordinator) waits until the child completes and is popped off the stack before `onNext()` is called again.

## 3. Record Creation

The runtime creates specific records in memory to track execution history and state.

### Execution Records (`execution-record`)
Created by `LoopCoordinatorBehavior` to track rounds and intervals.
- **Trigger**: Created at the start of each round (when `position === 0`).
- **Structure**:
  ```typescript
  {
    id: string;          // Unique ID (e.g., "block-123-round-1")
    blockId: string;     // ID of the parent block
    parentId: string;    // ID of the parent block
    type: 'round' | 'interval';
    label: string;       // e.g., "Round 1" or "Interval 1"
    startTime: number;   // Timestamp
    status: 'active';    // Current status
    metrics: [];         // Array for associated metrics
  }
  ```
- **Lifecycle**: When a round ends (next round starts or block pops), the previous record is updated with `endTime` and `status: 'completed'`.

### Metric Records (`metrics`)
Created by `HistoryBehavior` (and potentially others) to track performance data.
- **Trigger**: Created when a block is pushed onto the stack.
- **Structure**:
  ```typescript
  {
    startTime: {
      value: number;
      unit: 'ms';
      sourceId: string;
    }
    // Other metrics like heart rate, power, etc. can be added here
  }
  ```

## 4. Memory Association

Different components allocate specific types of memory to maintain state and history.

| Component | Memory Type | Visibility | Purpose |
|-----------|-------------|------------|---------|
| `LoopCoordinatorBehavior` | `execution-record` | `public` | Tracks round/interval progress and history. |
| `TimerBehavior` | `timer-state` | `public` | Stores current timer state (elapsed time, running status, spans). |
| `RuntimeBlock` | `handler` | `private` | Stores registered event handlers (tick, dispatchers). |
| `HistoryBehavior` | `metrics` | `public` | Stores execution metrics (start time, etc.). |
| `BlockContext` | *Variable* | `private`/`public` | Stores local variables and context-specific data. |

## 5. Event Handlers

Blocks register event handlers to respond to runtime events.

### Default Handlers
Every `RuntimeBlock` automatically registers:
- **`TickHandler`**: Listens for the `tick` event. If the block is the current active block, it calls `this.next()`, effectively advancing the block's state.
- **`EventDispatcher`**: Listens for all events. If the block is active, it routes the event to the `onEvent` method of all its attached behaviors.

### Behavior-Specific Handlers
- **`TimerBehavior`**:
  - Emits `timer:started`, `timer:tick`, `timer:complete`.
  - Does not typically register *listeners* but drives the system via `setInterval` and event emission.
- **`CompletionBehavior`**:
  - Can be configured to listen for specific events (e.g., `timer:complete`, `children:complete`) to trigger block completion.
  - Emits `block:complete` when the condition is met.

### Lifecycle Events
- **`onPush`**: Called when block enters the stack.
- **`onPop`**: Called when block leaves the stack.
- **`onNext`**: Called to advance state (driven by `TickHandler`).
