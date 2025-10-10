# LazyCompilationBehavior

## 1. Overview

The `LazyCompilationBehavior` is a performance-oriented `IRuntimeBehavior` that implements a Just-In-Time (JIT) compilation strategy for child blocks. Instead of compiling all child `CodeStatement` objects at once, this behavior compiles them one by one, on-demand, as the parent `RuntimeBlock` advances.

This approach significantly improves startup performance for complex blocks with many children, as the compilation cost is spread across the block's execution time. It is a key component in the composite block pattern, translating declarative `CodeStatement` objects into executable `IRuntimeBlock` instances.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(enableCaching: boolean = false)
```

The behavior can be configured with a single optional parameter:

-   **`enableCaching`**: A boolean that determines whether compiled blocks should be cached in memory. Caching can improve performance for blocks that are executed multiple times (e.g., in a loop), but it increases memory consumption. It defaults to `false`.

### State

-   `compilationCache?: Map<number, IRuntimeBlock>`: If caching is enabled, this map stores compiled `IRuntimeBlock` instances, using the child's index as the key.

## 3. Interaction with the Runtime and Block

### `onNext()` Hook

This is the primary hook where the compilation logic resides:

1.  **Get Child**: It first retrieves the `ChildAdvancementBehavior` to identify the current child `CodeStatement` that needs to be compiled.
2.  **Check Cache**: If caching is enabled, it checks if a block for the current index already exists in the `compilationCache`. If found, it returns a `PushBlockAction` with the cached block, avoiding recompilation.
3.  **Compile**: If the block is not cached (or caching is disabled), it calls the `runtime.jit.compile()` method, passing the current child statement.
4.  **Handle Result**: 
    -   On successful compilation, it receives a new `IRuntimeBlock`.
    -   It logs the success and, if enabled, stores the new block in the cache.
    -   It then returns a `PushBlockAction` containing the newly compiled block. This action instructs the `RuntimeStack` to push the new child block onto the stack, making it the currently executing block.
5.  **Handle Failure**: If the JIT compiler throws an error or returns `undefined`, it logs the failure. (Note: The current implementation returns an empty array, but a future version is intended to return an `ErrorRuntimeBlock`).

### `onDispose()` Hook

-   If caching is enabled, the `onDispose` hook is implemented to clear the `compilationCache`. This is a critical memory management step to ensure that the cached blocks are released when the parent block is disposed.

## 4. Dependencies and Collaboration

`LazyCompilationBehavior` has a strong dependency on another behavior:

-   **`ChildAdvancementBehavior`**: It is critically dependent on `ChildAdvancementBehavior` to provide the `CodeStatement` for the current execution step. It uses `getChildBehavior()` to get a reference to its sibling behavior and calls `getCurrentChild()` to get the necessary data.

Due to this dependency, `LazyCompilationBehavior` must be placed **after** `ChildAdvancementBehavior` in the `RuntimeBlock`'s behavior array. This ensures that the child index has already been advanced before the compilation logic attempts to retrieve the current child.
