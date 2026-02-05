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
  readonly origin?: FragmentOrigin;     // Where fragment came from
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
  Resistance = 'resistance',
  Sound = 'sound'
}
```

## Fragment Origins

```typescript
type FragmentOrigin = 
  | 'parser'     // Created by parser from source text
  | 'compiler'   // Synthesized by compiler strategy
  | 'runtime'    // Generated during execution
  | 'user'       // Collected from user input
  | 'collected'  // Value has been collected
  | 'hinted'     // Value is a suggestion
  | 'tracked'    // Being actively tracked
  | 'analyzed';  // Derived from analysis
```

## Specialized Fragments

| Fragment | Key Properties |
|----------|----------------|
| `TimerFragment` | `value: number`, `direction: 'up' \| 'down'` |
| `RepFragment` | `value: number \| number[]` (rep scheme) |
| `RoundsFragment` | `value: number` |
| `ActionFragment` | `value: string`, `isPinned: boolean` |
| `SoundFragment` | `sound: string`, `trigger: SoundTrigger` |

## Related Files

- [[ICodeStatement]] (container)
- [[IOutputStatement]] (output fragments)
- [[01-parser-layer|Parser Layer]] (producer)
- [[02-compiler-layer|Compiler Layer]] (consumer)
