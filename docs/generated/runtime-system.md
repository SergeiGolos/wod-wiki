# Runtime System

The runtime system is the core execution engine of WOD Wiki, managing workout script compilation, block lifecycle, and execution flow through a stack-based architecture.

## Overview

The runtime system consists of:

- **ScriptRuntime** - Main runtime orchestrator
- **RuntimeStack** - Stack-based block execution
- **JitCompiler** - Just-in-time compiler for blocks
- **RuntimeMemory** - Typed shared state management
- **RuntimeClock** - Time tracking and span management
- **RuntimeBlock** - Executable block containers
- **Behaviors** - Composable functionality units
- **RuntimeFactory** - Factory for creating runtime instances

## ScriptRuntime

Main orchestrator that manages all runtime dependencies and coordinates execution.

### Constructor

```typescript
constructor(
  script: WodScript,
  compiler: JitCompiler,
  dependencies: ScriptRuntimeDependencies,
  options: RuntimeStackOptions = {}
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|-------|-------------|
| `script` | `WodScript` | Parsed workout script with statements |
| `compiler` | `JitCompiler` | JIT compiler for block creation |
| `dependencies` | `ScriptRuntimeDependencies` | Memory, stack, clock, and event bus |
| `options` | `RuntimeStackOptions` | Configuration options |

**Example:**

```typescript
const factory = new RuntimeFactory(globalCompiler);
const runtime = factory.createRuntime(wodBlock, {
  debugMode: true,
  enableLogging: true
});
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `script` | `WodScript` | Read-only parsed script |
| `memory` | `IRuntimeMemory` | Shared memory system |
| `stack` | `IRuntimeStack` | Block execution stack |
| `clock` | `IRuntimeClock` | Time tracking |
| `eventBus` | `IEventBus` | Event dispatching |
| `jit` | `JitCompiler` | Block compiler |
| `activeSpans` | `ReadonlyMap<string, TrackedSpan>` | Current execution spans |
| `tracker` | `RuntimeReporter` | Metric recording |

### Methods

#### `isComplete(): boolean`

Checks if runtime execution has completed (stack is empty).

**Returns:** `true` if no blocks remain on stack

**Example:**

```typescript
if (runtime.isComplete()) {
  console.log('Workout completed!');
}
```

#### `handle(event: IEvent): void`

Dispatches an event through the event bus.

**Example:**

```typescript
runtime.handle({ type: 'next', source: 'user' });
runtime.handle({ type: 'timer:pause', source: 'button' });
```

#### `pushBlock(block: IRuntimeBlock, options?): IRuntimeBlock`

Pushes a block onto the stack and mounts it.

**Parameters:**
- `block` - The block to push
- `options` - Optional lifecycle timing data

**Returns:** The pushed (potentially wrapped) block

**Example:**

```typescript
const block = new TimerBlock(config);
const pushed = runtime.pushBlock(block, { 
  startTime: new Date() 
});
```

#### `popBlock(options?): IRuntimeBlock | undefined`

Pops the current block from the stack, unmounts it, and disposes it.

**Parameters:**
- `options` - Optional lifecycle timing data

**Returns:** The popped block or `undefined` if stack was empty

**Example:**

```typescript
const completed = runtime.popBlock({ 
  completedAt: new Date() 
});
```

#### `dispose(): void`

Emergency cleanup that disposes all blocks and stops the clock.

**Example:**

```typescript
// Clean up when component unmounts
useEffect(() => {
  return () => runtime.dispose();
}, []);
```

## RuntimeStack

Lightweight stack that maintains block state and notifies subscribers.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `blocks` | `readonly IRuntimeBlock[]` | Top-first view of blocks (copy) |
| `count` | `number` | Number of blocks on stack |
| `current` | `IRuntimeBlock | undefined` | Top block (undefined if empty) |
| `keys` | `BlockKey[]` | Keys of all blocks |
| `updates` | `StackObservable` | Observable for stack changes |

