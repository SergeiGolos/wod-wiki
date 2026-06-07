---
search: hidden
template: canvas
route: /hero-poc/v1
type: hero-poc
---

# Plan in plain text. Run in one click. Read in a row. {sticky dark full-bleed}

The pitch: one Markdown file, one workout, one row in the journal. The
metric `Rep` travels from your plan to the runtime to the result.

```view
name:    hero-v1
state:   note
source:  wods/examples/getting-started/protocols-1.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## 1. Plan {sticky #plan theme:violet}

The `wod` block is just fenced Markdown. Edit the line, change `10 Pushups`
to `12`, and the `Rep` metric is re-emitted on the next keystroke.

This is the line you're staring at on the right. The same `useWodBlockCommands`
hooks the real editor uses — *Run this block*, *Add to today*, *Schedule*,
*Share* — live right beside the `wod` fence.

```command
target: hero-v1
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  Run this block →
target: hero-v1
pipeline:
  - set-state: track
```

## 2. Run {sticky #run theme:emerald}

The Run, *Add to today*, *Schedule*, *Open in playground*, and *Share block*
commands all live on the editor's per-block context menu today. They show
up here as a single rail.

```command
target: hero-v1
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  + Add to today
target: hero-v1
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: note
```

```button
label:  ⤴ Open in playground
target: hero-v1
pipeline:
  - set-source: wods/examples/getting-started/protocols-1.md
  - set-state: track
```

## 3. Read {sticky #read theme:amber}

A `ResultsView` row with the columns you already use: *Date · Effort · Reps ·
Volume · MET-min · TIS*. The `Rep` cell is the same metric, with a new
`user`-origin value. Try the example below to see how the column definitions
read the same metric from different sources.

```example
label: Reps only
source: wods/examples/getting-started/metrics-1.md
```

```example
label: With weight
source: wods/examples/getting-started/metrics-2.md
```

```button
label:  See the row →
target: hero-v1
pipeline:
  - set-source: wods/examples/getting-started/metrics-1.md
  - set-state: track
```

## Why this works {sticky full-bleed dark}

All three panels anchor the same `Rep` metric. The Plan panel shows the
source. The Run panel shows the button set. The Read panel shows the row.
The visible `Rep` resolves through the real `MetricOwnershipLedger`:
`user (8) > runtime (9) > parser (10)`.
