# Block Memory System

The WOD Wiki runtime uses a **list-based memory** system to store state within runtime blocks. Every memory value is an `ICodeFragment[]` stored in a `MemoryLocation` identified by a `MemoryTag`. Multiple locations with the same tag can coexist on the same block.

## Memory Types

| Type | Key | Description | Documentation |
|------|-----|-------------|---------------|
| Timer | `'timer'` | Time tracking with spans for pause/resume | [TimerState](TimerState.md) |
| Round | `'round'` | Iteration counter for loops | [RoundState](RoundState.md) |
| Children Status | `'children:status'` | Child dispatch tracking | [ChildrenStatusState](ChildrenStatusState.md) |
| Display | `'display'` | UI presentation state | [DisplayState](DisplayState.md) |
| Fragment | `'fragment'` | Raw fragment groups | [FragmentState](FragmentState.md) |
| Fragment Display | `'fragment:display'` | Display-resolved fragments | [FragmentDisplayState](FragmentDisplayState.md) |
| Completion | `'completion'` | Block completion tracking | [CompletionState](CompletionState.md) |
| Controls | `'controls'` | UI button configurations | [ButtonsState](ButtonsState.md) |

## Architecture

### Memory Location Interface

All memory is stored in `IMemoryLocation` instances:

```typescript
interface IMemoryLocation {
    /** Discriminator tag — multiple locations can share the same tag */
    readonly tag: MemoryTag;

    /** The fragment data stored at this location */
    readonly fragments: ICodeFragment[];

    /** Subscribe to changes at this location */
    subscribe(listener: (newValue: ICodeFragment[], oldValue: ICodeFragment[]) => void): () => void;

    /** Update the fragments at this location */
    update(fragments: ICodeFragment[]): void;

    /** Dispose of this location and notify subscribers */
    dispose(): void;
}
```

### Memory Tags

```typescript
type MemoryTag =
    | 'time'                // Time tracking (span fragments)
    | 'timer'               // Legacy timer state
    | 'round'               // Iteration counter
    | 'children:status'     // Child dispatch tracking
    | 'completion'          // Block completion
    | 'display'             // UI presentation
    | 'controls'            // Button configurations
    | 'fragment'            // Raw fragment groups
    | 'fragment:display'    // Display-resolved fragments
    | 'fragment:promote'    // Inherited by child blocks
    | 'fragment:rep-target' // Rep target fragments
    | 'fragment:result'     // Collected on block pop
    | 'fragment:tracked'    // Internal tracking state
    | 'fragment:label'      // Label fragments
    | 'fragment:next';      // Preview of next child
```

### Fragment Visibility Tiers

Fragment-namespaced tags (`fragment:*`) are classified into visibility tiers:

| Tier | Tags | Purpose |
|------|------|---------|
| `display` | `fragment:display` | Shown on UI cards |
| `result` | `fragment:result` | Block output collected on pop |
| `promote` | `fragment:promote`, `fragment:rep-target` | Inherited by child blocks |
| `private` | `fragment:tracked`, `fragment:label` | Internal behavior state |

### Reactive Subscriptions

Memory locations support reactive subscriptions for UI updates:

```typescript
const loc = block.getMemoryByTag('time')[0];
const unsubscribe = loc.subscribe((newFrags, oldFrags) => {
    // React to fragment changes
    updateUI(newFrags);
});

// Clean up
unsubscribe();
```

### Disposal Notification

When a memory location is disposed, subscribers receive `([], lastFragments)`:

```typescript
loc.subscribe((newFrags, oldFrags) => {
    if (newFrags.length === 0 && oldFrags.length > 0) {
        console.log('Memory location disposed');
    }
});
```

## Behavior Context API

Behaviors interact with memory through `IBehaviorContext`:

```typescript
interface IBehaviorContext {
    // Primary API (list-based)
    pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation;
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
    updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void;
    
    // Deprecated shims (typed, single-value)
    /** @deprecated */ getMemory<K extends MemoryType>(key: K): MemoryValueOf<K> | undefined;
    /** @deprecated */ setMemory<K extends MemoryType>(key: K, value: MemoryValueOf<K>): void;
    
    markComplete(reason: string): void;
}
```

## Type Safety (Legacy API)

The deprecated typed memory API provides compile-time type safety:

```typescript
// TypeScript knows this returns TimerState | undefined
const timer = ctx.getMemory('timer');

// TypeScript enforces correct value shape
ctx.setMemory('round', {
    current: 1,
    total: 5
});
```

## Memory Type Registry (Legacy)

```typescript
type MemoryType = 'timer' | 'round' | 'children:status' | 'fragment' | 'fragment:display' | 'completion' | 'display' | 'controls';

interface MemoryTypeMap {
    timer: TimerState;
    round: RoundState;
    'children:status': ChildrenStatusState;
    fragment: FragmentState;
    'fragment:display': FragmentDisplayState;
    completion: CompletionState;
    display: DisplayState;
    controls: ButtonsState;
}
```

## Behavior Lifecycle

Behaviors interact with memory at specific lifecycle points:

| Lifecycle | Purpose | Common Memory Operations |
|-----------|---------|--------------------------|
| `onMount` | Block initialization | Push initial memory locations |
| `onNext` | Advance/iteration | Update counters, check completion |
| `onUnmount` | Cleanup | Record history, close spans |
| `subscribe` | Event handling | React to ticks, user actions |

## File Locations

- **Memory Location**: `src/runtime/memory/MemoryLocation.ts`
- **Type Definitions**: `src/runtime/memory/MemoryTypes.ts`
- **Visibility Classification**: `src/runtime/memory/FragmentVisibility.ts`
- **Behaviors**: `src/runtime/behaviors/`
- **Context Interface**: `src/runtime/contracts/IBehaviorContext.ts`
