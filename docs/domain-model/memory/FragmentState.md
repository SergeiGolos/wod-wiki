# FragmentState Memory

The `fragment` memory type stores collections of code fragments organized into semantic groups that can be inherited by child blocks in the runtime hierarchy.

## Type Definition

```typescript
interface FragmentState {
    /** Fragment groups — each inner array is a semantic group (e.g., per-round fragments) */
    readonly groups: readonly (readonly ICodeFragment[])[];
}
```

## Memory Key

- **Key**: `'fragment'`
- **Value Type**: `FragmentState`

## ICodeFragment Model

Fragments represent parsed workout elements:

```typescript
interface ICodeFragment {
    type: string;                    // Fragment subtype (e.g., 'duration', 'count')
    fragmentType: FragmentType;      // Category enum (Duration, Rounds, Rep, etc.)
    value?: unknown;                 // Parsed value
    image?: string;                  // Original text representation
    origin?: FragmentOrigin;         // Where the fragment came from
    sourceBlockKey?: string;         // Block that created this fragment
    timestamp?: Date;                // When created (runtime fragments)
}
```

## Purpose

Fragment memory enables **metric inheritance** in the block hierarchy:

- Parent blocks can define metrics (reps, weight, effort zones)
- Child blocks inherit these fragments without re-parsing
- Runtime can override or augment inherited fragments

### Fragment Groups

Fragment groups represent semantic groupings from compilation (e.g., per-round,
per-interval). Each inner array is one group produced by the fragment distributor.
This preserves the multi-dimensional structure through the entire pipeline:

```
Parser → Strategy → BlockBuilder → FragmentMemory → RuntimeBlock
```

## Behaviors That Work With Fragment Memory

### FragmentPromotionBehavior

**Lifecycle**: `onMount`, `onNext`

Promotes fragments from parent to child blocks. On mount, reads parent fragment
memory and pushes promoted fragments to child. On next, dynamically updates
promoted fragments for the next child.

### ReportOutputBehavior

**Lifecycle**: `onMount`, `onUnmount`

Uses fragments from the block for output tracking.

```typescript
// Gets fragments from block memory
const displayLocs = ctx.block.getFragmentMemoryByVisibility('display');
const fragments = displayLocs.flatMap(loc => loc.fragments);

ctx.emitOutput('segment', fragments, { label: ctx.block.label });
```

## Usage Example

```typescript
// Fragment groups preserve per-round structure
const fragmentState: FragmentState = {
    groups: [
        // Group 0: round 1 fragments
        [
            { fragmentType: FragmentType.Rep, value: 10, type: 'rep', image: '10', origin: 'parser' },
            { fragmentType: FragmentType.Resistance, value: { amount: 135, units: '#' }, type: 'resistance', image: '135#', origin: 'parser' }
        ],
        // Group 1: round 2 fragments
        [
            { fragmentType: FragmentType.Rep, value: 8, type: 'rep', image: '8', origin: 'parser' },
            { fragmentType: FragmentType.Resistance, value: { amount: 155, units: '#' }, type: 'resistance', image: '155#', origin: 'parser' }
        ]
    ]
};
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

- [`TimerState`](TimerState.md) - Timer fragments for output
- [`RoundState`](RoundState.md) - Round fragments for output
