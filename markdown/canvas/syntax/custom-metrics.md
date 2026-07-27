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

```scroll
screen: editor
typewriter: true
stages:
  - id: intensity
    range: [0, 0.18]
    source: wods/syntax/custom-metrics-1.md
    caption: Track a percentage or arbitrary scale value alongside the movement. The runtime surfaces it in the tracker and review grid.
  - id: rpe-rir
    range: [0.18, 0.36]
    source: wods/syntax/custom-metrics-2.md
    caption: Log rate of perceived exertion and reps in reserve per set. These are first-class effort dimensions that feed into calculated metrics and history search.
    quest: metrics-custom
    toast: rpe · rir
  - id: heart-rate-zone
    range: [0.36, 0.52]
    source: wods/syntax/custom-metrics-3.md
    caption: Tag conditioning work with a target heart-rate zone. Any string or number key is accepted — unknown keys become custom metrics automatically.
  - id: multiple-metrics
    range: [0.52, 0.66]
    source: wods/syntax/custom-metrics-4.md
    caption: Combine as many properties as you need. The JSON object can appear anywhere on the line and every property is treated as an independent metric.
  - id: calculated
    range: [0.66, 0.82]
    source: wods/syntax/custom-metrics-5.md
    caption: Use a `calculate` block to derive values from custom metrics across the workout. The runtime evaluates these after completion — and live during tracking — using the collected data.
    quest: metrics-calc
    ring:
      tag: calculate
  - id: syntax-rules
    range: [0.82, 0.92]
    caption: "**Optional** — existing syntax is unchanged; JSON objects are additive. **Placement** — anywhere on the line. **Values** — numbers, strings, booleans, or null. **Keys** — built-ins map to canonical metric types; any other key becomes a custom metric."
  - id: next
    range: [0.92, 1.0]
    caption: Your data model is whatever you write. Continue below for dialects — fences for different kinds of training notes.
```

# Custom Metrics {sticky dark full-bleed}

Attach any key/value data to a movement line with an inline JSON object. Each property becomes a metric that the runtime tracks, displays, and stores — no grammar changes needed.

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
