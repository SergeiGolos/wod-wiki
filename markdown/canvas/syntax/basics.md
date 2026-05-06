---
search: hidden
template: canvas
route: /syntax/basics
type: syntax
---

# Core Concepts {sticky dark full-bleed}

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

## Measurements {sticky}

Add weights (`225lb`, `100kg`), distances (`400m`, `2000m`, `10 miles`), and percentages (`@75%`) directly to movement lines. The runtime tracks all of it and surfaces it in the Review grid.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-1.md
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
  - set-source: wods/examples/syntax/metrics-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Supplemental Data {sticky}

Beyond movements and metrics, you can capture intent, effort, and auxiliary context. Supplemental lines don't affect the timer — they enrich the log.

Use `@easy`, `@hard`, or a numeric RPE like `@7` after a movement to log your perceived effort.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/supplemental-1.md
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
  - set-source: wods/examples/syntax/supplemental-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Progressive Load {sticky}

Use `^` to flag a set as a warm-up ramp. Combine with `?lb` to let the runtime prompt for each weight as you build to your working load.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/supplemental-3.md
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
  - navigate: /syntax
```

```button
label:  Structure & Reps →
target: ex
pipeline:
  - navigate: /syntax/structure
```
