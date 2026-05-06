---
search: hidden
template: canvas
route: /syntax/protocols
type: syntax
---

# Timers & Protocols {sticky dark full-bleed}

Prefix any movement with a duration to turn it into a timed block. Timers combined with specific workout structures create powerful protocols like AMRAP and EMOM.

```view
name:    ex
state:   note
source:  wods/examples/syntax/timers-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Timers and Rest {sticky}

A bare duration (`5:00 Run`, `:30 Plank`) counts down from that time.
Movements without a time prefix count up from zero. 

Rest is just another line. Put a duration on a line that says `Rest` and the timer counts it down the same as any other work period.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Mixed Timers {sticky}

Combine timed and untimed work freely. A run with a time cap, followed by unlimited pushups, followed by a rest — all in one block.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Classic AMRAP {sticky}

**As Many Rounds As Possible.** Set a time cap, mark the block `(AMRAP)`, and race the clock. A time followed by `(AMRAP)` on the next indented level sets the time domain.

```command
target: ex
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## AMRAP with a Time Cap {sticky}

A bare time on a line without `(AMRAP)` creates a time cap — the runtime stops the workout when the clock runs out, even if you haven't finished.

```command
target: ex
pipeline:
  - set-source: wods/syntax/amrap.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Basic EMOM {sticky}

**Every Minute on the Minute.** Total duration followed by `(EMOM)`. The runtime splits it into 1-minute intervals and restarts the countdown each minute.

```command
target: ex
pipeline:
  - set-source: wods/syntax/emom.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Alternating EMOM {sticky}

Two movement groups inside an EMOM — the runtime alternates between them each minute: odd minutes for movement A, even minutes for movement B.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/protocols-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Tabata and Intervals {sticky}

Intervals combine a work period and a rest period, repeated for a set number of rounds. A standard Tabata is `(8 Rounds)` with `:20 Work` and `:10 Rest` inside.

```command
target: ex
pipeline:
  - set-source: wods/syntax/tabata.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Custom Intervals {sticky}

Change the round count, work duration, or rest duration to any values. `:40` work / `:20` rest over `(5 Rounds)` is a popular alternative.

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

## What's Next {sticky full-bleed dark}

```button
label:  ← Structure & Rep Schemes
target: ex
pipeline:
  - navigate: /syntax/structure
```

```button
label:  Complex Workouts →
target: ex
pipeline:
  - navigate: /syntax/complex
```
