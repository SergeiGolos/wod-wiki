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

# Core Concepts {sticky dark full-bleed}

Everything in WOD Wiki starts with a `wod` block — a fenced code block tagged with the word `wod`.
Inside, you list your workout line by line. The rules are simple and consistent.

```view
name:    ex
state:   note
source:  wods/examples/syntax/core-rules.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## A Single Movement {sticky}

The simplest workout is one exercise on one line. No reps, no timer — just a movement. The runtime will ask you to log how many you did when you finish.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/single-movement.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Three Core Rules {sticky}

Every file follows the same three rules.

**Fences** — wrap your workout in ` ```wod ``` `.

**One thing per line** — each line is a movement, a time, or a group header.

**Indentation means nesting** — anything indented under a group belongs to that group.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/core-rules.md
```

## Measurements {sticky}

Add weights (`225lb`, `100kg`) and distances (`400m`, `2000m`, `10 miles`) directly to movement lines. The runtime tracks them and surfaces them in the Review grid.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/measurements.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Unknown Load {sticky}

Use `?lb` to indicate the load is to be determined. The runtime prompts you to enter the actual weight when you reach that movement.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-5.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Supplemental Data {sticky}

Beyond movements and measurements, you can add plain-language effort text such as `easy` or `hard`. These words enrich the log without changing the structural shape of the workout.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/effort-notes.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Setup Actions & Comments {sticky}

Wrap non-movement instructions in square brackets: `[Setup Barbell]`. These appear in the timer as cue cards — the clock pauses until you tap continue.

Prefix a line with `//` to add a passive coach annotation. Comments are notes to yourself or the athlete — they never affect the timer or generate a cue card.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/actions-comments.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /guide/syntax
```

```button
label:  Structure & Reps →
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```
