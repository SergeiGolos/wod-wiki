---
search: hidden
template: canvas
route: /guide/syntax
type: syntax
---

# Syntax Reference {sticky dark full-bleed}

WOD Wiki uses a compact, readable text syntax for describing workouts.
Every concept builds on the last — start at the top and work your way through.

```view
name:    preview
state:   note
source:  wods/examples/syntax/core-rules.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Core Concepts {sticky}

Learn the foundational rules: creating a `wod` block, writing one statement per line, and adding measurements, effort notes, actions, comments, and timer modifiers.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/core-rules.md
```

```button
label:  Open Core Concepts →
target: preview
pipeline:
  - navigate: /guide/syntax/basics
```

## Dialect Examples {sticky}

Scroll through the main fence types: `wod` for workout definitions, `log` for completed sessions, `plan` for templates, and `climb` for climbing-specific logs.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-bouldering.md
```

```button
label:  Open Dialect Examples →
target: preview
pipeline:
  - navigate: /guide/syntax/dialects
```

## Structure & Rep Schemes {sticky}

Organise movements into repeating blocks, named sections, or nested groups. Define how many reps you perform for each movement.

```command
target: preview
pipeline:
  - set-source: wods/examples/getting-started/groups-1.md
```

```button
label:  Open Structure & Reps →
target: preview
pipeline:
  - navigate: /guide/syntax/structure
```

## Timers & Protocols {sticky}

Add time domains to your workouts. Learn how to structure classic protocols like AMRAP, EMOM, and Tabata.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/timers-rest.md
```

```button
label:  Open Timers & Protocols →
target: preview
pipeline:
  - navigate: /guide/syntax/protocols
```

## Advanced

### Complex Workouts {sticky}

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/complex-nested-protocols.md
```

```button
label:  Open Complex Examples →
target: preview
pipeline:
  - navigate: /guide/syntax/complex
```

## Custom Metrics & Calculations {sticky}

Attach line-local properties to a workout and derive summary values with a document-level `calculate` block.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/custom-metrics.md
```

```button
label:  Open Custom Metrics & Calculations →
target: preview
pipeline:
  - navigate: /guide/syntax/custom-and-calculated-metrics
```

## Start Writing {sticky full-bleed dark}

Open a new note and try the syntax for yourself.

```button
label:  New Workout Note →
target: preview
pipeline:
  - set-source: query:new
  - set-state: note
  - launch: dialog
```

```button
label:  ← Back to Home
target: preview
pipeline:
  - navigate: /
```
