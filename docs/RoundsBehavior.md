# RoundsBehavior

## 1. Overview

The `RoundsBehavior` is a specialized `IRuntimeBehavior` designed to manage blocks that are structured around a specific number of rounds, such as "For Time" or "AMRAP" workouts. It handles the logic for tracking the current round, advancing from one round to the next, and determining when all rounds are complete.

It also supports variable repetition schemes (e.g., the classic 21-15-9 pattern), making it a versatile tool for building complex workout structures.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(
    private readonly totalRounds: number,
    private readonly repScheme?: number[]
)
```

The behavior is configured with two parameters:

1.  **`totalRounds`**: The total number of rounds the block will execute. This must be a number greater than or equal to 1.
2.  **`repScheme`** (Optional): An array of numbers representing a variable number of repetitions for each round. If provided, the length of this array **must** match the `totalRounds`.

### State

-   `currentRound: number`: A private field that holds the current round number (1-indexed).
-   `memoryRef?: string`: A reference to a location in the runtime's shared memory where the behavior stores its public state.

## 3. Interaction with the Runtime and Block

### `onPush()` Hook

-   When the block is pushed, this hook initializes the round tracking.
-   It sets `currentRound` to `1`.
-   It allocates a shared memory space using `runtime.memory.allocate()`. This is a crucial step, as it makes the round state (current round, total rounds) available to other parts of the system, including the UI and other blocks.

### `onNext()` Hook

-   This hook is called when the children of the current round complete their execution.
-   It increments the `currentRound` counter.
-   It updates the shared memory with the new `currentRound` and `completedRounds` values.
-   It then checks if all rounds are complete (`currentRound > totalRounds`).
    -   If complete, it emits a `rounds:complete` event.
    -   If not complete, it emits a `rounds:changed` event with the new round information.

### `onDispose()` Hook

-   To prevent memory leaks, the `onDispose` hook releases the memory that was allocated during the `onPush` phase by calling `runtime.memory.release()`.

### Public Methods

-   `getCurrentRound(): number`: Returns the current 1-indexed round number.
-   `getTotalRounds(): number`: Returns the total configured rounds.
-   `isComplete(): boolean`: Returns `true` if all rounds have been executed.
-   `getCompilationContext()`: This is a key method that provides round-specific data to the JIT compiler. When a child block is being compiled, it can receive this context, which includes the current round number and a function (`getRepsForCurrentRound`) to get the specific rep count for the current round if a `repScheme` is being used.

## 4. Dependencies and Collaboration

`RoundsBehavior` is designed to work as part of a composite block. It doesn't directly depend on other specific behaviors, but it relies on the runtime structure:

-   **Runtime Memory**: It depends on the `runtime.memory` service to allocate and release its shared state.
-   **Runtime Events**: It uses the `runtime.handle()` method to emit events that signal its progress.
-   **JIT Compiler**: It provides contextual data to the `JITCompiler`, influencing how child blocks are created.
-   **Child Blocks**: It implicitly relies on the completion of child blocks to trigger its `onNext` hook, signaling that it's time to advance to the next round.
