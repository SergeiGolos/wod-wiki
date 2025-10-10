# CompletionTrackingBehavior

## 1. Overview

The `CompletionTrackingBehavior` is a specialized `IRuntimeBehavior` whose sole purpose is to monitor the progress of a `ChildAdvancementBehavior` and determine when all child statements within a `RuntimeBlock` have been executed.

It acts as a simple flag that transitions from an incomplete to a complete state, providing a clear and reliable signal that a block has finished its sequential work. This behavior is a crucial part of the composite block pattern, working in tandem with other behaviors to manage the block's lifecycle.

## 2. Composition and Configuration

### Constructor

```typescript
constructor()
```

The behavior has no configuration and is initialized in an incomplete state (`_isComplete = false`).

### State

-   `_isComplete: boolean`: A private flag that tracks the completion status. Once it transitions to `true`, it becomes irreversible for that instance.

## 3. Interaction with the Runtime and Block

### `onNext()` Hook

-   The `onNext` hook is the behavior's only point of interaction with the runtime lifecycle.
-   On each invocation, it attempts to find an instance of `ChildAdvancementBehavior` on the same `RuntimeBlock`.
-   If found, it calls the `isComplete()` method on the `ChildAdvancementBehavior`.
-   It then updates its own internal `_isComplete` flag to match the state of the `ChildAdvancementBehavior`.
-   This effectively synchronizes its completion status with the behavior responsible for advancing through the children.

### Helper Method: `getChildBehavior()`

-   This private method is responsible for locating the `ChildAdvancementBehavior`.
-   It first tries to use the `block.getBehavior()` method, which is the preferred, type-safe way to retrieve a behavior.
-   As a fallback, it will search the `block.behaviors` array directly.

### Public Methods

-   `getIsComplete(): boolean`: Returns the current value of the `_isComplete` flag.
-   `markComplete(): void`: Allows for explicitly setting the behavior to a complete state. This is primarily used for testing or in edge cases where completion needs to be forced.

## 4. Dependencies and Collaboration

`CompletionTrackingBehavior` has a direct and critical dependency:

-   **`ChildAdvancementBehavior`**: It is entirely dependent on the presence and state of a `ChildAdvancementBehavior` on the same `RuntimeBlock`. Without it, `CompletionTrackingBehavior` cannot determine when the block is complete.

Because of this, `CompletionTrackingBehavior` should be placed **after** `ChildAdvancementBehavior` in the `RuntimeBlock`'s behavior array to ensure it can accurately read the state after the advancement logic has run.

### Example Usage

```typescript
const block = new RuntimeBlock(runtime, sourceId, [
    // Must be first to advance the index
    new ChildAdvancementBehavior(children),
    
    // Depends on the child to compile
    new LazyCompilationBehavior(),
    
    // Depends on the completion status of ChildAdvancementBehavior
    new CompletionTrackingBehavior()
]);
```