### Methods

#### `push(block: IRuntimeBlock): void`

Adds a block to the stack and notifies observers.

**Example:**

```typescript
stack.push(new TimerBlock(config));
stack.updates.subscribe(update => {
  console.log('Stack changed:', update);
});
```

#### `pop(): IRuntimeBlock | undefined`

Removes and returns the top block from the stack.

**Returns:** The popped block or `undefined`

#### `clear(): void`

Removes all blocks from the stack.

## JitCompiler

Just-In-Time compiler that creates runtime blocks from parsed statements.

### Constructor

```typescript
constructor(
  strategies: IRuntimeBlockStrategy[] = [],
  dialectRegistry?: DialectRegistry
)
```

### Methods

#### `registerStrategy(strategy: IRuntimeBlockStrategy): void`

Registers a custom compilation strategy.

**Example:**

```typescript
const strategy = new CustomStrategy();
compiler.registerStrategy(strategy);
```

#### `compile(nodes: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined`

Compiles statements into an executable block.

**Returns:** Compiled block or `undefined` if compilation fails

**Example:**

```typescript
const block = compiler.compile(statements, runtime);
if (block) {
  runtime.pushBlock(block);
}
```

## RuntimeMemory

Typed shared memory with allocation, search, and subscription support.

### Methods

#### `allocate<T>(type, ownerId, initialValue?, visibility?): TypedMemoryReference<T>`

Allocates a new typed memory location.

**Parameters:**
- `type` - Memory type identifier
- `ownerId` - Owner block ID
- `initialValue` - Optional initial value
- `visibility` - `'public' | 'private' | 'inherited'`

**Returns:** Typed reference to allocated memory

**Example:**

```typescript
const timerRef = memory.allocate<TimeSpan>(
  'timer',
  block.key.toString(),
  undefined,
  'public'
);
```

#### `get<T>(reference): T | undefined`

Retrieves value from a memory reference.

**Example:**

```typescript
const value = memory.get(timerRef);
if (value !== undefined) {
  console.log('Timer:', value);
}
```

#### `set<T>(reference, value): void`

Sets value for a memory reference and notifies subscribers.

**Example:**

```typescript
memory.set(timerRef, {
  start: new Date(),
  stop: undefined
});
```

#### `search(criteria): IMemoryReference[]`

Finds memory references matching criteria.

**Example:**

```typescript
const timers = memory.search({
  type: 'timer',
  visibility: 'public'
});
```

#### `release(reference): void`

Manually releases a memory reference.

**Example:**

```typescript
memory.release(timerRef);
```

## RuntimeClock

Tracks time using spans for accurate elapsed time calculation.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `now` | `Date` | Current wall-clock time |
| `elapsed` | `number` | Total elapsed milliseconds |
| `isRunning` | `boolean` | Whether clock is currently running |
| `spans` | `ReadonlyArray<ClockSpan>` | All time spans tracked |

### Methods

#### `start(): Date`

Starts the clock and returns start timestamp.

**Returns:** Start timestamp

#### `stop(): Date`

Stops the clock and returns stop timestamp.

**Returns:** Stop timestamp

#### `reset(): void`

Clears all time spans.

**Example:**

```typescript
clock.start();
// ... do work ...
clock.stop();
console.log('Elapsed:', clock.elapsed, 'ms');
```

## IRuntimeBlock

Interface for all executable runtime blocks.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `key` | `BlockKey` | Unique identifier |
| `sourceIds` | `number[]` | Source statement IDs |
| `blockType` | `string | undefined` | Type discriminator |
| `label` | `string` | Human-readable label |
| `fragments` | `ICodeFragment[][]` | Fragment groups per execution |
| `context` | `IBlockContext` | Execution context |
| `executionTiming` | `BlockLifecycleOptions` | Start/completion timestamps |

### Methods

#### `mount(runtime, options?): IRuntimeAction[]`

Called when block is pushed to stack. Sets up initial state.

