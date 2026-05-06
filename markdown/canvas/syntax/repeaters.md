---
search: hidden
template: canvas
route: /syntax/repeaters
---

# Rep Schemes {sticky dark full-bleed}

Put a number before a movement to set its rep count.
Use the `(N-N-N)` repeater syntax to define varying reps across rounds in a single block.

```view
name:    ex
state:   note
source:  wods/examples/getting-started/metrics-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Simple Reps {sticky}

`10 Pushups` means 10 reps of pushups. The runtime tracks your count as you do them and logs the total.

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

```command
target: ex
pipeline:
  - set-source: wods/syntax/repeaters.md
```

The classic "Fran" uses this format: `(21-15-9)` Thrusters and Pullups.

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
label:  ← Rounds and Groups
target: ex
pipeline:
  - navigate: /syntax/groups
```

```button
label:  Timers and Rest →
target: ex
pipeline:
  - navigate: /syntax/timers
```
