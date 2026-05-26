---
search: hidden
template: canvas
route: /guide/syntax/structure
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
  - set-source: wods/examples/syntax/named-groups.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Nested Groups {sticky}

Groups can nest inside groups. An outer rounds group can contain an inner interval block or another repeated section.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/groups-4.md
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
  - set-source: wods/examples/syntax/mixed-sections.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Rep Schemes {sticky}

Rep schemes use dash-separated values inside parentheses. `(21-15-9)` creates three rounds and applies those rep targets to every movement in the block.

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

## Descending Reps — (21-15-9) {sticky}

The `(21-15-9)` syntax creates three rounds automatically — 21 reps, then 15, then 9 — for every movement in the block.
The classic "Fran" uses this format with Thrusters and Pullups nested under the same group.

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

## Multiple Sets {sticky}

`(5 Sets)` repeats the block five times with equal reps each set. Add a rest line inside the group for structured recovery.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/multiple-sets.md
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
  - navigate: /guide/syntax/basics
```

```button
label:  Timers & Protocols →
target: ex
pipeline:
  - navigate: /guide/syntax/protocols
```
