---
search: hidden
template: canvas
route: /guide/syntax/structure
type: syntax
---

```chapter
id: structure
title: Structure
badge: blocks
quests: structure-run, structure-rounds, structure-repscheme
sections: []
```

```quest
id: structure-run
label: Run the First Example
validation:
  type: run-started
```

```quest
id: structure-rounds
label: Wrap movements in 2+ rounds
validation:
  type: min-rounds
  count: 2
```

```quest
id: structure-repscheme
label: Write a rep scheme
validation:
  type: contains-token
  value: 21-15-9
```

```scroll
screen: editor
typewriter: true
stages:
  - id: simple-rounds
    range: [0, 0.16]
    source: wods/examples/syntax/groups-1.md
    caption: "`(3 Rounds)` repeats the indented block three times. The runtime shows which round you're on and advances automatically."
    quest: structure-rounds
    ring:
      tag: "(3)"
  - id: named-groups
    range: [0.16, 0.30]
    source: wods/examples/syntax/named-groups.md
    caption: "Name a group with any label in parentheses — `(Warmup)`, `(Strength)`, `(Cool-down)`. Named groups don't repeat unless you add a number — they're just for organisation."
  - id: nested-groups
    range: [0.30, 0.44]
    source: wods/examples/syntax/groups-4.md
    caption: Groups can nest inside groups. An outer rounds group can contain an inner interval block or another repeated section.
  - id: mixed-sections
    range: [0.44, 0.58]
    source: wods/examples/syntax/mixed-sections.md
    caption: Chain several named groups to describe a full training session in one note — warmup, strength, conditioning, and cooldown. Sections do not need to repeat to stay useful.
  - id: rep-schemes
    range: [0.58, 0.76]
    source: wods/examples/syntax/groups-2.md
    caption: "Rep schemes use dash-separated values inside parentheses. `(21-15-9)` creates three rounds — 21, then 15, then 9 — for every movement in the block. The classic **Fran** uses this format."
    quest: structure-repscheme
    toast: 21 · 15 · 9
    ring:
      tag: "(21-15-9)"
  - id: multiple-sets
    range: [0.76, 0.88]
    source: wods/examples/syntax/multiple-sets.md
    caption: "`(5 Sets)` repeats the block five times with equal reps each set. Add a rest line inside the group for structured recovery."
  - id: next
    range: [0.88, 1.0]
    caption: You can repeat, name, nest, and scheme any block. Continue below for timers and protocols.
```

# Structure & Rep Schemes {sticky dark full-bleed}

Groups organise movements into repeating blocks, named sections, or nested structures. Rep schemes define how many times you perform those movements.

## What's Next {sticky full-bleed dark}

```button
label:  ← Timers & Protocols
target: ex
pipeline:
  - navigate: /guide/syntax/protocols
```

```button
label:  Custom Metrics →
target: ex
pipeline:
  - navigate: /guide/syntax/custom-metrics
```
