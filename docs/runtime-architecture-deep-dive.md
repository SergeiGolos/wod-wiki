# Runtime Architecture Deep Dive

This document provides a detailed overview of the WOD Wiki runtime architecture, focusing on the JIT compiler, Runtime Stack, and Memory Management system. It explains how these components work together to support different workout modes and how they connect to the UI.

## Core Architecture

The runtime is built on a **Stack-based JIT Compilation** model.

### 1. JIT Compiler (`src/runtime/JitCompiler.ts`)

The JIT (Just-In-Time) Compiler is responsible for transforming the parsed Abstract Syntax Tree (AST) into executable `IRuntimeBlock` instances.

-   **Strategy Pattern**: The compiler uses a collection of `IRuntimeBlockStrategy` implementations.
-   **Precedence**: Strategies are registered in a specific order. The first strategy that `match()`es a set of statements is used to `compile()` them.
-   **On-Demand Compilation**: Blocks are compiled only when needed (lazy compilation), allowing for dynamic behavior and efficient resource usage.
-   **Metric Inheritance**: Strategies search the `RuntimeMemory` for "public" metrics exposed by parent blocks (e.g., a `RoundsBlock` exposing a `rounds` metric that a child `TimerBlock` might need).

### 2. Runtime Stack (`src/runtime/RuntimeStack.ts`)

The execution flow is managed by a stack of `IRuntimeBlock`s.

-   **Push/Pop Model**: Blocks are pushed onto the stack when they start execution and popped when they complete.
-   **Lifecycle Management**:
    -   **Construction**: Blocks initialize their memory and event handlers in their constructor.
    -   **Mount**: Called when a block is pushed. Returns initial `IRuntimeAction`s.
    -   **Next**: Called when a child block completes. Determines the next step (e.g., repeat child, move to next sibling, or complete self).
    -   **Dispose**: **Critical**. The consumer (ScriptRuntime) must call `dispose()` on a block after popping it to release memory references.

### 3. Runtime Memory (`src/runtime/RuntimeMemory.ts`)

The memory system is a linear storage of typed references, decoupling state from logic.

-   **Typed References**: `TypedMemoryReference<T>` ensures type safety for memory access.
-   **Ownership & Visibility**:
    -   `ownerId`: Links memory to a specific block (usually via `BlockKey`).
    -   `visibility`: `public` (accessible by children/strategies) or `private` (internal state).
-   **Reactivity**: The memory system supports subscriptions. UI components and other blocks can subscribe to changes in specific memory locations.
-   **Search**: The `search()` method allows finding memory references based on criteria (type, owner, visibility), enabling the "Metric Inheritance" mechanism.

## Workout Mode Support

The architecture supports various workout modes through specialized Blocks and Strategies:

| Mode | Strategy | Block | Behavior |
| :--- | :--- | :--- | :--- |
| **AMRAP** | `TimeBoundRoundsStrategy` | `TimeBoundRoundsBlock` | Combines a Timer and a Round counter. Runs until time expires. |
| **EMOM** | `IntervalStrategy` | `IntervalBlock` | Timer that resets every interval. |
| **For Time** | `TimerStrategy` | `TimerBlock` | Simple timer that counts up or down. |
| **Rounds** | `RoundsStrategy` | `RoundsBlock` | Repeats a sequence of children for a fixed number of rounds. |
| **Effort** | `EffortStrategy` | `EffortBlock` | Basic unit of work (e.g., "10 pushups"). |

## UI Connection & Debugging

The UI connects to the runtime primarily through the **Memory System**.

### Timer UI Binding

The Timer UI does *not* poll the runtime. Instead, it subscribes to memory references.

1.  **Subscription**: The UI component (e.g., `WorkoutTimer`) receives a `TypedMemoryReference` (e.g., for `elapsedTime` or `remainingTime`).
2.  **Updates**: When the runtime updates the memory value (e.g., on every tick), the memory system notifies subscribers.
3.  **Re-render**: The React component updates its state and re-renders efficiently.

### Debug View (Stack & Heap)

A specialized Debug View can visualize the internal state of the runtime:

-   **Stack View**: Iterates through `runtime.stack.blocks` to show the current hierarchy of active blocks.
-   **Heap View**: Iterates through `runtime.memory._references` (exposed via a getter or debug method) to show all allocated memory, its values, owners, and visibility.

This separation allows for powerful debugging and visualization tools without coupling the UI tightly to the execution logic.
