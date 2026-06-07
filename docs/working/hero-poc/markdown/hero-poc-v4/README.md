---
search: hidden
template: canvas
route: /hero-poc/v4
type: hero-poc
---

# Plan once. Use the metric three ways. {sticky dark full-bleed}

Three cards, three affordances — and the same `Rep` metric in each. The
note card is editable. The run card has the buttons. The review card has
the row.

```view
name:    hero-v4
state:   note
source:  wods/examples/getting-started/protocols-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## 1. Plan card {sticky #plan-card theme:violet}

`10 Pushups` → `Rep(10)`, `origin: 'parser'`. The plan. Edit the number in
the note on the right to see the parser re-emit the metric.

```command
target: hero-v4
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  Edit the plan →
target: hero-v4
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

## 2. Run card {sticky #run-card theme:emerald}

The runtime reported 9 reps. Then you typed 8. User wins display. The Run
card has the buttons — these are the real `useWodBlockCommands` set.

```button
label:  ▶ Run
target: hero-v4
pipeline:
  - set-state: track
```

```button
label:  + Today
target: hero-v4
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  ↗ Playground
target: hero-v4
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: track
```

## 3. Review card {sticky #review-card theme:amber}

The row reads `Rep(8)` with `origin: 'user'`. The `MET-min` and `TIS`
columns come from the analytics engine.

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

```example
label: AMRAP variant
source: wods/examples/getting-started/protocols-1.md
```

```button
label:  See the review →
target: hero-v4
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: track
```

## Why three cards {sticky full-bleed dark}

All three cards anchor the same `Rep` metric. The Plan card shows the
source. The Run card shows the button set. The Review card shows the row.
