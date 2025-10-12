# Analysis of Core Runtime Interfaces

This document provides a detailed breakdown of the core interfaces that define the WOD Wiki runtime architecture. For each interface, it lists all public properties and methods, including their parameters and types, as a reference for development and architectural review.

---

## IScriptRuntime

Represents the central runtime engine, providing access to all major subsystems.

### Properties

- `readonly script: WodScript`
  - The parsed workout script being executed.

- `readonly memory: IRuntimeMemory`
  - The main memory manager for the runtime.

- `readonly stack: RuntimeStack`
  - The execution stack that manages the hierarchy of active blocks.

- `readonly jit: JitCompiler`
  - The Just-In-Time compiler for creating runtime blocks from code statements.

### Methods

- `handle(event: IEvent): void`
  - The central entry point for processing all runtime events.

---

## IRuntimeBlock

Represents a single, executable block on the runtime stack, such as a timer or a set of rounds.

### Properties

- `readonly key: BlockKey`
  - A unique identifier for the block instance.

- `readonly sourceIds: number[]`
  - An array of numbers linking the block to its position in the original source script.

- `readonly blockType?: string`
  - An optional string discriminator for identifying the block's type (e.g., 'Timer', 'Rounds').

### Methods

- `push(): IRuntimeAction[]`
  - Called when the block is pushed onto the stack. It should perform initialization and return any initial actions.

- `next(): IRuntimeAction[]`
  - Called when a child block completes, signaling this block to process its next state.

- `pop(): IRuntimeAction[]`
  - Called just before the block is popped from the stack, used for finalization logic.

- `dispose(): void`
  - Called by the consumer after the block is popped to clean up all resources.

---

## IRuntimeBehavior

A composable behavior that attaches logic to an `IRuntimeBlock`'s lifecycle hooks.

### Methods

- `onPush?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`
  - Logic to execute when the owning block is pushed to the stack.

- `onNext?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`
  - Logic to execute when the owning block's `next()` method is called.

- `onPop?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[]`
  - Logic to execute when the owning block is about to be popped from the stack.

---

## IRuntimeAction

A declarative command object that represents a single operation to be performed by the runtime.

### Properties

- `type: string`
  - The type of action to perform (e.g., 'push-block').

- `target?: string`
  - An optional identifier for the target of the action.

- `payload?: unknown`
  - Optional data associated with the action.

### Methods

- `do(runtime: IScriptRuntime): void`
  - Executes the action within the provided runtime context.

---

## IRuntimeMemory

The main interface for managing the runtime's state, separate from the execution stack.

### Methods

- `allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private'): TypedMemoryReference<T>`
  - Allocates a new memory location and returns a typed reference to it.

- `get<T>(reference: TypedMemoryReference<T>): T | undefined`
  - Retrieves the value from a given memory reference.

- `set<T>(reference: TypedMemoryReference<T>, value: T): void`
  - Sets the value for a given memory reference.

- `search(criteria: Nullable<IMemoryReference>): IMemoryReference[]`
  - Searches for memory references matching the given criteria.

- `release(reference: IMemoryReference): void`
  - Manually releases a memory reference.

---

## IBlockContext

Provides a memory allocation scope for a single `IRuntimeBlock`.

### Properties

- `readonly ownerId: string`
  - The unique ID of the block that owns this context.

- `readonly references: ReadonlyArray<IMemoryReference>`
  - A list of all memory references allocated by this context.

### Methods

- `allocate<T>(type: string, initialValue?: T, visibility?: 'public' | 'private'): TypedMemoryReference<T>`
  - Allocates memory scoped to this block context.

- `get<T>(type: string): TypedMemoryReference<T> | undefined`
  - Gets the first memory reference of a specific type within this context.

- `getAll<T>(type: string): TypedMemoryReference<T>[]`
  - Gets all memory references of a specific type within this context.

- `release(): void`
  - Releases all memory references that were allocated by this context.

- `isReleased(): boolean`
  - Returns `true` if the context has been released.

---

## TypedMemoryReference<T>

A class that provides a strongly-typed handle to a location in runtime memory.

### Properties

- `readonly id: string`
- `readonly ownerId: string`
- `readonly type: string`
- `visibility: "public" | "private"`

### Methods

- `get(): T | undefined`
  - Retrieves the value from the memory location.

- `set(value: T): void`
  - Sets the value in the memory location.

- `subscribe(callback: (newValue: T | undefined, oldValue: T | undefined) => void, options?: SubscriptionOptions): () => void`
  - Subscribes to changes in the memory value. Returns an unsubscribe function.

- `unsubscribe(subscriptionId: string): void`
  - Removes a subscription.

- `hasSubscribers(): boolean`
  - Checks if there are any active subscribers.

---

## IEventHandler

An interface for handling runtime events and producing actions.

### Properties

- `readonly id: string`
  - A unique identifier for the handler.

- `readonly name: string`
  - A human-readable name for logging and debugging.

### Methods

- `handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse`
  - The main method that processes an event and returns a response, which may include actions to perform.
