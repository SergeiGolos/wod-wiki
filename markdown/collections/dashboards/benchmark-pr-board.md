---
dashboard: true
title: Benchmark PR Board
tags:
  - dashboard
  - crossfit
---

# Benchmark PR Board

CrossFit / Hyrox prebuilt — benchmark retests and work capacity. Tag
benchmark notes `benchmark` and they land on the board; the retest-cadence
columns from the prototype need per-benchmark scheduling (proposed) and
render as placeholders where the metric is not live yet.

## Benchmark scores
Which benchmarks moved this quarter?

```query:table-2
last:elapsed{tags:benchmark} by {effort}
```

## Fran trend
Closing on the goal time?

```query:timeseries
last:elapsed{effort:fran} by {week}.rollup(1w)
```

## Work capacity
Total reps per week rising?

```query:timeseries
sum:totalReps{} by {week}.rollup(1w)
```

## Session intensity
Pacing even or blowing up late?

```query:bar
sum:tis{} by {session}.rollup(1d)
```

## Training consistency
Sessions logged — gaps visible at a glance.

```query:bar
count:sessionLoad{} by {day}
```
