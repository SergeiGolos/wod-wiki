# WOD Wiki Runtime Actions: An Architectural Analysis

## Executive Summary and Introduction

The WOD Wiki runtime engine is designed around a declarative and composable architecture. A core component of this design is the `IRuntimeAction` interface, which implements a variation of the Command design pattern. This system decouples the *decision* to perform an action, made within a behavior, from the *execution* of that action, which is handled by the runtime. `IRuntimeBehavior` implementations do not modify the runtime state directly; instead, they return an array of `IRuntimeAction` objects. The runtime then processes this array, executing each action in sequence. This report provides a detailed analysis of the `IRuntimeAction` interface, its concrete implementations, the execution lifecycle, and the architectural principles it enables.

## Action Execution Orchestration

The execution of actions is a fundamental aspect of the runtime's control flow. The process follows a clear, sequential pattern orchestrated by the `IScriptRuntime` instance:

1.  **Action Creation**: During a block's lifecycle event (`push`, `next`, or `pop`), the `IRuntimeBlock` invokes the corresponding hook on its associated behaviors (e.g., `behavior.onNext()`).
2.  **Action Return**: Each behavior's hook returns an array of `IRuntimeAction` instances. These arrays are aggregated into a single list of actions to be performed.
3.  **Action Execution**: The runtime iterates through the aggregated list of actions and calls the `do(runtime)` method on each one, passing a reference to itself as the sole argument.

This mechanism ensures that all actions have a consistent execution context and access to the runtime's core services, such as the execution stack (`runtime.stack`). The action's `do` method encapsulates the logic required to perform a single, discrete operation, thereby modifying the runtime state in a predictable and traceable manner.

## Analysis of Concrete IRuntimeAction Implementations

The runtime action system is composed of a set of concrete classes that manage stack operations, timer state, and event handling. The following are existing and proposed actions to create a fully declarative system.

### PushBlockAction

The `PushBlockAction` is responsible for compiling a set of code statements and adding the resulting block to the execution stack, making it the current active block.

*   **Purpose**: To compile one or more `ICodeStatement` objects using the JIT compiler and push the resulting `IRuntimeBlock` onto the execution stack. This moves the responsibility of compilation into the action itself.
*   **Constructor**:
    ```typescript
    constructor(public readonly statements: ICodeStatement[])
    ```
    -   **`statements`**: An array of `ICodeStatement` objects to be compiled and then executed.
*   **Execution (`do` method)**:
    1.  Validates that a `runtime.stack` and `runtime.jit` compiler are available.
    2.  Invokes the JIT compiler to transform the `statements` into a new `IRuntimeBlock`: `const newBlock = runtime.jit.compile(this.statements, runtime);`
    3.  Pushes the `newBlock` onto the `runtime.stack`.
    4.  Invokes the `push()` method on the `newBlock` to trigger its initialization behaviors.
    5.  The actions returned by the block's `push()` method are then executed immediately.

### PopBlockAction

The `PopBlockAction` is responsible for removing the current block from the execution stack.

*   **Purpose**: To finalize the execution of the current `IRuntimeBlock`, perform necessary cleanup, and signal that the runtime can proceed.
*   **Constructor**:
    ```typescript
    constructor(public readonly timestamp: Date)
    ```
    -   **`timestamp`**: A `Date` object indicating when the action was created, for logging and auditing.
*   **Execution (`do` method)**:
    1.  Validates that a block exists on the stack to be popped.
    2.  Calls the `pop()` method on the current block to retrieve any final actions.
    3.  Removes the block from the `runtime.stack`.
    4.  Performs critical cleanup on the popped block by calling its `dispose()` method and `context.release()`.
    5.  Executes the final actions returned from the block's `pop()` method.

### NextBlockAction

The `NextBlockAction` explicitly triggers the progression logic of the current block on the stack.

*   **Purpose**: To invoke the `next()` method on the current block, which typically advances its internal state (e.g., round counter, child index) and returns subsequent actions.
*   **Constructor**:
    ```typescript
    constructor(public readonly timestamp: Date)
    ```
    -   **`timestamp`**: A `Date` object for logging and auditing.
*   **Execution (`do` method)**:
    1.  Retrieves the `current` block from the `runtime.stack`.
    2.  If a block exists, it calls `currentBlock.next()`.
    3.  Executes any actions returned by the `next()` method.

### StartTimerAction

A declarative action to begin a new time span in a timer's memory.

