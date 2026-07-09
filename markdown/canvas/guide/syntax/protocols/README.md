---
search: hidden
template: canvas
route: /chapters/protocols
type: guide-chapter
title: "Chapter 3: Protocols"
---

# Chapter 3: Protocols {sticky dark full-bleed}

Build a structured workout protocol: a 3-round cap with a workout tag.

```quest
id: protocols-rounds
label: Add a 3-round cap
desc: Type `(3 Rounds)` at the top of the script.
validation:
  type: min-rounds
  count: 3
```

```quest
id: protocols-tag
label: Add a workout tag
desc: The script must include the token `AMRAP` (or `EMOM`, `TABATA`, etc).
validation:
  type: contains-token
  value: AMRAP
```

```chapter
id: protocols
title: Protocols
badge: timer
quests: protocols-rounds, protocols-tag
sections: []
```

## Try it

```view
name:    protocols-try
state:   note
source:  wods/examples/guide/syntax/protocols/welcome.md
runtime: in-memory
launch:  host
align:   right
width:   55%
```

A protocol is at least 3 rounds with a workout-type tag. The `AMRAP`
token (or `EMOM`, `TABATA`, `FOR TIME`) tells the journal how to score
the session.

## What's next

When all three chapter badges are unlocked, the OnboardingBanner will
show a fully-completed state.

```button
label:  ← Back to Sequences
target: protocols-try
pipeline:
  - navigate: /chapters/sequences
```

```button
label:  Back to Home
target: protocols-try
pipeline:
  - navigate: /
```
