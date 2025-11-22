# Runtime Engine Deep Dive

This document provides a comprehensive technical deep dive into the WOD Wiki Runtime Engine. It is intended for developers who need to understand the internal mechanics of how workout scripts are compiled, executed, and managed in memory.

## 1. Core Architecture Overview

The WOD Wiki Runtime Engine is a **stack-based, Just-In-Time (JIT) compiled execution environment** designed specifically for workout definitions. Unlike traditional interpreters that parse and execute line-by-line, this engine compiles parsed statements into executable "Blocks" that manage their own lifecycle, memory, and behaviors.

### Key Components

1.  **ScriptRuntime (`src/runtime/ScriptRuntime.ts`)**: The central orchestrator that holds the stack, memory, and JIT compiler. It manages the event loop and action execution.
2.  **JitCompiler (`src/runtime/JitCompiler.ts`)**: Transforms parsed `CodeStatement` nodes into executable `IRuntimeBlock` instances using a strategy pattern.
3.  **RuntimeStack (`src/runtime/RuntimeStack.ts`)**: A LIFO stack that maintains the current execution context.
4.  **RuntimeMemory (`src/runtime/RuntimeMemory.ts`)**: A linear, reference-based memory system that allows blocks to allocate state and share data (metrics) with other blocks.
5.  **Event System**: A unified event bus where blocks register handlers to react to system events (like `tick`) or user actions.

---

## 2. JIT Compilation Process

The compilation process transforms static AST nodes (`CodeStatement`) into dynamic, executable objects (`IRuntimeBlock`). This happens "Just-In-Time" – typically when a parent block needs to execute a child statement.

### Strategy Pattern

The `JitCompiler` uses a **Strategy Pattern** to determine how to compile a given statement. It iterates through a registered list of `IRuntimeBlockStrategy` implementations. The first strategy that returns `true` for its `match()` method is selected to `compile()` the statement.

### Strategy Precedence

The order of strategies is critical. More specific strategies must be registered before general ones. The current precedence order is:

1.  **TimeBoundRoundsStrategy**: Matches statements with both a Timer AND (Rounds or AMRAP action).
    *   *Example*: `20:00 AMRAP`
2.  **IntervalStrategy**: Matches statements with a Timer AND an "EMOM" action.
    *   *Example*: `EMOM 10`
3.  **TimerStrategy**: Matches statements with a Timer fragment only.
    *   *Example*: `For time: 10:00`
4.  **RoundsStrategy**: Matches statements with a Rounds fragment only.
    *   *Example*: `3 Rounds` or `21-15-9`
5.  **GroupStrategy**: Matches statements that have children (nested statements) but no specific timer/round logic.
    *   *Example*: A grouping of exercises.
6.  **EffortStrategy**: The fallback strategy for simple exercise lines.
    *   *Example*: `10 Pushups`

### Fragment Compilation

Within a strategy, the compiler often needs to extract specific values (like duration, reps, or load) from the statement's fragments. The `FragmentCompilationManager` handles this by converting raw fragments into standardized `MetricValue` objects, which are then used to configure the Block's behaviors.

---

## 3. Runtime Lifecycle

The lifecycle of a Runtime Block is strictly defined to ensure proper memory management and execution flow.

### 1. Construction (Initialization)
*   **When**: During JIT compilation.
*   **Action**: The Block is instantiated.
*   **Memory**: **CRITICAL**. All memory allocation happens here. The block allocates its state (timers, counters) in `RuntimeMemory` via its `BlockContext`.
*   **Handlers**: Event handlers are registered with the memory system.

### 2. Push
*   **When**: A parent block or the runtime pushes the block onto the `RuntimeStack`.
*   **Action**: The block becomes the `current` block (if at the top).
*   **State**: The block is now "active" in the stack.

### 3. Mount
*   **When**: Immediately after being pushed.
*   **Action**: The block's `mount()` method is called.
*   **Return**: Returns a list of initial `IRuntimeAction`s (e.g., pushing a child block, starting a timer).

### 4. Next (Execution Loop)
*   **When**: When a child block completes and pops, the runtime calls `next()` on the *new* top block (the parent).
*   **Action**: The block determines what to do next (e.g., push the next child, increment a round counter, or complete itself).
*   **Return**: Returns `IRuntimeAction[]`.

### 5. Pop
*   **When**: The block completes its work.
*   **Action**: Removed from the `RuntimeStack`.

### 6. Dispose (Cleanup)
*   **When**: **IMMEDIATELY** after popping.
*   **Responsibility**: The **Consumer** (the code that called `pop()`) is responsible for calling `dispose()`.
*   **Action**: The block releases all its memory references.
*   **Importance**: Failure to call `dispose()` results in memory leaks and "zombie" event handlers that continue to fire.

---

## 4. Memory Management System

The `RuntimeMemory` system is a linear storage of `MemoryLocation` objects, accessed via `TypedMemoryReference<T>`.

### Allocation
Blocks allocate memory using `context.allocate<T>(type, initialValue, visibility)`.
*   **Type**: A string identifier (e.g., 'timer', 'reps').
*   **OwnerId**: The ID of the block owning the memory.
*   **Visibility**:
    *   `private`: Only accessible by the owner (default).
    *   `public`: Accessible by child blocks (used for metric inheritance).

### Metric Inheritance
Strategies use the memory system to implement inheritance. For example, an `EffortStrategy` (e.g., "Pushups") looks for a public `METRIC_REPS` value in memory. If a parent `RoundsStrategy` (e.g., "21-15-9") has published the current round's rep count to a public memory slot, the child block reads it.

