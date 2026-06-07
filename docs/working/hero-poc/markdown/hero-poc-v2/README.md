---
search: hidden
template: canvas
route: /hero-poc/v2
type: hero-poc
---

# One `Rep`. Three places it lives. {sticky dark full-bleed}

Type `10 Pushups` in the note. Run the block. The same `Rep` metric moves
through the parser, the runtime, and the result row — a different origin
stamp each time.

```view
name:    hero-v2
state:   note
source:  wods/examples/getting-started/metrics-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## The visible number {sticky #visible theme:rose}

The big `Rep` on the screen resolves through the real
`MetricOwnershipLedger` — the lowest tier wins. Tiers (highest first):
`parser`, `dialect`, `compiler`, `runtime`, `user`. So your real reps
(`user`, tier 0) replace the planned reps (`parser`, tier 3) the moment
you log them.

Use the example switcher to see the source variants.

```example
label: parser · tier 3
source: wods/examples/getting-started/metrics-1.md
```

```example
label: runtime · tier 1
source: wods/examples/getting-started/protocols-1.md
```

```example
label: user · tier 0
source: wods/examples/getting-started/metrics-1.md
```

```button
label:  Run it →
target: hero-v2
pipeline:
  - set-state: track
```

## The four origins {sticky #origins density:compact theme:amber}

The metric carries four values at the same time, one per origin tier. Pick
one of the examples below to see how the parser interprets it.

```example
label: 10 Pushups
source: wods/examples/getting-started/metrics-1.md
```

```example
label: AMRAP variant
source: wods/examples/getting-started/protocols-1.md
```

```example
label: Just a movement
source: wods/examples/getting-started/statement-1.md
```

```button
label:  Open in playground →
target: hero-v2
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: track
```

## The single line {sticky #line theme:sky}

A single Markdown line produces a single `Rep` metric. The metric travels
through the same file, picking up a new `origin` at every stage.

```command
target: hero-v2
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: note
```

```button
label:  Edit me →
target: hero-v2
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: note
```

## Why one number {sticky full-bleed dark}

The visible number is the source of truth. The four tier cards underneath
show the history that produced it. The `MetricOwnershipLedger` picks one
of them for display — the lowest tier with a value.
