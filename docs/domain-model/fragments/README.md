# Fragments Domain Model

Fragments are the atomic data units that flow through the WOD Wiki pipeline. They represent parsed workout components that are created by the parser, transformed by the compiler, tracked by the runtime, and aggregated for analytics.

## Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Fragment Lifecycle                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Source Text ──► Parser ──► Compiler ──► Runtime ──► Analytics           │
│                    │           │            │            │               │
│                    ▼           ▼            ▼            ▼               │
│              FragmentType  MetricValue  ICodeFragment  Aggregates        │
│              origin:parser    ↓        origin:runtime     ↓              │
│                    │      Behaviors        │         Reports             │
│                    └─────────┬─────────────┘                             │
│                              ▼                                           │
│                       Output Stream                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Fragment Types

| Fragment | Type String | Purpose | Value Type |
|----------|-------------|---------|------------|
| [TimerFragment](TimerFragment.md) | `timer` | Duration/countdown values | `number` (ms) |
| [RepFragment](RepFragment.md) | `rep` | Repetition counts | `number` |
| [RoundsFragment](RoundsFragment.md) | `rounds` | Round counts | `number \| string` |
| [ActionFragment](ActionFragment.md) | `action` | Named actions/movements | `string` |
| [EffortFragment](EffortFragment.md) | `effort` | Effort/intensity zones | `string` |
| [DistanceFragment](DistanceFragment.md) | `distance` | Distance with units | `{amount, units}` |
| [ResistanceFragment](ResistanceFragment.md) | `resistance` | Weight/resistance with units | `{amount, units}` |
| [IncrementFragment](IncrementFragment.md) | `increment` | Ascending/descending markers | `number` (+1/-1) |
| [LapFragment](LapFragment.md) | `lap` | Grouping markers | `GroupType` |
| [TextFragment](TextFragment.md) | `text` | Display text/headings | `{text, level}` |
| [SoundFragment](SoundFragment.md) | `sound` | Audio cue triggers | `SoundFragmentValue` |

## Core Interface

All fragments implement `ICodeFragment`:

```typescript
interface ICodeFragment {
  readonly fragmentType: FragmentType;    // Typed enum discriminator
  readonly type: string;                  // Legacy type string
  readonly value?: unknown;               // Parsed/computed value
  readonly image?: string;                // Original text representation
  readonly meta?: CodeMetadata;           // Source location
  readonly origin?: FragmentOrigin;       // Creation context
  readonly behavior?: MetricBehavior;     // Behavioral grouping
  readonly sourceBlockKey?: string;       // Owning block (runtime)
  readonly timestamp?: Date;              // Creation time (runtime)
}
```

## Fragment Origins

Origins describe where and how a fragment was created:

| Origin | Description | Example |
|--------|-------------|---------|
| `parser` | Created from source text | `5:00` → TimerFragment |
| `compiler` | Synthesized by compiler strategy | Default timer for AMRAP |
| `runtime` | Generated during execution | Elapsed time, sound cues |
| `user` | Collected from user input | Actual reps completed |
| `collected` | Value has been populated | After user input |
| `hinted` | Suggestion/hint value | Default rep count |
| `tracked` | Actively tracked metric | Live rep count |
| `analyzed` | Derived from analysis | Computed statistics |

## Fragment Categories

### Collectible Fragments

Fragments with `origin: 'user'` support runtime value collection:

- **RepFragment**: `?` syntax for unknown reps
- **DistanceFragment**: `?m` syntax for unknown distance
- **ResistanceFragment**: `?#` syntax for unknown weight

### Metric Fragments

Fragments compiled to `MetricValue` for aggregation:

- TimerFragment → `MetricValueType.Time`
- RepFragment → `MetricValueType.Repetitions`
- DistanceFragment → `MetricValueType.Distance`
- ResistanceFragment → `MetricValueType.Resistance`
- RoundsFragment → `MetricValueType.Rounds`

### Control Fragments

Fragments that affect block structure/behavior:

- IncrementFragment (ascending/descending)
- LapFragment (grouping control)
- ActionFragment (pinned actions)

## Related Documentation

- [ICodeFragment Contract](../contracts/ICodeFragment.md)
- [ICodeStatement Contract](../contracts/ICodeStatement.md)
- [FragmentState Memory](../memory/FragmentState.md)
- [Parser Layer](../../layers/01-parser-layer.md)
- [Compiler Layer](../../layers/02-compiler-layer.md)
