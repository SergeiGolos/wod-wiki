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

# Dialect Examples {sticky dark full-bleed}

Dialect fences tell WOD Wiki what kind of training note a block represents. The line grammar stays familiar, while the fence gives the editor, review grid, and analytics layer the right intent.

```view
name:    ex
state:   note
source:  wods/examples/syntax/dialect-wod.md
runtime: in-memory
launch:  host
align:   right
width:   50%
```

## `wod` — Workout Definition {sticky}

Use `wod` for the session you intend to run, track, or share as the primary workout definition.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-wod.md
```

```button
label:  Try WOD →
target: ex
pipeline:
  - set-state: track
```

## `log` — Completed Session {sticky}

Use `log` when the block records what happened. Logs preserve performed work, notes, and subjective effort without pretending to be tomorrow's prescription.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-log.md
```

## `plan` — Future Template {sticky}

Use `plan` for drafts, tomorrow's session, and reusable templates. Unknown loads can stay as placeholders until execution.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-plan.md
```

## `climb` — Indoor Bouldering {sticky}

Use `climb` for route and problem logs. Grades, send types, attempts, and beta notes become explicit climbing signals while staying readable as plain Markdown.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-bouldering.md
```

## `climb` — Outdoor Sport Day {sticky}

Outdoor entries can keep crag context, YDS grades, redpoint history, high points, and condition notes together.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-sport.md
```

## `climb` — Hangboard Training {sticky}

Climbing training also belongs in the same dialect when the session is climbing-specific but not route-based.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/dialect-climb-hangboard.md
```

## Syntax Reference {sticky full-bleed dark}

Return to the main syntax map when you want the lower-level grammar rules.

```button
label:  Back to Syntax →
target: ex
pipeline:
  - navigate: /guide/syntax
```
