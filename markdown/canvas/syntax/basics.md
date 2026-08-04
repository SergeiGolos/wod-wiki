---
search: hidden
template: canvas
route: /guide/syntax/basics
type: syntax
---

```chapter
id: basics
title: Basics
badge: trophy
quests: basics-movement, basics-reps, basics-load
sections: []
```

```quest
id: basics-movement
label: Add a movement
validation:
  type: has-movement
```

```quest
id: basics-reps
label: Add a rep count
validation:
  type: has-reps
```

```quest
id: basics-load
label: Add a load or distance
validation:
  type: contains-token
  value: lb
```

```scroll
screen: editor
typewriter: true
stages:
  - id: movement
    range: [0, 0.16]
    source: wods/examples/syntax/single-movement.md
    caption: The simplest workout is one exercise on one line. No reps, no timer — just a movement. The runtime will ask you to log how many you did when you finish.
    quest: basics-movement
    ring:
      tag: "```time"
  - id: three-rules
    range: [0.16, 0.34]
    source: wods/examples/syntax/core-rules.md
    caption: Every file follows the same three rules. **Fences** — wrap your workout in a wod block. **One thing per line** — each line is a movement, a time, or a group header. **Indentation means nesting** — anything indented under a group belongs to that group.
    quest: basics-reps
  - id: measurements
    range: [0.34, 0.50]
    source: wods/examples/syntax/measurements.md
    caption: Add weights (`225lb`, `100kg`) and distances (`400m`, `2000m`, `10 miles`) directly to movement lines. The runtime tracks them and surfaces them in the Review grid.
    quest: basics-load
    toast: 225lb · 400m · 10 miles
  - id: unknown-load
    range: [0.50, 0.62]
    source: wods/examples/syntax/metrics-5.md
    caption: Use `?lb` to indicate the load is to be determined. The runtime prompts you to enter the actual weight when you reach that movement.
  - id: supplemental
    range: [0.62, 0.74]
    source: wods/examples/syntax/effort-notes.md
    caption: Beyond movements and measurements, you can add plain-language effort text such as `easy` or `hard`. These words enrich the log without changing the structural shape of the workout.
  - id: actions-comments
    range: [0.74, 0.88]
    source: wods/examples/syntax/actions-comments.md
    caption: Wrap non-movement instructions in square brackets — `[Setup Barbell]` appears in the timer as a cue card. Prefix a line with `//` for a passive coach annotation that never affects the timer.
    ring:
      tag: "[Setup]"
  - id: next
    range: [0.88, 1.0]
    caption: You know the core syntax. Continue below for the full structure guide — or keep playing in the editor above.
```

# Core Concepts {sticky dark full-bleed}

Everything in WOD Wiki starts with a `wod` block — a fenced code block tagged with the word `wod`.
Inside, you list your workout line by line. The rules are simple and consistent.

## What's Next {sticky full-bleed dark}

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Timers & Protocols →
target: ex
pipeline:
  - navigate: /guide/syntax/protocols
```
