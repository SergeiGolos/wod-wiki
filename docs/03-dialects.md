# Dialects

A **Block Dialect** is the fence tag that selects a parser/compiler override for a block. The universal defaults (base grammar, base dialect stack, default analytics) always run underneath; a dialect only overrides where it explicitly differs.

## Recognized fence tags

| Tag | Aliases | Domain |
| ----- | --------- | -------- |
| `time` | `wod`, `whiteboard` | General workout timer |
| `climb` | `climbing` | Bouldering / sport climbing log |
| `cardio` | — | Run/row/bike/swim specific analytics |
| `yoga` | — | Yoga / mobility flows |
| `habits` | — | Daily habit tracking |

## How dialects work

1. The parser extracts statements from the fenced block.
2. The **Dialect Stack** runs each statement through configured dialects in order.
3. A dialect may emit:
   - **Hint metrics** (`MetricType.Hint`) such as `workout.amrap` or `behavior.required_timer`
   - Domain-specific metrics (e.g., climbing grades)
   - Unit sets for **Fusion** (turning `100m` into a distance metric)
4. The JIT compiler reads hints to decide which **Behaviors** a block receives.

## Built-in dialects

### UnitsDialect

Always first in the stack. Fuses bare numbers with known units:

- `400m` → `Distance(400, m)` + residual effort `Run`
- `225lb` → `Resistance(225, lb)` + residual effort
- `16kg` → `Resistance(16, kg)`

Unit registries live in `@bitcobblers/wod-wiki-lang` under `src/metrics/units/`.

### CrossFitDialect

Recognizes CrossFit-specific patterns and keywords.

### WodDialect

Recognizes general workout keywords: `STRENGTH`, `METCON`, `SKILL`, `WOD`, `SUPERSET`.

### CardioDialect

Specializes run/row/bike/swim blocks with pace and distance handling.

### YogaDialect

Handles flows, poses, and breath work.

### HabitsDialect

Handles daily habit check-ins.

### ClimbDialect

Handles climbing grades, send styles, and disciplines:

```climb
date: 2026-05-26
location: "Sender One LAX"
discipline: bouldering

(Warmup)
  [Slab Warmup] V0 flash @1 // quiet feet
  [Jug Ladder] V2 flash @1

(Project)
  [The Shield] V7 redpoint @12 // engage core before crux reach
```

## Adding a dialect

See [`06-interfaces-and-implementations.md`](./06-interfaces-and-implementations.md) for the `IDialect` contract and how to register one.

## Dialect stack order

```text
1. UnitsDialect
2. Sport / domain dialects (CrossFit, Cardio, Climb, Yoga, Habits, WOD)
3. Personal override dialect (if any)
```

Later dialects observe earlier output and can refine it.
