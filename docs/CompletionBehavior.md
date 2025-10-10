# CompletionBehavior

## 1. Overview

The `CompletionBehavior` is a versatile `IRuntimeBehavior` that provides a generic and configurable mechanism for detecting when a `RuntimeBlock` has completed its work. Its core functionality revolves around a user-provided condition function, which it evaluates at specific points in the runtime lifecycle to determine if the block should be marked as complete.

This behavior is highly flexible and can be used for a wide variety of completion scenarios, from simple counter-based conditions to complex, event-driven state checks.

## 2. Composition and Configuration

### Constructor

```typescript
constructor(
    private readonly condition: (runtime: IScriptRuntime, block: IRuntimeBlock) => boolean,
    private readonly triggerEvents?: string[]
)
```

The behavior is configured with two main parameters:

1.  **`condition`**: A function that takes the `IScriptRuntime` and the owner `IRuntimeBlock` as arguments and returns a `boolean`. When this function returns `true`, the behavior marks the block as complete.
2.  **`triggerEvents`** (Optional): An array of event names (strings). If provided, the behavior will re-evaluate its `condition` function whenever one of these events is detected by the `onEvent` hook.

### State

-   `isCompleteFlag: boolean`: A private flag that is set to `true` once the `condition` is met. It prevents the condition from being re-evaluated after completion.

## 3. Interaction with the Runtime and Block

### `onNext()` Hook

-   The `onNext` hook is the primary trigger for the behavior. Each time the owner block's `next()` method is called, this hook evaluates the `condition` function.
-   If the condition returns `true`, the behavior sets its internal `isCompleteFlag` and, importantly, emits a `block:complete` event via the `runtime.handle()` method. This event signals to the rest of the system that the block has finished.

### `onEvent()` Hook

-   If the `triggerEvents` array was provided to the constructor, the `onEvent` hook becomes active.
-   It checks if the name of an incoming event is included in the `triggerEvents` list.
-   If it is, the behavior re-evaluates its `condition` function, providing a way for the block to complete based on external events, not just its own `next()` cycle.

### Public Methods

-   `isComplete(): boolean`: Returns the current value of the `isCompleteFlag`.
-   `reset(): void`: Resets the `isCompleteFlag` to `false`. This is primarily used for testing or in scenarios where a block might be reused.

## 4. Usage and Scenarios

`CompletionBehavior` can be adapted to many different use cases.

### Example: Rounds-Based Completion

For a block that should complete after a certain number of rounds, the `condition` could check a counter in the block's memory.

```typescript
// Inside a RoundsStrategy
const behaviors = [
    new CompletionBehavior((runtime, block) => {
        const currentRound = block.getMemory<number>('currentRound') || 0;
        const totalRounds = block.getMemory<number>('totalRounds') || 0;
        return currentRound >= totalRounds;
    })
];
```

### Example: Event-Driven Completion

For a block that should complete when a specific external event occurs, such as a user clicking a "Finish" button.

```typescript
const behaviors = [
    new CompletionBehavior(
        (runtime, block) => {
            // The condition could check for a flag set by the event handler
            return block.getMemory<boolean>('userFinished') === true;
        },
        ['user:finish_button_clicked'] // Trigger event
    )
];
```
