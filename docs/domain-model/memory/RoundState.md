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

### ChildSelectionBehavior

**Lifecycle**: `onMount`, `onNext`

Manages child dispatch and round advancement. On mount, dispatches the first child.
On next, dispatches the next child or loops back / inserts rest intervals.
Writes to both `round` and `children:status` memory.

```typescript
// On mount: initialize round and dispatch first child
ctx.pushMemory('round', [roundFragment]);
// dispatch first child...

// On next: advance round when all children completed
const round = ctx.getMemoryByTag('round');
// increment and update...
```

### ReEntryBehavior (deprecated)

**Lifecycle**: `onMount`

Writes initial round memory. Replaced by `ChildSelectionBehavior`.

### RoundsEndBehavior (deprecated)

**Lifecycle**: `onNext`

Safety net that marks complete if round exceeds total. Replaced by `ExitBehavior`.

## Behaviors That Read Round Memory

### ExitBehavior

**Lifecycle**: `onNext`

Unified completion behavior. Checks if the block is complete (including round exhaustion)
and produces a pop action.

### LabelingBehavior

**Lifecycle**: `onMount`, `onNext`

Updates display memory with formatted round string.

```typescript
const roundDisplay = round.total !== undefined
    ? `Round ${round.current} of ${round.total}`
    : `Round ${round.current}`;
```

### ReportOutputBehavior

**Lifecycle**: `onMount`, `onNext`, `onUnmount`

Emits structured output for round tracking.

| Phase | Output Type | Content |
|-------|-------------|---------|
| `onMount` | `segment` | Initial round info |
| `onNext` | `milestone` | Round advancement notification |
| `onUnmount` | `segment` | Completed rounds summary |

## Usage Example

```typescript
// Create a 5-round looping block
const block = new RuntimeBlock('emom-1', {
    behaviors: [
        new ChildSelectionBehavior(),       // Dispatches children, manages rounds
        new CompletionTimestampBehavior(),   // Records completion timestamp
        new ExitBehavior(),                 // Pops block when complete
        new LabelingBehavior(),             // Updates display with round info
        new ReportOutputBehavior()          // Emits milestone outputs
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

1. `ChildSelectionBehavior` - Initialize state, dispatch children, advance rounds
2. `CompletionTimestampBehavior` - Record completion timestamp
3. `ExitBehavior` - Check for exhaustion, produce pop action
4. `LabelingBehavior` - Update display UI
5. `ReportOutputBehavior` - Emit tracking output

## Related Memory Types

- [`DisplayState`](DisplayState.md) - Contains `roundDisplay` string
- [`CompletionState`](CompletionState.md) - Tracks round-based completion
- [`TimerState`](TimerState.md) - Often combined for timed rounds (EMOM, Tabata)
