---
search: hidden
template: canvas
route: /syntax/measurements
---

# Measurements {sticky dark full-bleed}

Add weights, distances, and percentages directly to movement lines.
The runtime tracks all of it and surfaces it in the Review grid.

```view
name:    ex
state:   note
source:  wods/syntax/measurements.md
runtime: in-memory
launch:  host
align:   right
width:   48%
```

## Weights {sticky}

Append `lb` or `kg` after the movement name: `Back Squat 225lb`, `Deadlift 100kg`.
Use `bw` for bodyweight — it logs the athlete's recorded bodyweight.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-1.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Distances {sticky}

Supported units: `m`, `km`, `ft`, `miles`.
`Run 400m`, `Row 2000m`, `Bike 10 miles` are all valid.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-2.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Percentages {sticky}

Use `@75%` to express a percentage of max. The runtime stores it as written and converts to absolute load when your 1RM is on record.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-3.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## Unknown Load {sticky}

Use `?lb` to indicate the load is to be determined. The runtime prompts you to enter the actual weight when you reach that movement.

```command
target: ex
pipeline:
  - set-source: wods/examples/syntax/metrics-4.md
```

```button
label:  Try It →
target: ex
pipeline:
  - set-state: track
```

## What's Next {sticky full-bleed dark}

```button
label:  ← The Basics
target: ex
pipeline:
  - navigate: /syntax/basics
```

```button
label:  Supplemental Data →
target: ex
pipeline:
  - navigate: /syntax/supplemental
```
