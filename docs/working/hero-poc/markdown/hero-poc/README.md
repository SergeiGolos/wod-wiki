---
search: hidden
template: canvas
route: /hero-poc
type: hero-poc
---

# Hero POCs — single-metric iterations {sticky dark full-bleed}

Five POCs grounded in the real app: the `NoteEditor`, the
`useWodBlockCommands` hook, the `MetricOwnershipLedger` tier model, and
the `cdlColumnDefinitions` results row. All five use one anchor metric —
`Rep` — and the same free-form markdown source line.

```view
name:    hero-poc-index
state:   note
source:  wods/examples/getting-started/protocols-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## Plan v1 — three stacked panels {sticky #v1 theme:violet}

Plan · Run · Read. Three stacked panels: editable note, command rail,
results row.

```button
label:  Open Plan v1 →
target: hero-poc-index
pipeline:
  - navigate: /hero-poc/v1
```

## Plan v2 — one number, four tiers {sticky #v2 theme:rose}

A big visible number on top of a tier strip showing the four origin
values.

```button
label:  Open Plan v2 →
target: hero-poc-index
pipeline:
  - navigate: /hero-poc/v2
```

## Plan v3 — the runnable Markdown {sticky #v3 theme:emerald}

Editor + vertical Run rail + result row, all sharing the same `Rep` cell.

```button
label:  Open Plan v3 →
target: hero-poc-index
pipeline:
  - navigate: /hero-poc/v3
```

## Plan v4 — plan once, three ways {sticky #v4 theme:amber}

One editable note, three affordance cards. Each card carries the same
metric.

```button
label:  Open Plan v4 →
target: hero-poc-index
pipeline:
  - navigate: /hero-poc/v4
```

## Plan v5 — from `wod` to `Rep` to chart {sticky #v5 theme:sky}

A vertical timeline of one number, with a rep-coloured rail connecting
the cards.

```button
label:  Open Plan v5 →
target: hero-poc-index
pipeline:
  - navigate: /hero-poc/v5
```

## Promote to the playground {sticky full-bleed dark}

These files live in `docs/working/hero-poc/markdown/`. To make them
visible to the playground, copy the `hero-poc*/` folders into
`markdown/canvas/` so they sit alongside the existing
`markdown/canvas/home/`, `markdown/canvas/getting-started/`, etc.

```button
label:  Open the syntax guide →
target: hero-poc-index
pipeline:
  - navigate: /guide/syntax
```
