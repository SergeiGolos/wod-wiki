# ParentContextBehavior

## 1. Overview

The `ParentContextBehavior` is a simple but important `IRuntimeBehavior` that provides a `RuntimeBlock` with an awareness of its position within the runtime stack. Its sole function is to hold a reference to the block's parent, enabling communication and data sharing between a child block and its container.

This behavior is essential for creating nested block structures where a child's behavior might depend on the state of its parent. For example, a child block might need to read a metric (like the current round number) from its parent.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(parentContext?: IRuntimeBlock)
```

The behavior is initialized with a single optional parameter:

-   **`parentContext`**: A reference to the `IRuntimeBlock` that is the parent of the block this behavior is attached to. For top-level blocks that have no parent, this parameter is `undefined`.

### State

-   `parentContext: IRuntimeBlock | undefined`: A private, readonly reference to the parent block. This reference is immutable after the behavior is constructed.

## 3. Interaction with the Runtime and Block

### `onPush()` Hook

-   The `onPush` hook is implemented but currently performs no actions (it is a "no-op"). The behavior's primary role is to hold the parent reference, which is established at construction time. No further initialization is needed when the block is pushed to the stack.

### Public Methods

`ParentContextBehavior` provides two simple methods for accessing its state:

-   `getParentContext(): IRuntimeBlock | undefined`: Returns the stored reference to the parent block, or `undefined` if one does not exist.
-   `hasParentContext(): boolean`: A convenience method that returns `true` if a parent context has been provided.

## 4. Dependencies and Collaboration

`ParentContextBehavior` is a self-contained behavior with no dependencies on other behaviors. Its execution order within the `RuntimeBlock`'s behavior array is not critical.

Other blocks or behaviors can retrieve the `ParentContextBehavior` from a block to access the parent.

### Example: Accessing Parent State

A child block could use this behavior to read data from its parent's memory.

```typescript
// In a child block's behavior or method...

const parentContextBehavior = block.getBehavior(ParentContextBehavior);
if (parentContextBehavior?.hasParentContext()) {
    const parent = parentContextBehavior.getParentContext();
    
    // Read a metric from the parent block's memory
    const currentRound = parent.getMemory<number>('currentRound');
    
    console.log(`Executing in Round: ${currentRound}`);
}
```
