---
search: hidden
template: canvas
route: /guide/syntax/protocols
type: syntax
---

```chapter
id: protocols
title: Protocols
badge: timer
quests: protocols-timer, protocols-rounds, protocols-tag
sections: []
```

```quest
id: protocols-timer
label: Add a rest or time cap
validation:
  type: has-timer
```

```quest
id: protocols-rounds
label: Add a 3-round cap
validation:
  type: min-rounds
  count: 3
```

```quest
id: protocols-tag
label: Add a workout tag
validation:
  type: contains-token
  value: AMRAP
```

# Timers & Protocols {sticky dark full-bleed}

Prefix any movement with a duration to turn it into a timed block. Timers combined with specific workout structures create powerful protocols like AMRAP, EMOM, and Tabata.

```view
name:    ex
state:   note
source:  wods/examples/syntax/timers-rest.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Timers and Rest {sticky}

A bare duration (`5:00 Run`, `:30 Plank`) counts down from that time. Movements without a time prefix count up from zero.

Use `*` to mark a timer as required or non-skippable. `*:30 Rest` is a common pattern, but the rest behavior comes from the word `Rest`, not from `*` alone.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-rest.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Timer Modifiers {sticky}

Use `^` to force a timer to count up instead of down.

Use `*` to mark a timer as required or non-skippable.

Use `:?` when you want the runtime to record the actual time taken.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timer-modifiers.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Longer Durations {sticky}

Use `H:MM:SS` format for anything over an hour. `1:30:00 Row` is a 90-minute row, and the runtime preserves the longer countdown without changing syntax rules.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/longer-duration.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Mixed Timers {sticky}

Combine countdowns, untimed work, forced rest, and collectible timers in one note.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/mixed-timers.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Classic AMRAP {sticky}

**As Many Rounds As Possible.** Set a time cap, mark the block `AMRAP`, and race the clock. `20:00 AMRAP` is the canonical guide form.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/classic-amrap.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## AMRAP with a Time Cap {sticky}

A bare time on a line without `AMRAP` creates a time cap for the work nested beneath it.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/time-cap.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Multiple AMRAP Windows {sticky}

Chain several AMRAP blocks in one note. Each window gets its own countdown and round count, which makes this format useful for interval-style conditioning.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/multiple-amrap-windows.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Basic EMOM {sticky}

**Every Minute on the Minute.** Combine a rounds count, an interval timer, and the `EMOM` label. `(10) :60 EMOM` is the canonical guide form because it matches the runtime's interval strategy.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/basic-emom.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Longer Intervals {sticky}

Use a larger interval when a heavier movement or transition needs built-in recovery. `(5) 2:00 EMOM` gives five two-minute windows.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/longer-intervals.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Alternating EMOM {sticky}

Separate branches inside the EMOM let the runtime rotate between different tasks across the interval windows.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/alternating-emom.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Standard Tabata {sticky}

Intervals combine a work period and a rest period, repeated for a set number of rounds. A standard Tabata is `(8 Rounds)` with `:20` work and `:10 Rest` inside.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Custom Intervals {sticky}

Change the round count, work duration, or rest duration to any values. `:40` work / `*:20 Rest` over `(5 Rounds)` is a popular alternative.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/custom-intervals.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Intervals with Distance {sticky}

Pair a timed work interval with a distance target, then follow it with timed recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/distance-intervals.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Structure & Reps
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```

```button
label:  Complex Workouts →
target: ex
pipeline:
  - navigate: /guide/syntax/complex
```
