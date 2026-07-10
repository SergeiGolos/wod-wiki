---
search: hidden
template: canvas
route: /chapters/sequences
type: guide-chapter
title: "Chapter 2: Sequences"
---

# Chapter 2: Sequences {sticky dark full-bleed}

Add timing and repetition to a workout: a rest and a round header.

```quest
id: sequences-timer
label: Add a rest or time cap
desc: Any Duration line (e.g. `*:30 Rest`) satisfies this.
validation:
  type: has-timer
```

```quest
id: sequences-rounds
label: Add a 2+ round header
desc: Type `(2 Rounds)` (or higher) at the top of the script.
validation:
  type: min-rounds
  count: 2
```

```chapter
id: sequences
title: Sequences
badge: dumbbell
quests: sequences-timer, sequences-rounds
sections: []
```

## Try it

```view
name:    sequences-try
state:   note
source:  wods/examples/guide/syntax/sequences/welcome.md
runtime: in-memory
launch:  host
align:   right
width:   55%
```

A timer line starts with `*` and a Duration, e.g. `*:30 Rest`. Round
headers go in `(...)` at the top of the script — `(3 Rounds)` creates
a `Rounds: 3` metric on the parent statement.

## What's next

```button
label:  Next: Protocols →
target: sequences-try
pipeline:
  - navigate: /chapters/protocols
```

```button
label:  ← Back to Basics
target: sequences-try
pipeline:
  - navigate: /chapters/basics
```

```button
label:  Back to Home
target: sequences-try
pipeline:
  - navigate: /
```
