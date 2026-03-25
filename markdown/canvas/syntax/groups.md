---
template: canvas
route: /syntax/groups
---

# Rounds and Groups {sticky dark full-bleed}

Groups organise movements into repeating blocks, named sections, or nested structures.
Indentation is the only delimiter — everything inside a group must be indented one level deeper.

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

Chain several named groups to describe a full training session — warmup, strength block, conditioning, cool-down — in a single note.

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

## What's Next {sticky full-bleed dark}

```button
label:  ← Rep Schemes
target: ex
pipeline:
  - navigate: /syntax/repeaters
```

```button
label:  AMRAP →
target: ex
pipeline:
  - navigate: /syntax/amrap
```
