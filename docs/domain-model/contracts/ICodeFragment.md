# ICodeFragment

> Core interface for parsed workout fragments

## Definition

```typescript
interface ICodeFragment {
  readonly image?: string;        // Original text representation
  readonly value?: unknown;       // Parsed value
  readonly type: string;          // Legacy type string
  readonly meta?: CodeMetadata;   // Source location
  readonly fragmentType: FragmentType;  // Typed enum
  readonly collectionState?: FragmentCollectionState;
  readonly behavior?: MetricBehavior;
}
```

## Fragment Types

```typescript
enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}
```

## Collection States

| State | Meaning |
|-------|---------|
| `Defined` | Value fully specified |
| `RuntimeGenerated` | Value generated at runtime (e.g., elapsed time) |
| `UserCollected` | Value collected from user input |
| `Collected` | Value has been collected |
| `Hinted` | Value is a suggestion |
| `Tracked` | Value being actively tracked |
| `Analyzed` | Value derived from analysis |

## Specialized Fragments

| Fragment | Key Properties |
|----------|----------------|
| `TimerFragment` | `value: number`, `direction: 'up' \| 'down'` |
| `RepFragment` | `value: number \| number[]` (rep scheme) |
| `RoundsFragment` | `value: number` |
| `ActionFragment` | `value: string` (exercise name) |

## Related Files

- [[ICodeStatement]] (container)
- [[../layers/01-parser-layer|Parser Layer]] (producer)
- [[../layers/02-compiler-layer|Compiler Layer]] (consumer)
