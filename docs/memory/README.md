# Block Memory System

The WOD Wiki runtime uses a typed memory system to store state within runtime blocks. Each memory type has a specific purpose and is managed by dedicated behaviors.

## Memory Types

| Type | Key | Description | Documentation |
|------|-----|-------------|---------------|
| Timer | `'timer'` | Time tracking with spans for pause/resume | [TimerState](./TimerState.md) |
| Round | `'round'` | Iteration counter for loops | [RoundState](./RoundState.md) |
| Display | `'display'` | UI presentation state | [DisplayState](./DisplayState.md) |
| Fragment | `'fragment'` | Inherited code fragments | [FragmentState](./FragmentState.md) |
| Completion | `'completion'` | Block completion tracking | [CompletionState](./CompletionState.md) |
| Controls | `'controls'` | UI button configurations | [ControlsState](./ControlsState.md) |

## Architecture

### Memory Entry Interface

All memory entries implement `IMemoryEntry<T, V>`:

```typescript
interface IMemoryEntry<T extends string, V> {
    readonly type: T;
    readonly value: V;
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void;
}
```

### Reactive Subscriptions

Memory entries support reactive subscriptions for UI updates:

```typescript
const unsubscribe = memoryEntry.subscribe((newValue, oldValue) => {
    // React to changes
    console.log(`Changed from ${oldValue} to ${newValue}`);
});

// Clean up
unsubscribe();
```

### Disposal Notification

When a memory entry is disposed, subscribers receive `(undefined, lastValue)`:

```typescript
memoryEntry.subscribe((newValue, oldValue) => {
    if (newValue === undefined) {
        console.log('Memory entry disposed');
    }
});
```

## Behavior Context API

Behaviors interact with memory through `IBehaviorContext`:

```typescript
interface IBehaviorContext {
    // Get memory value (read)
    getMemory<K extends MemoryType>(key: K): MemoryValueOf<K> | undefined;
    
    // Set memory value (write)
    setMemory<K extends MemoryType>(key: K, value: MemoryValueOf<K>): void;
    
    // Mark block as complete
    markComplete(reason: string): void;
}
```

## Type Safety

The memory system provides compile-time type safety:

```typescript
// TypeScript knows this returns TimerState | undefined
const timer = ctx.getMemory('timer');

// TypeScript enforces correct value shape
ctx.setMemory('round', {
    current: 1,
    total: 5
});

// Type error: 'invalid' is not a valid key
ctx.setMemory('invalid', { foo: 'bar' }); // ❌
```

## Memory Type Registry

```typescript
type MemoryType = 'timer' | 'round' | 'fragment' | 'completion' | 'display' | 'controls';

interface MemoryTypeMap {
    timer: TimerState;
    round: RoundState;
    fragment: FragmentState;
    completion: CompletionState;
    display: DisplayState;
    controls: ControlsState;
}
```

## Behavior Lifecycle

Behaviors interact with memory at specific lifecycle points:

| Lifecycle | Purpose | Common Memory Operations |
|-----------|---------|--------------------------|
| `onMount` | Block initialization | Write initial state |
| `onNext` | Advance/iteration | Update counters, check completion |
| `onUnmount` | Cleanup | Record history, close spans |
| `subscribe` | Event handling | React to ticks, user actions |

## File Locations

- **Type Definitions**: `src/runtime/memory/MemoryTypes.ts`
- **Memory Entries**: `src/runtime/memory/`
- **Behaviors**: `src/runtime/behaviors/`
- **Context Interface**: `src/runtime/contracts/IBehaviorContext.ts`
