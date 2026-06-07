---
search: hidden
template: canvas
route: /hero-poc/v5
type: hero-poc
---

# From `wod` to `Rep` to chart. {sticky dark full-bleed}

A vertical timeline of one number, with the source line above each card.
The plan lives at the top, the run in the middle, the chart at the bottom
— and a single rep-coloured rail connects them.

```view
name:    hero-v5
state:   note
source:  wods/examples/getting-started/statement-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## 10 — Plan {sticky #plan theme:rose}

The note. A single editable Markdown line, `10 Pushups`, produces a single
`Rep = 10` metric at the parser tier.

```command
target: hero-v5
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

```button
label:  Edit the plan →
target: hero-v5
pipeline:
  - set-source: wods/examples/getting-started/statement-1.md
  - set-state: note
```

## 9 — Run {sticky #run theme:amber}

Runtime reported `Rep = 9`. You logged `Rep = 8` at 12:03. The buttons
below are the per-block `useWodBlockCommands` set.

```button
label:  ▶ Run this block
target: hero-v5
pipeline:
  - set-state: track
```

```button
label:  + Add to today
target: hero-v5
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  ↗ Open in playground
target: hero-v5
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: track
```

## 8 — Review {sticky #review theme:violet}

The result row. `Rep` cell resolves to `8`. Analytics projects `MET-min`
and `TIS`. The sparkline hints at the journal chart.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

```example
label: AMRAP variant
source: wods/examples/getting-started/protocols-1.md
```

```button
label:  See the row →
target: hero-v5
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: track
```

## Why a timeline {sticky full-bleed dark}

Three timeline cards, one metric. The card on top is the source — a single
editable Markdown line. The middle card is the run — the command rail
plus the runtime-reported value. The bottom card is the row — the same
`Rep` cell that lives in the journal chart.