### Subscriptions 
The memory system supports reactivity.
*   **Global Subscription**: `memory.subscribe()` allows the UI to listen to *all* changes (used for updating the display).
*   **Reference Subscription**: Specific references can be subscribed to, allowing blocks to react to specific state changes.

---

## 5. Event & Action System

The runtime is event-driven.

### Unified Handler Registry
Event handlers are not stored on the blocks themselves but are registered in `RuntimeMemory` as objects with a `handler` type.
When an event occurs (e.g., `tick`), `ScriptRuntime.handle(event)`:
1.  Searches memory for **ALL** active handlers (across the entire stack).
2.  Executes them.
3.  Collects the returned `IRuntimeAction[]`.

### Action Execution
The runtime executes the collected actions in order. Common actions include:
*   `PushAction`: Adds a block to the stack.
*   `PopAction`: Removes the current block.
*   `EmitMetricAction`: Records a metric (e.g., completed rep).
*   `ErrorAction`: Reports a runtime error.

---

## 6. Example Execution Flow

**Script**: `3 Rounds` (containing `10 Pushups`)

1.  **Compile**: `RoundsStrategy` compiles "3 Rounds" into a `RoundsBlock`.
    *   Allocates `currentRound` = 1 in memory.
2.  **Push**: `RoundsBlock` pushed to stack.
3.  **Mount**: `RoundsBlock.mount()` is called.
    *   It decides to start Round 1.
    *   It JIT compiles the child "10 Pushups" using `EffortStrategy`.
    *   Returns `PushAction(EffortBlock)`.
4.  **Push (Child)**: `EffortBlock` pushed to stack.
5.  **Mount (Child)**: `EffortBlock.mount()` called.
    *   Returns empty actions (it's ready to wait for user input).
6.  **User Input**: User clicks "Complete".
7.  **Event**: `complete` event fired.
8.  **Handle**: `EffortBlock`'s handler catches it.
    *   Returns `PopAction`.
9.  **Pop**: `EffortBlock` popped and **disposed**.
10. **Next**: `ScriptRuntime` sees `RoundsBlock` is now top. Calls `RoundsBlock.next()`.
11. **Logic**: `RoundsBlock` increments `currentRound` to 2.
    *   JIT compiles "10 Pushups" again (new instance).
    *   Returns `PushAction(NewEffortBlock)`.
12. ... Repeats until 3 rounds done ...
13. **Completion**: `RoundsBlock` finishes, returns `PopAction` for itself.

---

## 7. Metrics & Analysis Architecture (Proposed)

To support the "Track and Analyze" UI, the runtime needs a robust system for recording execution history and metrics. The current system has the basic types (`ExecutionRecord`, `RuntimeMetric`) but lacks the "glue" to populate them automatically.

### Minimal Requirements for Implementation

To build a clean and succinct tracking system, we propose the following architecture:

#### 1. Centralized Span Tracking in `ScriptRuntime`
The `ScriptRuntime` should be the single source of truth for execution history. It needs to track "Active Spans" corresponding to blocks currently on the stack.

*   **New State**: `activeSpans: Map<string, Partial<ExecutionRecord>>`
*   **Key**: `blockId` (from `BlockKey`)

#### 2. Lifecycle Integration
We hook into the stack operations to manage spans automatically:

*   **On Stack Push**:
    1.  Create a new `ExecutionRecord` entry in `activeSpans`.
    2.  **Start Time**: `Date.now()`.
    3.  **Parent ID**: The ID of the block *previously* at the top of the stack.
    4.  **Label**: Derived from `block.label` (needs to be added to `IRuntimeBlock`) or `block.key`.

*   **On Stack Pop**:
    1.  Retrieve the span from `activeSpans`.
    2.  **End Time**: `Date.now()`.
    3.  **Duration**: `endTime - startTime`.
    4.  **Finalize**: Move the completed `ExecutionRecord` to `ScriptRuntime.executionLog`.

#### 3. Metric Association
Metrics emitted by blocks must be associated with the correct execution span.

*   **Mechanism**: When `EmitMetricAction` is executed:
    1.  Identify the `current` block on the stack.
    2.  Find its corresponding span in `activeSpans`.
    3.  Append the metric to that span's `metrics` array.
*   **Benefit**: Blocks don't need to know about "logs" or "history". They just emit metrics, and the runtime places them in the correct context.

#### 4. Data Structure for UI
The resulting `executionLog` will be a flat array of `ExecutionRecord`s that the UI can easily process:

```typescript
interface ExecutionRecord {
    blockId: string;
    parentId: string | null; // Allows reconstructing the tree
    type: string;            // 'timer', 'rounds', 'effort'
    label: string;           // "Round 1", "Push-ups"
    startTime: number;
    endTime: number;
    metrics: RuntimeMetric[]; // All metrics collected during this span
}
```

### Implementation Checklist

1.  [ ] **Enhance `IRuntimeBlock`**: Add `label: string` property for user-friendly display names.
2.  [ ] **Update `ScriptRuntime`**:
    *   Add `activeSpans` map.
    *   Intercept `stack.push` to start spans.
    *   Intercept `stack.pop` to close spans and push to `executionLog`.
3.  [ ] **Update `EmitMetricAction` Handler**: Modify `ScriptRuntime` to catch this action and attach the metric to the current active span.
4.  [ ] **Expose Log**: Ensure `executionLog` is accessible to the UI (e.g., via a React hook or context).