**Returns:** Array of actions to execute after mount

#### `next(runtime, options?): IRuntimeAction[]`

Called when child block completes. Determines next execution.

**Returns:** Array of actions representing next steps

#### `unmount(runtime, options?): IRuntimeAction[]`

Called when block is popped. Handles completion logic.

**Returns:** Array of actions to execute after unmount

#### `dispose(runtime): void`

Cleans up resources. Must handle multiple calls safely.

#### `getBehavior<T>(behaviorType): T | undefined`

Gets a behavior by type.

**Example:**

```typescript
const timerBehavior = block.getBehavior(TimerBehavior);
if (timerBehavior) {
  timerBehavior.pause();
}
```

## IRuntimeBehavior

Generic composable behavior contract for blocks.

### Hooks

| Hook | Parameters | Returns | Description |
|-------|-----------|----------|-------------|
| `onPush?` | `runtime, block, options?` | `IRuntimeAction[]` | Called when block pushed |
| `onNext?` | `runtime, block, options?` | `IRuntimeAction[]` | Called when child completes |
| `onPop?` | `runtime, block, options?` | `IRuntimeAction[]` | Called when block popped |
| `onDispose?` | `runtime, block` | `void` | Called when block disposed |
| `onEvent?` | `event, runtime, block` | `IRuntimeAction[]` | Called on events |

**Example:**

```typescript
class CustomBehavior implements IRuntimeBehavior {
  onPush(runtime, block, options) {
    console.log('Block mounted:', block.label);
    return [];
  }
  
  onEvent(event, runtime, block) {
    if (event.type === 'timer:complete') {
      console.log('Timer completed!');
    }
    return [];
  }
}
```

## RuntimeFactory

Factory for creating ScriptRuntime instances.

### Methods

#### `createRuntime(block, options?): IScriptRuntime | null`

Creates a fully initialized runtime from a WOD block.

**Returns:** Initialized runtime or `null` if block is invalid

**Example:**

```typescript
const factory = new RuntimeFactory(globalCompiler);
const runtime = factory.createRuntime(wodBlock, {
  debugMode: true
});

if (runtime) {
  // Runtime is ready to execute
}
```

#### `disposeRuntime(runtime): void`

Disposes of a runtime and cleans up resources.

## Block Lifecycle

### Constructor-Based Initialization

Blocks initialize during construction, not when pushed:

```typescript
const block = new TimerBlock(config); // ← Initialization here
stack.push(block); // ← Only registration
```

### Consumer-Managed Disposal

When popping blocks, the runtime handles disposal:

```typescript
// Old pattern (no longer needed)
const block = stack.pop();
block.dispose(runtime);

// New pattern (runtime handles it)
runtime.popBlock(); // ← Includes automatic disposal
```

### Lifecycle Sequence

1. **Construction** - Block initializes and allocates resources
2. **Push** - `mount()` called, actions executed
3. **Next** - `next()` called as children complete
4. **Pop** - `unmount()` called, `dispose()` executed
5. **Release** - Context released, resources cleaned

## Performance Requirements

| Operation | Target | Notes |
|-----------|---------|-------|
| Stack push/pop | < 1ms | Frequent operation during execution |
| `current()` access | < 0.1ms | Called on every tick |
| Block disposal | < 50ms | Should handle multiple calls safely |
| JIT compilation | < 100ms | For typical workout scripts |

## Error Handling

Runtime uses typed errors for debugging:

```typescript
export type RuntimeError = {
  type: 'stack_overflow' | 'invalid_block' | 'compilation_failed';
  message: string;
  block?: BlockKey;
  timestamp: Date;
};
```

## See Also

- [Block Types Reference](../block-types-behaviors-reference.md) - All block types and behaviors
- [Runtime Lifecycle](../runtime-action-lifecycle.md) - Detailed lifecycle patterns
- [Fragment Types](./fragment-types.md) - Parsed statement components
