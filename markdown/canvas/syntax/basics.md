---
search: hidden
template: canvas
route: /syntax/basics
---

# The Basics {sticky dark full-bleed}

Everything in WOD Wiki starts with a `wod` block — a fenced code block tagged with the word `wod`.
Inside, you list your workout line by line. The rules are simple and consistent.

```view
name:    ex
state:   note
source:  wods/syntax/basics.md
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
  - set-source: wods/examples/getting-started/statement-1.md
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
  - set-source: wods/syntax/basics.md
```

## What's Next {sticky full-bleed dark}

```button
label:  ← Back to Syntax Index
target: ex
pipeline:
  - navigate: /syntax
```

```button
label:  Timers and Intervals →
target: ex
pipeline:
  - navigate: /syntax/timers
```
