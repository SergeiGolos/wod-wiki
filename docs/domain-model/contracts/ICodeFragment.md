# ICodeFragment

> Core interface for parsed workout fragments

## Definition

```typescript
interface ICodeFragment {
  readonly image?: string;              // Original text representation
  readonly value?: unknown;             // Parsed value
  readonly type: string;                // Legacy type string (retained for compat)
  readonly fragmentType: FragmentType;  // Typed enum discriminator
  readonly behavior?: MetricBehavior;   // Behavioral grouping
  readonly origin?: FragmentOrigin;     // Where fragment came from
  readonly sourceBlockKey?: string;     // Block key that created this fragment
  readonly timestamp?: Date;            // When fragment was created (runtime)
}
```

## Fragment Types

```typescript
enum FragmentType {
  // ── Core time types ──
  Duration = 'duration',       // Parser-defined planned target (e.g., "5:00" → 300000 ms)
  Spans = 'spans',             // Raw TimeSpan[] recordings (source of truth for elapsed/total)
  SystemTime = 'system-time',  // Real system Date.now() when a message is logged

  // ── Deprecated time types ──
  Time = 'time',               // @deprecated Use Spans
  Elapsed = 'elapsed',         // @deprecated Calculated from Spans
  Total = 'total',             // @deprecated Calculated from Spans

  // ── Workout metric types ──
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  CurrentRound = 'current-round',
  Action = 'action',
  Increment = 'increment',
  Group = 'group',
  Text = 'text',
  Resistance = 'resistance',
  Sound = 'sound',

  // ── System/display types ──
  System = 'system',
  Label = 'label',
  Lap = 'lap',
  Metric = 'metric',
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
  | 'analyzed'   // Derived from analysis
  | 'execution'; // Generated during execution pipeline
```

## Specialized Fragments

| Fragment | Key Properties |
|----------|----------------|
| `TimerFragment` | `value: number`, `direction: 'up' \| 'down'`, `fragmentType: Duration` |
| `RepFragment` | `value: number \| number[]` (rep scheme) |
| `RoundsFragment` | `value: number \| string` |
| `ActionFragment` | `value: string`, `isPinned: boolean` |
| `SoundFragment` | `sound: string`, `trigger: SoundTrigger` |
| `DistanceFragment` | `value: { amount, units }` |
| `ResistanceFragment` | `value: { amount, units }` |

## Related Files

- [[ICodeStatement]] (container)
- [[IOutputStatement]] (output fragments)
- [[01-parser-layer|Parser Layer]] (producer)
- [[02-compiler-layer|Compiler Layer]] (consumer)