*   **Purpose**: To record the start time of an interval without the behavior needing to manipulate memory directly.
*   **Constructor**:
    ```typescript
    constructor(
        public readonly memoryRef: TypedMemoryReference<TimeSpan[]>,
        public readonly timeStamp: Date
    )
    ```
    -   **`memoryRef`**: A reference to the `TimeSpan[]` array in runtime memory.
    -   **`timeStamp`**: The precise `Date` object to use as the start time.
*   **Execution (`do` method)**:
    1.  Retrieves the current array of time spans from `memoryRef`.
    2.  Adds a new `{ start: this.timeStamp, stop: undefined }` object to the array.
    3.  Sets the updated array back into the `memoryRef`.

### StopTimerAction

A declarative action to close the currently open time span.

*   **Purpose**: To record the stop time of an interval.
*   **Constructor**:
    ```typescript
    constructor(
        public readonly memoryRef: TypedMemoryReference<TimeSpan[]>,
        public readonly timeStamp: Date
    )
    ```
    -   **`memoryRef`**: A reference to the `TimeSpan[]` array in runtime memory.
    -   **`timeStamp`**: The precise `Date` object to use as the stop time.
*   **Execution (`do` method)**:
    1.  Retrieves the time spans array from `memoryRef`.
    2.  Finds the last time span in the array that has an undefined `stop` value.
    3.  Sets the `stop` property to `this.timeStamp`.
    4.  Sets the updated array back into the `memoryRef`.

### RegisterEventAction

A declarative action to register a new event handler with the runtime's event system.

*   **Purpose**: To dynamically add an event listener to the runtime.
*   **Constructor**:
    ```typescript
    constructor(public readonly handler: IEventHandler)
    ```
    -   **`handler`**: An object conforming to the `IEventHandler` interface, containing the logic to execute when an event is matched.
*   **Execution (`do` method)**:
    1.  Calls the runtime's event manager to add the handler: `runtime.events.register(this.handler)`.

### UnregisterEventAction

A declarative action to remove a dynamically registered event handler.

*   **Purpose**: To tear down a temporary event listener that is no longer needed.
*   **Constructor**:
    ```typescript
    constructor(public readonly handler: IEventHandler)
    ```
    -   **`handler`**: The specific `IEventHandler` instance to be removed.
*   **Execution (`do` method)**:
    1.  Calls the runtime's event manager to remove the handler: `runtime.events.unregister(this.handler)`.

## Architectural Patterns and Design Principles

The `IRuntimeAction` system embodies several key architectural principles that enhance the robustness and maintainability of the runtime.

*   **Declarative Control Flow**: Behaviors declare *what* should happen, not *how* it should happen. By returning a `PushBlockAction`, a behavior states its intent to add a child block, leaving the complex mechanics of stack manipulation and lifecycle invocation to the action and runtime.
*   **Separation of Concerns**: The logic for making a decision (the behavior) is cleanly separated from the logic for executing the decision (the action). This allows for more focused, testable, and reusable components.
*   **Transactional Integrity**: While not fully transactional, the action-based system provides a more controlled and predictable way of modifying runtime state compared to allowing behaviors to directly call runtime methods. Error handling is centralized within the `do` method of each action.
*   **Extensibility**: The system is highly extensible. New types of runtime operations can be introduced by simply creating a new class that implements the `IRuntimeAction` interface, without needing to modify the behaviors or the core runtime loop.

## Conclusion and Strategic Recommendations

The current `IRuntimeAction` architecture provides a powerful and flexible foundation for managing runtime execution flow. It consists of two well-defined actions, `PushBlockAction` and `PopBlockAction`, that capably handle all stack manipulation logic.

However, the analysis of the broader behavior system reveals an opportunity for enhancement. Currently, behaviors emit events directly and imperatively via `runtime.handle()`. To align fully with the declarative principles of the action system, the following is recommended:

**Recommendation: Create a Declarative `EmitEventAction`**

A new `EmitEventAction` should be introduced to encapsulate event emission.

*   **Proposed Constructor**:
    ```typescript
    constructor(public readonly eventName: string, public readonly eventData: any)
    ```
*   **Proposed `do` Method**:
    ```typescript
    do(runtime: IScriptRuntime): void {
        runtime.handle({
            name: this.eventName,
            timestamp: new Date(),
            data: this.eventData,
        });
    }
    ```

Adopting this action would allow behaviors to become purely declarative, returning a list of all intended outcomes—stack changes and event emissions—as a single, unified result. This would further improve the traceability and testability of the system, creating a fully event-sourced and command-driven runtime architecture.