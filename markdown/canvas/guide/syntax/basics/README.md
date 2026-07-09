---
search: hidden
template: canvas
route: /chapters/basics
type: guide-chapter
title: "Chapter 1: Basics"
---

# Chapter 1: Basics {sticky dark full-bleed}

Build the smallest meaningful workout: one movement, one rep count.

```quest
id: basics-movement
label: Add a movement
desc: Type a single line with a named exercise and a rep count.
validation:
  type: has-movement
```

```quest
id: basics-reps
label: Add a rep count
desc: Any integer on a movement line counts.
validation:
  type: has-reps
```

```chapter
id: basics
title: Basics
badge: trophy
quests: basics-movement, basics-reps
sections: []
```

## Try it

The editor on the right is your scratchpad. Type a movement line and
watch the banner flip.

```view
name:    basics-try
state:   note
source:  wods/examples/guide/syntax/basics/welcome.md
runtime: in-memory
launch:  host
align:   right
width:   55%
```

A movement line is just an exercise name with a rep count, like
`10 KB Swings`. The line compiles to one `Effort` and one `Rep` metric
in the statement tree.

## What's next

Once both quests are complete, your Basics chapter badge unlocks on the
home page's onboarding popover.

```button
label:  Next: Sequences →
target: basics-try
pipeline:
  - navigate: /chapters/sequences
```

```button
label:  Back to Home
target: basics-try
pipeline:
  - navigate: /
```
