---
search: hidden
template: canvas
route: /guide/syntax/custom-metrics
type: syntax
---

```chapter
id: custom-metrics
title: Custom Metrics
badge: activity
quests: metrics-custom, metrics-calc
sections: []
```

```quest
id: metrics-custom
label: Add a custom metric
validation:
  type: contains-token
  value: rpe
```

```quest
id: metrics-calc
label: Add a calculate block
validation:
  type: contains-token
  value: calculate
```

# Custom Metrics {sticky dark full-bleed}

Attach any key/value data to a movement line with an inline JSON object. Each property becomes a metric that the runtime tracks, displays, and stores — no grammar changes needed.

```view
name:    ex
state:   note
source:  wods/syntax/custom-metrics-1.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Intensity {sticky}

Track a percentage or arbitrary scale value alongside the movement. The runtime surfaces it in the tracker and review grid.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## RPE & RIR {sticky}

Log rate of perceived exertion and reps in reserve per set. These are first-class effort dimensions that feed into calculated metrics and history search.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Heart-Rate Zone {sticky}

Tag conditioning work with a target heart-rate zone. Any string or number key is accepted — unknown keys become custom metrics automatically.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Multiple Metrics on One Line {sticky}

Combine as many properties as you need. The JSON object can appear anywhere on the line and every property is treated as an independent metric.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Calculated Metrics {sticky}

Use a `calculate` block to derive values from custom metrics across the workout. The runtime evaluates these after completion (and live during tracking) using the collected data.

```command
target: ex
pipeline:
  - set-source: wods/syntax/custom-metrics-5.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Syntax Rules {sticky}

- **Optional** — existing syntax is unchanged; JSON objects are additive.
- **Placement** — the object may appear anywhere on the line.
- **Values** — numbers, strings, booleans, or null. Nested objects and arrays are reserved for future expansion.
- **Keys** — built-in keys (`intensity`, `rpe`, `rir`, `hrZone`) map to canonical metric types. Any other key becomes a `MetricType.Custom` entry.
- **Calculations** — `calculate` blocks are document-level siblings to `wod` blocks. Each line is `identifier = expression`. Supported functions: `sum`, `mean`, `max`, `min`, `count`. Arithmetic: `+`, `-`, `*`, `/`, parentheses. The literal `duration` references timer values in seconds.

## What's Next {sticky full-bleed dark}

```button
label:  ← Core Concepts
target: ex
pipeline:
  - navigate: /guide/syntax/basics
```

```button
label:  Structure & Reps →
target: ex
pipeline:
  - navigate: /guide/syntax/structure
```
