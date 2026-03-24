---
template: canvas
route: /syntax/timers
---

# Timers and Intervals {sticky dark full-bleed}

Prefix any movement with a duration to turn it into a timed block.
The timer counts down to zero and the runtime moves to the next line automatically.

```view
name:    ex
state:   note
source:  wods/examples/syntax/timers-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Countdown Timers {sticky}

A bare duration (`5:00 Run`, `:30 Plank`) counts down from that time.
When it hits zero the next block starts.

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

## Count-Up Timers {sticky}

Movements without a time prefix count up from zero. The runtime logs elapsed time when you mark the movement complete.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-2.md
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

## Long Durations {sticky}

Use `H:MM:SS` format for anything over an hour. `1:30:00 Row` is a 90-minute row.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/timers-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← The Basics
target: ex
pipeline:
  - navigate: /syntax/basics
```

```button
label:  Rep Schemes →
target: ex
pipeline:
  - navigate: /syntax/repeaters
```
