---
search: hidden
template: canvas
route: /guide/syntax/complex
type: syntax
---

```chapter
id: complex
title: Complex Workouts
badge: puzzle
quests: complex-run, complex-time, complex-rounds
sections: []
```

```quest
id: complex-run
label: Run the First Example
validation:
  type: run-started
```

```quest
id: complex-time
label: Add a timed block to the session
validation:
  type: has-timer
```

```quest
id: complex-rounds
label: Use 2+ rounds across sections
validation:
  type: min-rounds
  count: 2
```

```scroll
screen: editor
typewriter: true
stages:
  - id: nested-protocols
    range: [0, 0.25]
    source: wods/examples/syntax/complex-nested-protocols.md
    caption: An outer rounds group containing a timed conditioning block, followed by a named strength block with rest. Each group runs sequentially — the runtime handles the transitions.
    quest: complex-time
  - id: full-session
    range: [0.25, 0.50]
    source: wods/examples/syntax/complex-full-session.md
    caption: Warmup → Strength → Conditioning → Cool-down. Four named groups in one note, each with its own protocol and rest pattern.
    quest: complex-rounds
    toast: Warmup → Strength → Conditioning → Cool-down
  - id: barbell-cycling
    range: [0.50, 0.72]
    source: wods/examples/syntax/complex-barbell-cycling.md
    caption: Multiple EMOM windows back-to-back with changing loads. Supplemental cues prompt plate changes between blocks.
  - id: partner-workout
    range: [0.72, 0.88]
    source: wods/examples/syntax/complex-partner-workout.md
    caption: Separate named AMRAP windows keep each partner's work in its own section while sharing the same document.
  - id: next
    range: [0.88, 1.0]
    caption: You've seen the full syntax. Time to write your own.
```

# Complex Workouts {sticky dark full-bleed}

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note. These examples use every concept from the guide.

## Finish Line {sticky full-bleed dark}

You've seen the full syntax. Time to write your own.

```button
label:  ← Dialect Examples
target: ex
pipeline:
  - navigate: /guide/syntax/dialects
```

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  New Workout Note →
target: ex
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```
