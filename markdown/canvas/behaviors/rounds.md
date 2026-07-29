---
search: hidden
template: canvas
route: /guide/behaviors/rounds
type: behavior
---

# Rounds & Structure {sticky dark full-bleed}

Rounds are the compiler's way of repeating, grouping, and sequencing work. A header in parentheses creates a round behavior that owns every indented line beneath it.

## How rounds work {sticky}

A line like `(3 Rounds)` becomes a round behavior that repeats its children three times. The runtime tracks the current round, shows it in the clock, and advances automatically when the block finishes.

```wod
(3 Rounds)
  10 Push-ups
  15 Air Squats
```

The compiler sees: round container → movement → movement. It executes push-ups, air squats, then repeats until three rounds are done.

## Rep schemes and ladders {sticky}

A dash-separated list inside parentheses creates a **rep scheme**. The scheme becomes a sequence of rounds, and each round applies its value to every movement in the block.

| Scheme | Rounds | Reps per round |
|---|---|---|
| `(21-15-9)` | 3 | 21, 15, 9 |
| `(5 Sets)` | 5 | same reps each set |
| `(10-8-6-4-2)` | 5 | descending ladder |

So `(21-15-9) Thruster / Pull-up` means 21 thrusters and 21 pull-ups, then 15 of each, then 9 of each. The rep scheme is a round behavior; the movements inherit the current round's rep count.

## Supersets and interval groups {sticky}

Rounds can contain rounds. A nested block lets you describe supersets, alternating EMOMs, or complex sessions:

```wod
(5 Rounds)
  (3 Sets)
    5 Deadlift
    10 Push-up
```

The outer round repeats five times; each outer round contains three inner sets. The runtime counts both levels and shows you where you are.

An **interval group** combines rounds with timers. `(10) 1:00 EMOM` is an interval group: ten rounds, each one minute long, with a bell at the start of every window.

## Rep math {sticky}

The compiler does not guess the total reps. It derives them from the round count and the rep scheme:

- `(3 Rounds) 10 Burpees` → 10 burpees × 3 rounds = 30 burpees.
- `(21-15-9) Thruster` → 21 + 15 + 9 = 45 thrusters.
- `(5 Rounds) (3 Sets) 5 Deadlift` → 5 × 3 × 5 = 75 deadlifts.

These totals feed the review grid and analytics without manual logging.

## Rounds meet timers {sticky}

When a round contains a timer, the timer runs inside each round. When a timer contains a round, the round repeats inside the time window.

| Pattern | Behavior |
|---|---|
| `(3 Rounds) 1:00 Work / :30 Rest` | Three rounds, each with its own work/rest timer |
| `10:00 AMRAP` | One countdown; rounds are counted as you complete them |
| `(5) 1:00 EMOM` | Five one-minute intervals; each interval is a round |

The same syntax rules apply in every case: indentation defines ownership, and headers define the behavior.

## What's Next {sticky full-bleed dark}

```button
label:  ← Timer Behaviors
target: ex
pipeline:
  - navigate: /guide/behaviors/timers
```

```button
label:  ← Behaviors Index
target: ex
pipeline:
  - navigate: /guide/behaviors
```

```button
label:  Capture & Feedback →
target: ex
pipeline:
  - navigate: /guide/behaviors/capture
```
