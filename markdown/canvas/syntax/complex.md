---
search: hidden
template: canvas
route: /syntax/complex
---

# Complex Workouts {sticky dark full-bleed}

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note. These examples use every concept from the guide.

```view
name:    ex
state:   note
source:  wods/syntax/complex.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Nested Protocols {sticky}

An outer rounds group containing a named AMRAP, followed by a strength block with rest. Each group runs sequentially — the runtime handles the transitions.

```command
target: ex
pipeline:
  - set-source: wods/syntax/complex.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Full Training Session {sticky}

Warmup → Strength → Conditioning → Cool-down. Four named groups in one note, each with its own protocol and rest pattern.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/document-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Barbell Cycling {sticky}

Multiple EMOM windows back-to-back with changing loads. Supplemental cues prompt plate changes between blocks.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/document-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Partner Workout {sticky}

Two alternating AMRAP windows with a shared time budget. Each partner's work is logged separately in the Review grid.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/document-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Finish Line {sticky full-bleed dark}

You've seen the full syntax. Time to write your own.

```button
label:  ← Supplemental Data
target: ex
pipeline:
  - navigate: /syntax/supplemental
```

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /syntax
```

```button
label:  New Workout Note →
target: ex
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
