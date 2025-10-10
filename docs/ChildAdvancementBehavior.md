# ChildAdvancementBehavior

## 1. Overview

The `ChildAdvancementBehavior` is a core `IRuntimeBehavior` responsible for managing the sequential execution of nested (child) `CodeStatement` objects within a `RuntimeBlock`. Its primary function is to track the current position in a list of child statements and advance to the next one each time the block's `next()` method is called.

This behavior is fundamental for any block that contains other blocks, such as a "Rounds" or "Effort" block, as it provides the mechanism for stepping through the children one by one.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(children: CodeStatement[])
```

The behavior is initialized with an array of `CodeStatement` objects. This array represents the children of the `RuntimeBlock` that this behavior is attached to. The constructor freezes the array to make it immutable, ensuring a predictable sequence.

### State

-   `currentChildIndex: number`: A private field that holds the 0-based index of the next child to be executed. It starts at `0`.
-   `children: ReadonlyArray<CodeStatement>`: The immutable list of child statements to be executed.

## 3. Interaction with the Runtime and Block

### `onNext()` Hook

This is the only lifecycle hook implemented by `ChildAdvancementBehavior`. Its role is simple but critical:

1.  **Check for Completion**: It first checks if it has already processed all children by comparing `currentChildIndex` to `children.length`. If it is complete, it returns an empty array, signaling that it has no further actions.
2.  **Advance Index**: If not complete, it increments `currentChildIndex`.
3.  **Return No Actions**: It returns an empty `IRuntimeAction[]` array. It does not create new blocks itself; its sole responsibility is to advance the index. The actual compilation of the child statement is handled by another behavior, typically `LazyCompilationBehavior`.

### Public Methods

`ChildAdvancementBehavior` provides several public methods that other behaviors can use to query its state:

-   `getCurrentChildIndex(): number`: Returns the current index.
-   `getChildren(): ReadonlyArray<CodeStatement>`: Returns the full list of child statements.
-   `isComplete(): boolean`: Returns `true` if all children have been processed. This is crucial for `CompletionTrackingBehavior`.
-   `getCurrentChild(): CodeStatement | undefined`: Returns the child statement at the *current* index. This is the primary method used by `LazyCompilationBehavior` to know which statement to compile next.

## 4. Dependencies and Collaboration

`ChildAdvancementBehavior` is a team player and is designed to work in concert with other behaviors:

-   **`LazyCompilationBehavior`**: This behavior depends directly on `ChildAdvancementBehavior`. In the `onNext` phase, after `ChildAdvancementBehavior` increments its index, `LazyCompilationBehavior` calls `getCurrentChild()` to get the statement it needs to compile into a `RuntimeBlock`.
-   **`CompletionTrackingBehavior`**: This behavior monitors the `isComplete()` method of `ChildAdvancementBehavior` to determine when the block has finished executing all its children.

Due to these dependencies, `ChildAdvancementBehavior` must be placed **before** `LazyCompilationBehavior` and `CompletionTrackingBehavior` in the `RuntimeBlock`'s behavior array.
