# Timers & Protocols

> Proposed chapter 2 of 8 — see [README](./README.md). Replaces `/guide/syntax/protocols` + all timer tab pages + the syntax half of `/guide/behaviors/timers`. Homepage: the Run-section presets mirror these examples.

A duration prefix turns any line into a timer. Combined with round headers, the same few tokens produce AMRAP, EMOM, Tabata, and every interval scheme.

## Countdown, count-up, and the three prefixes {#countdown-countup}

| Line | Clock behavior |
|---|---|
| `5:00 Run` | counts **down** from 5:00 |
| `10 Pushups` | no duration → counts **up** like a stopwatch while you log reps |
| `^5:00 Row` | `^` forces a count-**up** to 5:00 even though a duration is given |
| `*:30 Rest` | `*` marks the timer **required** — it cannot be skipped |
| `1:30:00 Long Row` | `H:MM:SS` for anything over an hour |
| `5:00 Run :?` | `:?` collects the **actual** result when the block finishes |

`Rest` is behavior, not decoration: the rest cue comes from the word `Rest` on the line; `*` only decides whether it can be skipped. The `:?` prompt may also lead the line — `:? Max Effort Pushups` parses identically because `:?` is its own duration token; this guide appends it as the convention.

### Required rest {#required-rest}

```time
(3)
  10 Kettlebell Swings 24kg
  *:30 Rest
```

The shared example's rest is non-skippable: the clock waits the full 30 seconds before round 2. A plain `1:00 Rest` (no `*`) can be skipped; `^5:00 Rest` counts up instead of down.

## AMRAP {#amrap}

**As Many Rounds As Possible** — a time cap plus the `AMRAP` label. The clock counts down and counts completed rounds:

```time
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
```

A bare duration on a line — `20:00` with no label — is a **time cap** for the work nested beneath it ([Caps](#caps)). Chain several AMRAP windows in one note and each gets its own countdown and round counter.

## EMOM {#emom}

**Every Minute On the Minute** — a round count, an interval duration, and the `EMOM` label:

```time
(10) :60 EMOM
  5 Power Cleans
```

Ten windows, one minute each, a bell at the start of every window. Heavier work wants longer windows: `(5) 2:00 EMOM` is five two-minute windows. Separate indented branches rotate across windows:

```time
(10) :60 EMOM
  5 Pullups
  10 Pushups
```

Odd windows do pull-ups, even windows do push-ups.

## Tabata and intervals {#tabata-intervals}

A work line and a rest line inside a round count — the canonical Tabata:

```time
(8)
  :20 Max Effort Burpees
  :10 Rest
```

The compact form writes the pair on one line with a slash — `(8 Rounds) :20 / :10` — same tokens, same behavior. Change any number: `:40` work with `*:20 Rest` over `(5)` is a popular variant. Sub-minute durations need the leading colon (`:20`, `:10`).

## Caps and For Time {#caps}

| Line | Behavior |
|---|---|
| `20:00` (bare, work nested under it) | time cap — the clock counts down over whatever is indented |
| `For Time` | count up, no cap — stop the clock when done |
| `5:00 For Time` | count up toward a 5:00 cap |

## Distance intervals {#distance-intervals}

Pair a timed work interval with a distance target, then recover:

```time
(6)
  2:00 Run 400m
  *1:00 Rest
```

Each round is 400 m against the clock, then mandatory recovery. Distance is just a measure on the line — everything from [First Workout](./start.md#measurements) composes with timers.

**Run & observe.** Paste the Tabata block and press Run: eight `:20/:10` cycles with bells on every transition, and the round counter advancing automatically. Pause mid-window and resume — interval timers keep their round state. Then open [Structure & Rounds](./structure.md) to see what `(n)` was doing all along.
