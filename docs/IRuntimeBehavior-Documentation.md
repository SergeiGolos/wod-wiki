# IRuntimeBehavior Interface

## 1. Overview and Composition

The `IRuntimeBehavior` interface defines a contract for creating composable, single-responsibility behaviors that can be attached to an `IRuntimeBlock`. This design pattern promotes a clean separation of concerns, enhances testability, and allows for flexible and dynamic runtime functionality without relying on complex inheritance hierarchies.

### Composition

-   **Attachment**: Behaviors are attached to a `RuntimeBlock` by being included in its `behaviors: IRuntimeBehavior[]` array during construction.
-   **Configuration**: Behaviors are highly configurable via their constructors. They can accept parameters such as target metrics, thresholds, or references to other objects, allowing a single behavior class to be used in many different ways.
-   **State**: A behavior can maintain its own internal state (e.g., `currentChildIndex` in `ChildAdvancementBehavior`) or interact with the shared memory of its owner `IRuntimeBlock`.

### Example: Behavior-Based Block

```typescript
// A block is composed of multiple, single-responsibility behaviors
const advancedBlock = new RuntimeBlock(runtime, sourceId, [
    new ParentContextBehavior(parentBlock),
    new ChildAdvancementBehavior(childrenStatements),
    new LazyCompilationBehavior({ enableCaching: true }),
    new CompletionTrackingBehavior()
]);
```

---

## 2. Runtime Lifecycle

`IRuntimeBehavior` provides optional hooks that are called by the owner `IRuntimeBlock` at specific points in its lifecycle. A behavior only needs to implement the hooks relevant to its function.

### Lifecycle Hooks

1.  **`onPush?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`**: Called when the owner block is pushed onto the `RuntimeStack`. This is the ideal place for initialization logic, such as setting up initial state in the block's memory or registering for runtime events. It can return an array of actions to be executed immediately.

2.  **`onNext?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`**: Called during the owner block's `next()` phase. This hook is central to controlling the flow of execution. It can inspect the current state and return actions to advance to a new block, wait, or finish. The runtime iterates through all behaviors and composes their returned actions.

3.  **`onPop?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`**: Called just before the owner block is popped from the stack. This is used for completion logic, such as finalizing calculations, persisting results, or notifying parent blocks.

4.  **`onDispose?(runtime: IScriptRuntime, block: IRuntimeBlock): void`**: Called during the owner block's `dispose()` phase. This is the designated hook for any resource cleanup required by the behavior, such as clearing caches or unregistering listeners.

### Behavior Execution Order

The order of behaviors in the `RuntimeBlock`'s constructor is critical, as it dictates their execution order. Behaviors with dependencies must be placed after the behaviors they depend on. For example, `LazyCompilationBehavior` must come after `ChildAdvancementBehavior` to know which child to compile.

---

## 3. Runtime Allocations

Behaviors participate in the resource management of their owner `IRuntimeBlock`.

### Memory and State

-   **Instance State**: Behaviors can maintain private internal state within their class instance (e.g., a boolean flag or a counter).
-   **Shared State**: For communication between behaviors or with the block itself, behaviors can use the `block.getMemory<T>(key)` and `block.setMemory<T>(key, value)` methods to access the owner block's shared memory.

### Resource Cleanup

-   If a behavior allocates any resources that need explicit cleanup (e.g., starting a timer, caching data), it **must** implement the `onDispose` hook to release them.
-   For example, the `LazyCompilationBehavior` uses `onDispose` to clear its internal `compilationCache` to prevent memory leaks.

---

## 4. Event Registration

Behaviors can both react to and trigger events within the runtime system.

### Registering for Events

-   The `onPush` hook is the standard place for a behavior to register for system-wide events or subscribe to observables.
-   For example, a behavior that tracks workout progress might listen for a `metricUpdated` event from the runtime.

### Emitting Events

-   Behaviors drive runtime events by returning `IRuntimeAction` objects from their lifecycle hooks (`onPush`, `onNext`, `onPop`).
-   The runtime processes these actions, which may in turn cause new events to be emitted, creating a reactive, event-driven flow.

### Unregistering Events

-   To prevent side effects and memory leaks, any event listeners registered in `onPush` must be unregistered in the `onDispose` hook.
