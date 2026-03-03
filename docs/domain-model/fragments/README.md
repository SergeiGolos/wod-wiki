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
│              FragmentType  ICodeFragment ICodeFragment  Aggregates       │
│              origin:parser origin:compiler origin:runtime  ↓             │
│                    │           │            │         Reports             │
│                    └───────────┴────────────┘                             │
│                              ▼                                           │
│                       Output Stream                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Fragment Types

| Fragment | Type Enum | Purpose | Value Type |
|----------|-----------|---------|------------|
| [TimerFragment](TimerFragment.md) | `Duration` | Duration/countdown values | `number` (ms) |
| [RepFragment](RepFragment.md) | `Rep` | Repetition counts | `number` |
| [RoundsFragment](RoundsFragment.md) | `Rounds` | Round counts | `number \| string` |
| [ActionFragment](ActionFragment.md) | `Action` | Named actions/movements | `string` |
| [EffortFragment](EffortFragment.md) | `Effort` | Effort/intensity zones | `string` |
| [DistanceFragment](DistanceFragment.md) | `Distance` | Distance with units | `{amount, units}` |
| [ResistanceFragment](ResistanceFragment.md) | `Resistance` | Weight/resistance with units | `{amount, units}` |
| [IncrementFragment](IncrementFragment.md) | `Increment` | Ascending/descending markers | `number` (+1/-1) |
| [GroupFragment](GroupFragment.md) | `Group` | Grouping markers | `GroupType` |
| [TextFragment](TextFragment.md) | `Text` | Display text/headings | `{text, level}` |
| [SoundFragment](SoundFragment.md) | `Sound` | Audio cue triggers | `SoundFragmentValue` |

### Additional Fragment Types (no dedicated class)

| Type Enum | Purpose |
|-----------|---------|
| `Spans` | Raw TimeSpan[] recordings |
| `SystemTime` | System Date.now() timestamp |
| `CurrentRound` | Current round number |
| `System` | System diagnostic data |
| `Label` | Display label |
| `Lap` | Lap marker |
| `Metric` | Recorded metric value |

## Core Interface

All fragments implement `ICodeFragment`:

```typescript
interface ICodeFragment {
  readonly fragmentType: FragmentType;    // Typed enum discriminator
  readonly type: string;                  // Legacy type string
  readonly value?: unknown;               // Parsed/computed value
  readonly image?: string;                // Original text representation
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
| `execution` | Generated during execution pipeline | Pipeline-generated data |

## Fragment Categories

### Collectible Fragments

Fragments with `origin: 'user'` support runtime value collection:

- **RepFragment**: `?` syntax for unknown reps
- **DistanceFragment**: `?m` syntax for unknown distance
- **ResistanceFragment**: `?#` syntax for unknown weight

### Measurable Fragments

Fragments that carry quantifiable values for analytics:

- TimerFragment → `FragmentType.Timer`
- RepFragment → `FragmentType.Rep`
- DistanceFragment → `FragmentType.Distance`
- ResistanceFragment → `FragmentType.Resistance`
- RoundsFragment → `FragmentType.Rounds`

### Control Fragments

Fragments that affect block structure/behavior:

- IncrementFragment (ascending/descending)
- GroupFragment (grouping control)
- ActionFragment (pinned actions)

## Related Documentation

- [ICodeFragment Contract](../contracts/ICodeFragment.md)
- [ICodeStatement Contract](../contracts/ICodeStatement.md)
- [FragmentState Memory](../memory/FragmentState.md)
