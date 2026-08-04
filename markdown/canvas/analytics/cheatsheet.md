---
search: hidden
template: canvas
route: /guide/analytics/cheatsheet
type: analytics
---

# WQL Cheat Sheet {sticky dark full-bleed}

One page, every WQL construct. Copy the query pattern, plug in your metrics, and run it.

## Analytics Aggregations {sticky}

### Aggregators {#aggregators}

| Operator | Math | Example |
|---|---|---|
| `sum` | Total sum | `sum:totalVolume{}` |
| `avg` | Average | `avg:tis{}` |
| `min` | Minimum | `min:elapsed{}` |
| `max` | Maximum | `max:totalDistance{}` |
| `count` | Count of sessions | `count:totalReps{}` |
| `last` | Most recent value | `last:sessionLoad{}` |
| `delta` | Change over window | `delta:sessionLoad{}` |

### Metrics {#metrics}

| Metric | Type | Unit | Example |
|---|---|---|---|
| `totalVolume` | Base | kg / lb | `sum:totalVolume{discipline:strength}` |
| `totalReps` | Base | reps | `sum:totalReps{} by {effort}` |
| `sessionLoad` | Base | AU | `sum:sessionLoad{} by {week}.rollup(1w)` |
| `tis` | Base | pts | `avg:tis{}` |
| `totalDistance` | Base | m / km / mi | `sum:totalDistance{discipline:running}` |
| `calc.acwr` | Calculated | ratio | `avg:calc.acwr{}` |
| `calc.monotony` | Calculated | score | `avg:calc.monotony{}` |
| `calc.strain` | Calculated | score | `avg:calc.strain{}` |

## Content Search (`find:`) {sticky}

### Target & Scope {#target-scope}

| Target | Scope | Description | Example |
|---|---|---|---|
| `find:note` | `journal` | Search personal user notes | `find:note{tags:pr} in journal` |
| `find:note` | `collections` | Search Catalog sessions | `find:note{effort:fran} in collections` |
| `find:block` | `all` | Search fenced blocks across all sources | `find:block{text:amrap} in all last 4w` |

### Filters {#filters}

| Key | Description | Example |
|---|---|---|
| `effort` | Movement slug | `effort:back-squat` |
| `discipline` | Domain modality | `discipline:strength` |
| `text` | Substring match | `text:burpee` |
| `source` | Content source ID | `source:collection:crossfit-girls` |
| `type` | Block type | `type:wod` or `type:dashboard` |

## In-Note Fences {sticky}

### Query Block {#query-block}

````time
```query
sum:totalVolume{discipline:strength} by {week}.rollup(1w)
```
````

### Dashboard Block {#dashboard-block}

````time
```dashboard
title: Training Review
widgets:
  - type: query_value
    title: Avg TIS
    query: avg:tis{}
  - type: timeseries
    title: Weekly volume
    query: sum:totalVolume{} by {week}.rollup(1w)
```
````

## Finish Line {sticky full-bleed dark}

Return to the Analytics index or open the Metric Explorer.

```button
label:  ← Back to Analytics Index
target: ex
pipeline:
  - navigate: /guide/analytics
```

```button
label:  Open Metric Explorer →
target: ex
pipeline:
  - navigate: /analytics/explorer
```
