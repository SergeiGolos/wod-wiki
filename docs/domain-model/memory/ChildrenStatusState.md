# ChildrenStatusState Memory

The `children:status` memory type tracks the dispatch state of child blocks within a parent looping block.

## Type Definition

```typescript
interface ChildrenStatusState {
    /** Index of the next child to dispatch (0-based) */
    readonly childIndex: number;
    
    /** Total number of child groups */
    readonly totalChildren: number;
    
    /** True when all child groups have been dispatched at least once */
    readonly allExecuted: boolean;
    
    /** True when all dispatched children have completed (popped) */
    readonly allCompleted: boolean;
}
```

## Memory Key

- **Key**: `'children:status'`
- **Value Type**: `ChildrenStatusState`

## Purpose

Parent blocks with children (e.g., EMOM, Tabata, multi-round WODs) need to track
which children have been dispatched and whether they've completed. This enables:

- Sequential child dispatch (one at a time)
- Loop detection (all children executed → advance round)
- Completion detection (all children completed → block can finish)

## Behaviors That Write Children Status

### ChildSelectionBehavior

**Lifecycle**: `onMount`, `onNext`

The primary behavior managing child dispatch. On mount, dispatches the first child
and initializes the status. On next (when a child completes), advances to the next
child or loops back.

```typescript
// On mount: dispatch first child
ctx.pushMemory('children:status', [...]);  // childIndex: 0

// On next: advance to next child
// If childIndex >= totalChildren → allExecuted = true, loop or complete
```

## Usage in Completion Logic

```typescript
// Check if all children have been executed this round
const statusLocs = ctx.getMemoryByTag('children:status');
if (statusLocs.length > 0) {
    const status = /* read from fragments */;
    if (status.allCompleted) {
        // All children done — advance round or complete block
    }
}
```

## Relationship to Rounds

Children status and round state work together:

```
Round 1:
  child 0 → dispatched → completed
  child 1 → dispatched → completed
  allExecuted: true → advance to Round 2

Round 2:
  child 0 → dispatched → completed
  child 1 → dispatched → completed
  allExecuted: true → advance to Round 3 (or complete if total reached)
```

## Related Memory Types

- [`RoundState`](RoundState.md) - Round counter advanced when all children complete
- [`CompletionState`](CompletionState.md) - Block completes when rounds exhausted
- [`DisplayState`](DisplayState.md) - Round display updated on child transitions

## Source Files

- `src/runtime/memory/MemoryTypes.ts`
- `src/runtime/behaviors/ChildSelectionBehavior.ts`
