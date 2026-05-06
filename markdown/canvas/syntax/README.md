---
search: hidden
template: canvas
route: /syntax
type: syntax
---

# Syntax Reference {sticky dark full-bleed}

WOD Wiki uses a compact, readable text syntax for describing workouts.
Every concept builds on the last — start at the top and work your way through.

```view
name:    preview
state:   note
source:  wods/syntax/basics.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Core Concepts {sticky}

Learn the foundational rules: creating a `wod` block, logging measurements, and tracking supplemental data like effort and cues.

```command
target: preview
pipeline:
  - set-source: wods/syntax/basics.md
```

```button
label:  Open Core Concepts →
target: preview
pipeline:
  - navigate: /syntax/basics
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
  - navigate: /syntax/structure
```

## Timers & Protocols {sticky}

Add time domains to your workouts. Learn how to structure classic protocols like AMRAP, EMOM, and Tabata.

```command
target: preview
pipeline:
  - set-source: wods/examples/syntax/timers-1.md
```

```button
label:  Open Timers & Protocols →
target: preview
pipeline:
  - navigate: /syntax/protocols
```

## Advanced

### Complex Workouts {sticky}

Put it all together. Nested groups, mixed protocols, and chained timers let you describe any training structure in a single note.

```command
target: preview
pipeline:
  - set-source: wods/syntax/complex.md
```

```button
label:  Open Complex Examples →
target: preview
pipeline:
  - navigate: /syntax/complex
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
