# RoundState Memory

The `round` memory type stores iteration/round counter state for looping workout blocks.

## Type Definition

```typescript
interface RoundState {
    /** Current round number (typically 1-based) */
    readonly current: number;
    
    /** Total number of rounds planned (undefined for unbounded) */
    readonly total: number | undefined;
}
```

## Memory Key

- **Key**: `'round'`
- **Value Type**: `RoundState`
- **Concrete Class**: `RoundMemory` (extends `BaseMemoryEntry`)

## Behaviors That Write Round Memory

### RoundInitBehavior

**Lifecycle**: `onMount`

Initializes round state when a looping block is mounted.

```typescript
ctx.setMemory('round', {
    current: config.startRound ?? 1,    // Starting round (default: 1)
    total: config.totalRounds           // undefined for unbounded loops
});
```

**Configuration**:
```typescript
interface RoundInitConfig {
    totalRounds?: number;    // undefined = infinite rounds
    startRound?: number;     // defaults to 1
}
```

### RoundAdvanceBehavior

**Lifecycle**: `onNext`

Increments the round counter when `next()` is called on the block. Round advancement is signaled through memory update, not events.

```typescript
const round = ctx.getMemory('round');
ctx.setMemory('round', {
    current: round.current + 1,
    total: round.total
});
// No event emission - round advancement is observable through memory
```

**Note**: Use `RoundOutputBehavior` to emit `milestone` outputs for round tracking.

## Behaviors That Read Round Memory

### RoundCompletionBehavior

**Lifecycle**: `onNext`

Checks if rounds are exhausted and marks block complete. Completion is signaled through `markComplete()`, not events.

```typescript
const round = ctx.getMemory('round');

// Mark complete when current exceeds total
if (round.total !== undefined && round.current > round.total) {
    ctx.markComplete('rounds-complete');
}
```

> **Note**: Should run AFTER `RoundAdvanceBehavior` in the behavior chain. No events are emitted—completion reason is stored in CompletionState memory.

### RoundDisplayBehavior

**Lifecycle**: `onMount`, `onNext`

Updates display memory with formatted round string.

```typescript
const roundDisplay = round.total !== undefined
    ? `Round ${round.current} of ${round.total}`
    : `Round ${round.current}`;

ctx.setMemory('display', { ...display, roundDisplay });
```

### RoundOutputBehavior

**Lifecycle**: `onMount`, `onNext`, `onUnmount`

Emits structured output for round tracking.

| Phase | Output Type | Content |
|-------|-------------|---------|
| `onMount` | `segment` | Initial round info |
| `onNext` | `milestone` | Round advancement notification |
| `onUnmount` | `completion` | Completed rounds summary |

### HistoryRecordBehavior

**Lifecycle**: `onUnmount`

Records round execution data to workout history.

```typescript
const round = ctx.getMemory('round');
if (round) {
    record.completedRounds = round.current - 1;
    record.totalRounds = round.total;
}
```

**Events Emitted**: `history:record`

## Usage Example

```typescript
// Create a 5-round EMOM block
const block = new RuntimeBlock('emom-1', {
    behaviors: [
        new RoundInitBehavior({ totalRounds: 5 }),
        new RoundAdvanceBehavior(),
        new RoundCompletionBehavior(),
        new RoundDisplayBehavior(),
        new RoundOutputBehavior()
    ]
});
```

## Bounded vs Unbounded Loops

| Configuration | `total` Value | Completion |
|---------------|---------------|------------|
| `5x` (5 rounds) | `5` | Completes when `current > 5` |
| `:` (unbounded) | `undefined` | Never auto-completes |

## Behavior Ordering

For correct round management, behaviors should be ordered:

1. `RoundInitBehavior` - Initialize state
2. `RoundAdvanceBehavior` - Increment counter
3. `RoundCompletionBehavior` - Check for exhaustion
4. `RoundDisplayBehavior` - Update UI
5. `RoundOutputBehavior` - Emit tracking output

## Related Memory Types

- [`DisplayState`](DisplayState.md) - Contains `roundDisplay` string
- [`CompletionState`](CompletionState.md) - Tracks round-based completion
- [`TimerState`](TimerState.md) - Often combined for timed rounds (EMOM, Tabata)
