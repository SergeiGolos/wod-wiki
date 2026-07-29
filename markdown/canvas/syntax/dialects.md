---
search: hidden
template: canvas
route: /guide/syntax/dialects
type: syntax
---

```chapter
id: dialects
title: Dialects
badge: file-text
quests: dialects-log, dialects-climb
sections: []
```

```quest
id: dialects-log
label: Write a log block
validation:
  type: contains-token
  value: \`\`\`log
```

```quest
id: dialects-climb
label: Write a climb block
validation:
  type: contains-token
  value: \`\`\`climb
```

```scroll
screen: editor
typewriter: true
stages:
  - id: wod
    range: [0, 0.16]
    source: wods/examples/syntax/dialect-wod.md
    caption: Use `wod` for the session you intend to run, track, or share as the primary workout definition.
    ring:
      tag: "```wod"
  - id: log
    range: [0.16, 0.34]
    source: wods/examples/syntax/dialect-log.md
    caption: Use `log` when the block records what happened. Logs preserve performed work, notes, and subjective effort without pretending to be tomorrow's prescription.
    quest: dialects-log
    ring:
      tag: "```log"
  - id: plan
    range: [0.34, 0.50]
    source: wods/examples/syntax/dialect-plan.md
    caption: Use `plan` for drafts, tomorrow's session, and reusable templates. Unknown loads can stay as placeholders until execution.
    ring:
      tag: "```plan"
  - id: climb-bouldering
    range: [0.50, 0.68]
    source: wods/examples/syntax/dialect-climb-bouldering.md
    caption: Use `climb` for route and problem logs. Grades, send types, attempts, and beta notes become explicit climbing signals while staying readable as plain Markdown.
    quest: dialects-climb
    ring:
      tag: "```climb"
  - id: climb-sport
    range: [0.68, 0.84]
    source: wods/examples/syntax/dialect-climb-sport.md
    caption: Outdoor entries can keep crag context, YDS grades, redpoint history, high points, and condition notes together.
  - id: climb-hangboard
    range: [0.84, 0.92]
    source: wods/examples/syntax/dialect-climb-hangboard.md
    caption: Climbing training also belongs in the same dialect when the session is climbing-specific but not route-based.
  - id: next
    range: [0.92, 1.0]
    caption: Return to the main syntax map when you want the lower-level grammar rules.
```

# Dialect Examples {sticky dark full-bleed}

Dialect fences tell WOD Wiki what kind of training note a block represents. The line grammar stays familiar, while the fence gives the editor, review grid, and analytics layer the right intent.

## What's Next {sticky full-bleed dark}

```button
label:  ← Custom Metrics
target: ex
pipeline:
  - navigate: /guide/syntax/custom-metrics
```

```button
label:  Complex Workouts →
target: ex
pipeline:
  - navigate: /guide/syntax/complex
```

```button
label:  Back to Syntax →
target: ex
pipeline:
  - navigate: /guide/syntax
```
