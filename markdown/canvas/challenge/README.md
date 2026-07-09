---
search: hidden
template: canvas
route: /challenge
type: challenge
title: Accept the Challenge
---

# Accept the Challenge {sticky dark full-bleed}

Three small wins. Edit the script on the right, watch the banner flip
to **complete** as each milestone is met.

```quest
id: first-movement
label: Add your first movement
desc: Type a single line with a named exercise and a rep count.
validation:
  type: has-movement
```

```quest
id: first-timer
label: Add a rest or time cap
desc: Pair your movement with a Duration line (e.g. `*:30 Rest`).
validation:
  type: has-timer
```

```quest
id: first-rounds
label: Wrap it in rounds
desc: Add a parenthesised round header (e.g. `(3 Rounds)`).
validation:
  type: min-rounds
  count: 3
```

## The Starting Line {sticky #start theme:emerald}

You're handed a blank script. Build it up — one line at a time.

```view
name:    challenge-try
state:   note
source:  wods/examples/challenge/welcome-2.md
runtime: in-memory
launch:  host
align:   right
width:   55%
```

`wod` blocks are fenced in triple backticks. A movement line is just an
exercise name with a rep count. A timer line starts with `*` and a
Duration. Rounds go in `(...)` at the top.

## What "Done" Looks Like

When the banner shows all three challenges complete, you've shipped your
first real script. Press **Run** in the editor to start the WallClock.

```button
label:  Back to Home →
target: challenge-try
pipeline:
  - navigate: /
```

```button
label:  Read the Full Syntax →
target: challenge-try
pipeline:
  - navigate: /guide/syntax
```
