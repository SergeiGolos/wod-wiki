# FragmentState Memory

The `fragment` memory type stores a collection of code fragments that should be inherited by child blocks in the runtime hierarchy.

## Type Definition

```typescript
interface FragmentState {
    /** Collection of fragments to be passed down */
    readonly fragments: readonly ICodeFragment[];
}
```

## Memory Key

- **Key**: `'fragment'`
- **Value Type**: `FragmentState`
- **Concrete Class**: `FragmentMemory` (extends `BaseMemoryEntry`)

## ICodeFragment Model

Fragments represent parsed workout elements:

```typescript
interface ICodeFragment {
    type: string;                    // Fragment subtype (e.g., 'duration', 'count')
    fragmentType: FragmentType;      // Category enum (Timer, Rounds, Reps, etc.)
    value: number | string;          // Parsed value
    image: string;                   // Original text representation
    origin: 'parser' | 'runtime';    // Where the fragment came from
}
```

## Purpose

Fragment memory enables **metric inheritance** in the block hierarchy:

- Parent blocks can define metrics (reps, weight, effort zones)
- Child blocks inherit these fragments without re-parsing
- Runtime can override or augment inherited fragments

## FragmentMemory API

```typescript
class FragmentMemory extends BaseMemoryEntry<'fragment', FragmentState> {
    constructor(initialFragments: ICodeFragment[] = []);
    
    /** Adds a fragment to the collection */
    addFragment(fragment: ICodeFragment): void;
    
    /** Clears all fragments */
    clear(): void;
    
    /** Sets the entire collection of fragments */
    setFragments(fragments: ICodeFragment[]): void;
}
```

## Behaviors That Work With Fragment Memory

### SegmentOutputBehavior

**Lifecycle**: `onMount`, `onUnmount`

Uses fragments from the block for output tracking.

```typescript
// Gets fragments from block (which may come from fragment memory)
const fragments = ctx.block.fragments?.flat() ?? [];

ctx.emitOutput('segment', fragments as ICodeFragment[], {
    label: ctx.block.label
});
```

### TimerOutputBehavior

**Lifecycle**: `onMount`, `onUnmount`

Creates timer-specific fragments for output.

```typescript
// Creates a duration fragment from timer state
const fragments: ICodeFragment[] = [];
if (timer?.durationMs) {
    fragments.push({
        type: 'duration',
        fragmentType: FragmentType.Timer,
        value: timer.durationMs,
        image: formatDuration(timer.durationMs),
        origin: 'parser'
    });
}

ctx.emitOutput('segment', fragments, { label: timer?.label });
```

### RoundOutputBehavior

**Lifecycle**: `onMount`, `onNext`, `onUnmount`

Creates round-specific fragments for output.

```typescript
ctx.emitOutput('milestone', [
    {
        type: 'count',
        fragmentType: FragmentType.Rounds,
        value: round.current,
        image: `Round ${round.current} of ${round.total}`,
        origin: 'runtime'
    }
], { label });
```

## Usage Example

```typescript
// Create a parent block with inherited fragments
const fragmentMemory = new FragmentMemory([
    { 
        type: 'count', 
        fragmentType: FragmentType.Reps, 
        value: 10, 
        image: '10', 
        origin: 'parser' 
    },
    { 
        type: 'weight', 
        fragmentType: FragmentType.Load, 
        value: 135, 
        image: '135#', 
        origin: 'parser' 
    }
]);

// Child blocks can access these fragments through the hierarchy
```

## Fragment Inheritance Pattern

```
┌─────────────────────────────────────┐
│  EMOM Block                         │
│  fragment: [10 reps, 135#]          │
├─────────────────────────────────────┤
│  ├── Timer Block (Round 1)          │
│  │   inherits: [10 reps, 135#]      │
│  │                                  │
│  ├── Timer Block (Round 2)          │
│  │   inherits: [10 reps, 135#]      │
│  │                                  │
│  └── Timer Block (Round 3)          │
│      inherits: [10 reps, 135#]      │
└─────────────────────────────────────┘
```

## Related Memory Types

- [`TimerState`](./TimerState.md) - Timer fragments for output
- [`RoundState`](./RoundState.md) - Round fragments for output
