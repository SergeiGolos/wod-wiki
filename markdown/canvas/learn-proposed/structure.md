# Structure & Rounds

> Proposed chapter 3 of 8 — see [README](./README.md). Replaces `/guide/syntax/structure`, the group tab pages, and `/guide/behaviors/rounds`. Homepage: the `(3 Rounds)` / `(5 Sets)` presets demonstrate this page.

A header in parentheses creates a **round behavior** that owns every indented line beneath it. Ownership is indentation; the runtime tracks which round you're in and advances automatically.

## Rounds {#rounds}

```time
(3)
  10 Pushups
  15 Air Squats
```

`(3)`, `(3 Rounds)`, `(3 Rds)` — the label is optional. The clock executes pushups, air squats, then repeats until three rounds are done, showing the current round throughout.

## Rep schemes {#rep-schemes}

A dash-separated list creates one round per value, and **every movement in the block inherits the current round's value**:

```time
(21-15-9) Thruster / Pull-up
```

Round 1: 21 thrusters and 21 pull-ups. Round 2: 15 of each. Round 3: 9. Ladders like `(10-8-6-4-2)` work the same way. The slash between movements is choice notation — do the movements in either order (or alternate) each round.

## Sets {#sets}

`(5 Sets)` repeats a block five times with equal reps per set — usually with rest inside:

```time
(5 Sets)
  3 Back Squat 225lb
  *2:00 Rest
```

## Nesting {#nesting}

Rounds nest inside rounds — supersets, alternating blocks, complex sessions:

```time
(5)
  (3)
    5 Deadlift
    10 Pushups
```

Five outer rounds, each containing three inner sets: 5 × 3 × 5 = 75 deadlifts. The clock counts both levels and shows where you are.

### Rep math {#rep-math}

The compiler derives totals — nothing is guessed or manually logged:

| Structure | Math |
|---|---|
| `(3 Rounds) 10 Burpees` | 10 × 3 = 30 burpees |
| `(21-15-9) Thruster` | 21 + 15 + 9 = 45 thrusters |
| `(5) (3) 5 Deadlift` | 5 × 3 × 5 = 75 deadlifts |

These planned totals feed the review grid, and — combined with what the clock records — become the [recorded facts](./metrics.md#planned-vs-recorded) that WQL aggregates.

## Named sections {#named-sections}

Two legal ways to label a section of a session:

- **`(Warmup)`** — a parenthesized label creates a named group node. Without a number it does not repeat; it organizes.
- **`// Warmup`** — a comment line. Pure text: no group node, but it labels sections in every shipped session example.

```time
// Warmup
  400m Run
  10 Air Squats

// Strength
  (5 Sets)
    3 Back Squat 225lb
    *2:00 Rest

// Conditioning
  10:00 AMRAP
    5 Pullups
    10 Pushups

// Cool-down
  5:00 Walk
```

Chain named groups to describe a full training session in one note; sections run sequentially and don't need to repeat to be useful. Use `(Label)` when you want a first-class group the runtime knows about; use `// Label` for pure organization. Full sessions like this one are [composed in chapter 8](./sessions.md#full-session).

**Run & observe.** Run the four-section session above: each named section plays in order, the `(5 Sets)` block tracks set count and enforces required rest, and the AMRAP window counts its own rounds. The review grid at the end shows per-section and per-round splits. Next: [Metrics](./metrics.md) — what all of this recording actually produces.
