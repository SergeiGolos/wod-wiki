# Runtime Layer

> **Input:** `IRuntimeBlock` with behaviors  
> **Output:** State changes via block properties, events via `emit()`

## Responsibility

Execute block lifecycle and manage state through block-owned properties.

## Simplified Architecture (Option D)

```mermaid
flowchart LR
    subgraph "Block (Self-Contained)"
        S[State Properties]
        H[Event Handlers]
        L[Lifecycle Methods]
    end
    
    subgraph "Stack"
        P[push/pop]
        O[onChange]
    end
    
    subgraph "UI"
        C[Components]
    end
    
    P --> L
    L --> S
    S --> |emit| H
    H --> C
```

## Block State Properties

| Property | Type | Purpose |
|----------|------|---------|
| `timerState` | `{ elapsed, running, duration }` | Timer tracking |
| `roundState` | `{ current, total }` | Loop progress |
| `fragments` | `ICodeFragment[][]` | Exercise data |

## Events

| Event | Trigger | Handler Use |
|-------|---------|-------------|
| `tick` | Clock interval | Update elapsed time |
| `complete` | Block done | Trigger stack pop |
| `stateChange` | Any mutation | Re-render UI |

## Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created
    Created --> Mounted: mount()
    Mounted --> Running: emit('tick')
    Running --> Complete: markComplete()
    Complete --> Unmounted: unmount()
    Unmounted --> [*]
    
    note right of Unmounted: Clears all handlers
```

## Test Contract

```typescript
// Runtime test - create block directly
const block = new TimerBlock(60000);

block.on('tick', () => {
  if (block.timerState.elapsed >= block.timerState.duration) {
    block.markComplete();
  }
});

block.mount();
block.timerState.elapsed = 60000;
block.emit('tick');

expect(block.isComplete()).toBe(true);
```

## Related Files

- [[02-compiler-layer|Compiler Layer]] (input)
- [[05-ui-layer|UI Layer]] (consumer via events)
- [[../contracts/IRuntimeBlock|IRuntimeBlock]]
