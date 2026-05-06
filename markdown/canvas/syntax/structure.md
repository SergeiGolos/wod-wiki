---
search: hidden
template: canvas
route: /syntax/structure
type: syntax
---

# Structure & Rep Schemes {sticky dark full-bleed}

Groups organise movements into repeating blocks, named sections, or nested structures. Rep schemes define how many times you perform those movements.

```view
name:    ex
state:   note
source:  wods/examples/getting-started/groups-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Simple Rounds {sticky}

`(3 Rounds)` repeats the indented block three times. The runtime shows which round you're on and advances automatically.

```command
target: ex
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Named Groups {sticky}

Name a group with any label in parentheses: `(Warmup)`, `(Strength)`, `(Cool-down)`. Named groups don't repeat unless you add a number — they're just for organisation.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Nested Groups {sticky}

Groups can nest inside groups. An outer `(3 Rounds)` containing an inner `(Tabata)` block runs the whole tabata three times.

```command
target: ex
pipeline:
  - set-source: wods/syntax/groups.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Mixed Sections {sticky}

Chain several named groups to describe a full training session in one note: warmup, strength, conditioning, and cooldown. Sections do not need to repeat to stay useful.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Rep Schemes {sticky}

Put a number before a movement to set its rep count: `10 Pushups` means 10 reps. The runtime tracks your count as you do them and logs the total.

```command
target: ex
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Descending Reps — (21-15-9) {sticky}

The `(21-15-9)` syntax creates three rounds automatically — 21 reps, then 15, then 9 — for every movement in the block.
The classic "Fran" uses this format: `(21-15-9)` Thrusters and Pullups.

```command
target: ex
pipeline:
  - set-source: wods/syntax/repeaters.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Multiple Sets {sticky}

`(5 Sets)` repeats the block five times with equal reps each set. Add a rest line inside the group for structured recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Core Concepts
target: ex
pipeline:
  - navigate: /syntax/basics
```

```button
label:  Timers & Protocols →
target: ex
pipeline:
  - navigate: /syntax/protocols
```
