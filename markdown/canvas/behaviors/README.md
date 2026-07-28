---
search: hidden
template: canvas
route: /guide/behaviors
type: behavior
---

# Behaviors {sticky dark full-bleed}

A behavior is what the runtime does with one line of your workout. When you press **Run**, the compiler turns every `wod` block into a timeline of behaviors, and the clock plays them in order.

The script is the plan; the behavior is the action.

## The compile story {sticky}

Writing a workout is three steps away from running it:

1. **Script** — your Markdown note with `wod` fences.
2. **Parse** — the Lezer grammar turns each line into a statement of metrics.
3. **Compile** — the JIT compiler matches statements to behaviors and lays them out on a timeline.
4. **Track** — the WallClock runtime steps through that timeline, counting, prompting, and logging.

A `wod` block becomes a list of **Statements**. A header such as `(3 Rounds)` or `AMRAP 10` becomes a timer or round behavior. A modifier such as `:?` or `?lb` becomes a capture behavior that asks you for feedback during or after the workout.

## The three behavior families {sticky}

| Family | What it does | Example line | Result on the clock |
|---|---|---|---|
| **Timers** | Counts up or down, repeats, or rings at intervals | `10:00 AMRAP` | Countdown plus round counter |
| **Rounds** | Repeats a block, names a section, or walks a rep scheme | `(21-15-9)` | Three implicit rounds with descending reps |
| **Capture** | Asks for actuals, loads, or effort ratings | `225lb ?lb` or `:?` | Prompt when the movement is reached or finished |

Each family can be combined with the others. A header like `(5) :60 EMOM` uses both **rounds** and **timers**: five rounds, each one minute long, with an interval bell.

## Idioms {sticky}

| You write | The clock sees | Why it works |
|---|---|---|
| `AMRAP 10` | Countdown 10:00 + count rounds | `AMRAP` turns a duration into a race-against-the-clock behavior |
| `(21-15-9) Thruster / Pull-up` | Rounds over time: 21 of each, then 15, then 9 | The rep scheme is a round behavior; the movements inherit the current round's reps |
| `(10) :60 EMOM` | Interval timer: 10 one-minute windows | Rounds + duration + `EMOM` label create per-minute windows |
| `:?` | Post-block feedback prompt | Tells the runtime to record the actual time, reps, or distance after the block |
| `?lb` | Load-log prompt | Asks for the actual load when the movement is reached; feeds trendlines and PRs |

## What's Next {sticky full-bleed dark}

```button
label:  ← Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Timers & Protocols →
target: ex
pipeline:
  - navigate: /guide/behaviors/timers
```

```button
label:  Rounds & Structure →
target: ex
pipeline:
  - navigate: /guide/behaviors/rounds
```

```button
label:  Capture & Feedback →
target: ex
pipeline:
  - navigate: /guide/behaviors/capture
```
