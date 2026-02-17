# Time Terminology Glossary

> Canonical definitions for time-related terms used across the parser, runtime, and grid view.

## Terms

| Term | Layer | Definition | Code Location |
|------|-------|------------|---------------|
| **Duration** | Parser | A fragment defined by the `CodeStatement` (e.g., `5:00` → 300 000 ms). Used by `TimerEndingBehavior` to know how long the span elapsed should be before closing the span. | `DurationFragment`, `FragmentType.Duration` |
| **Time** | Block | The spans collection that a block tracks — the raw `TimeSpan[]` start/stop recordings. Displayed on the grid by a range or timestamp based on the total time of the session (`:00` → `2:30`, etc.). | `SpansFragment`, `FragmentType.Spans`, `TimerState.spans` |
| **TimeStamp** | Runtime | The system time (`Date.now()`) when a message is logged. Provides a ground-truth wall-clock reference independent of the runtime clock. | `SystemTimeFragment`, `FragmentType.SystemTime`, `FIXED_COLUMN_IDS.TIMESTAMP` |
| **Elapsed** | Runtime | The total running time of a span — the sum of `(end − start)` for each segment on the block's time spans. Excludes paused intervals. | `ElapsedFragment`, `FragmentType.Elapsed`, `OutputStatement.elapsed` |
| **Total** | Runtime | The total time including pauses — the last span's end time minus the first span's start time. Represents the wall-clock bracket. | `TotalFragment`, `FragmentType.Total`, `OutputStatement.total` |

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│  Parser                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Duration   "5:00" → 300000ms planned target              │  │
│  │             (DurationFragment, FragmentType.Duration)      │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Runtime (Block)                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Time       TimeSpan[] raw clock recordings               │  │
│  │             (SpansFragment, TimerState.spans)              │  │
│  │                                                           │  │
│  │  TimeStamp  Date.now() when the event was logged          │  │
│  │             (SystemTimeFragment)                          │  │
│  └──────────┬────────────────────────────────┬───────────────┘  │
│             │ derived from                   │ derived from     │
│  ┌──────────▼──────────┐        ┌────────────▼──────────────┐  │
│  │  Elapsed             │       │  Total                     │  │
│  │  Σ(end − start)      │       │  lastEnd − firstStart      │  │
│  │  active time only    │       │  includes paused gaps      │  │
│  │  (ElapsedFragment)   │       │  (TotalFragment)           │  │
│  └──────────────────────┘       └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Grid Column Mapping

| Grid Column | Term | Source Property | Format |
|-------------|------|-----------------|--------|
| `#` | Index | `GridRow.index` | `1`, `2`, `3` |
| `Timestamp` | TimeStamp | `row.spans[0].started` → system clock | `HH:MM:SS` |
| `Time` | Time | `row.relativeSpans` (session-relative) | `:00 → 2:30` |
| `Elapsed` | Elapsed | `row.elapsed` | `mm:ss` |
| `Duration` | Duration | `row.duration` (from `DurationFragment`) | `mm:ss` |
| `Total` | Total | `row.total` | `mm:ss` |

## Anti-patterns

These usages should be avoided to prevent confusion:

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| "timer" for the parsed `5:00` value | **Duration** | "Timer" implies runtime mechanism, not a static value |
| "duration" for `TimeSpan.duration` getter | **span length** | Conflicts with the parser `Duration` term |
| `calculateDuration()` for summing spans | `calculateElapsed()` | The operation computes **Elapsed**, not **Duration** |
| "time" as a generic catch-all | The specific term (**Duration**, **Elapsed**, **Total**, **TimeStamp**) | Ambiguity |
| `TimerFragment` | `DurationFragment` | `TimerFragment` is deprecated |
| `output.elapsed` | `output.getFragment(FragmentType.Elapsed)?.value` | Direct property is a deprecated proxy |
| `output.total` | `output.getFragment(FragmentType.Total)?.value` | Direct property is a deprecated proxy |
| `output.spans` | `output.getFragment(FragmentType.Spans)?.value` | Direct property is a deprecated proxy |
| `row.elapsed`, `row.total`, etc. | `row.cells.get(FragmentType.Elapsed)` | GridRow direct props are deprecated proxies |

## Layer Ownership

- **Parser** owns: `Duration` — the planned target from the script
- **Runtime (Block)** owns: `Time` (spans), `TimeStamp`, `Elapsed`, `Total`
- **Grid View** displays: all of the above via their respective column renderers

## Fragments as Source of Truth

All time data flows through **fragments**. Direct properties on `OutputStatement`
and `GridRow` are **deprecated proxies** kept for backward compatibility.

### OutputStatement

| Deprecated property | Fragment replacement |
|---------------------|---------------------|
| `output.spans` | `output.getFragment(FragmentType.Spans)?.value` → `TimeSpan[]` |
| `output.elapsed` | `output.getFragment(FragmentType.Elapsed)?.value` → `number` (ms) |
| `output.total` | `output.getFragment(FragmentType.Total)?.value` → `number` (ms) |

`OutputStatement` implements `IFragmentSource`, so consumers can also use
`getDisplayFragments()`, `getAllFragmentsByType()`, and `hasFragment()`.

### GridRow

| Deprecated property | Fragment replacement |
|---------------------|---------------------|
| `row.elapsed` | `row.cells.get(FragmentType.Elapsed)?.fragments[0]?.value` |
| `row.duration` | `row.cells.get(FragmentType.Duration)?.fragments[0]?.value` |
| `row.total` | `row.cells.get(FragmentType.Total)?.fragments[0]?.value` |
| `row.spans` | `row.cells.get(FragmentType.Spans)?.fragments[0]?.value` |
| `row.relativeSpans` | Derive from SpansFragment value relative to workout start |
