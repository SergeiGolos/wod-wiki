---
search: hidden
template: canvas
route: /guide/behaviors/timers
type: behavior
---

# Timer Behaviors {sticky dark full-bleed}

Time in WOD Wiki is a behavior, not a special case. Any duration prefix on a line becomes a timer that the runtime can count up, count down, repeat, or ring.

## Timer schemes {sticky}

The most common time-bound workout patterns are built from the same few tokens:

| Scheme | Line | Clock behavior |
|---|---|---|
| **AMRAP** | `10:00 AMRAP` | Countdown from 10:00; count rounds completed inside the window |
| **EMOM** | `(10) 1:00 EMOM` | Ten one-minute intervals; each interval starts with a bell |
| **Tabata** | `(8 Rounds) :20 Work / :10 Rest` | Eight work/rest cycles; the `:` prefix marks each interval |
| **For Time** | `5:00 For Time` or `For Time` | Count up toward a cap, or count up with no cap |
| **Rest** | `*:30 Rest` | Non-skippable rest block; `*` marks it required |

## From header to behavior {sticky}

A timer line is parsed into a duration metric and a hint that tells the compiler which strategy to use. The compiler then picks a timer behavior:

- **Countdown** — the line has a duration and no `^` prefix. `10:00 Run` counts down from 10:00.
- **Countup** — the line has `^` or is a movement without a duration. `^5:00 Run` counts up to 5:00.
- **Interval** — the line uses `EMOM` or a work/rest pair. The clock repeats the interval for the declared number of rounds.
- **Rest** — the line contains `Rest`. The timer still fires, but the cue card tells you to recover.

A header like `(5 Rounds)` does not start a timer by itself. It tells the runtime to repeat the indented block five times. If the block contains a timed line, the timer runs inside each round.

## Sound, pause, and resume {sticky}

The timer surface is frozen: it already handles sound cues, pause, and resume exactly as you expect.

- **Sound** — the runtime emits `SoundMetric` outputs at the start of a timer, the final ten seconds, and round transitions. Audio systems subscribe to these outputs and play the matching cue.
- **Pause / Resume** — the countdown stops when you press pause and resumes from the same elapsed time. Interval timers keep their round state so an EMOM window does not restart from zero.
- **Skip** — timers without `*` can be skipped. Required timers (`*:30 Rest`) force you to wait the full duration.

These are runtime behaviors, not syntax changes. You write the same line; the clock decides how to display it.

## What's Next {sticky full-bleed dark}

```button
label:  ← Behaviors Index
target: ex
pipeline:
  - navigate: /guide/behaviors
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
