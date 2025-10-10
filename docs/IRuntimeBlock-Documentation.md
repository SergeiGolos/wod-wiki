# IRuntimeBlock Interface

## 1. Overview and Composition

The `IRuntimeBlock` interface is the central execution unit within the WOD runtime. Each block represents a specific instruction or a set of nested instructions from the workout script. Blocks are instantiated and managed by the runtime stack.

### Composition

An `IRuntimeBlock` is composed of the following properties:

-   `key: BlockKey`: A unique identifier for the block instance, used for tracking, debugging, and caching.
-   `sourceIds: number[]`: An array of numbers that link the block back to its original line(s) in the WOD script.
-   `blockType?: string`: An optional type discriminator (e.g., "Timer", "Rounds") used for UI rendering and logging.
-   `behaviors: IRuntimeBehavior[]`: An array of composable behaviors that define the block's lifecycle logic.

Blocks are compiled from `CodeStatement` objects by `IRuntimeBlockStrategy` implementations, which are registered with the `JitCompiler`.

---

## 2. Runtime Lifecycle

The `IRuntimeBlock` has a well-defined lifecycle that is managed by the `RuntimeStack` and the consuming application.

### Lifecycle Phases

1.  **Construction**: A block is created by a strategy. At this stage, its fundamental properties and behaviors are defined.

2.  **Push**: The `push(): IRuntimeAction[]` method is invoked when the block is pushed onto the `RuntimeStack`. This phase is for setting up the initial state, registering event listeners, and executing any `onPush` hooks from its behaviors. It returns an array of actions to be executed immediately.

3.  **Next**: The `next(): IRuntimeAction[]` method is called when a child block completes its execution. This is the primary method for advancing the workout's state. The block determines the next logical step—which could be executing the next child, finishing, or waiting for an event—and returns an array of corresponding runtime actions. This phase triggers the `onNext` hooks on all attached behaviors.

4.  **Pop**: The `pop(): IRuntimeAction[]` method is invoked just before the block is removed from the `RuntimeStack`. This is where completion logic, such as finalizing metrics or updating parent state, is executed. It triggers the `onPop` hooks on its behaviors.

5.  **Dispose**: The `dispose(): void` method must be called by the consumer after a block is popped. This is a critical cleanup phase for releasing all resources held by the block, such as event listeners, timers, or cached data. It triggers the `onDispose` hooks on its behaviors.

### Example Flow

```
1. Strategy compiles CodeStatement -> new RuntimeBlock(...)
2. stack.push(block) -> block.push() is called
3. ... runtime executes, eventually calls ...
4. block.next() -> determines next action
5. ... block finishes, is popped ...
6. poppedBlock = stack.pop() -> block.pop() is called
7. poppedBlock.dispose() -> block.dispose() is called for cleanup
```

---

## 3. Runtime Allocations

Resource management is a critical responsibility of an `IRuntimeBlock` to prevent memory leaks and ensure stable execution.

### Memory Management

-   **State**: Blocks can hold internal state. For shared state between behaviors, the `RuntimeBlock` provides `getMemory<T>(key: string)` and `setMemory<T>(key: string, value: T)` methods.
-   **Caching**: Blocks (or their behaviors) may cache compiled children or other expensive computations. This cache must be cleared during the `dispose` phase.

### Resource Cleanup

The `dispose()` method is the designated place for all resource cleanup. Implementations **must** handle:

-   **Event Listeners**: Unregistering any listeners registered during the `push` phase.
-   **Timers**: Clearing any `setInterval` or `setTimeout` instances.
-   **References**: Releasing references to parent blocks, child blocks, or other objects to prevent memory leaks.
-   **Caches**: Clearing any internal caches.

Failure to implement `dispose()` correctly can lead to performance degradation and application instability.

---

## 4. Event Registration

`IRuntimeBlock` instances are event-driven and interact with the runtime through actions and registered event handlers.

### Registering for Events

-   **`push()` Phase**: The `push()` method is the primary hook for registering event listeners with the runtime or other services. For example, a `TimerBlock` would register for a global `tick` event.
-   **`IRuntimeBehavior`**: Behaviors can also register for events within their `onPush` hook.

### Emitting Events

-   Blocks and their behaviors return `IRuntimeAction[]` arrays from their lifecycle methods (`push`, `next`, `pop`). These actions are processed by the runtime and can result in events being emitted to the system.

### Unregistering Events

-   **`dispose()` Phase**: It is mandatory to unregister all event listeners during the `dispose()` phase to ensure the block is fully garbage collected and to prevent unintended side effects.
