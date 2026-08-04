---
search: hidden
template: canvas
route: /guide/analytics/cookbook
type: analytics
---

# Cookbook & In-Note Dashboards {sticky dark full-bleed}

Copy canonical WQL queries and learn how to build dashboards directly inside your Markdown notes.

## Canonical Query Examples {sticky}

### Weekly Strength Volume
```wql
sum:totalVolume{discipline:strength} by {week}.rollup(1w)
```

### Top Volume Movements
```wql
sum:totalVolume{} by {effort}
```

### Training Intensity Score (TIS) Trend
```wql
avg:tis{} by {week}.rollup(1w)
```

### Acute:Chronic Workload Ratio (ACWR)
```wql
avg:calc.acwr{}
```

### Search Benchmark Notes
```wql
find:block{text:fran} in collections
```

## Embedding Queries in Notes (` ```query `) {sticky}

You can insert a WQL query directly into any note. The editor renders it inline as a live result widget:

````markdown
```query
sum:totalVolume{discipline:strength} by {week}.rollup(1w)
```
````

## Creating In-Note Dashboards (` ```dashboard `) {sticky}

A ````dashboard``` block aggregates multiple queries into a single responsive panel:

````markdown
```dashboard
title: Training Review
range: past_16_weeks
widgets:
  - type: query_value
    title: Avg TIS
    query: avg:tis{}
  - type: query_value
    title: Total volume
    query: sum:totalVolume{}
  - type: toplist
    title: Volume by effort
    query: sum:totalVolume{} by {effort}
    limit: 6
  - type: timeseries
    title: Weekly tonnage
    query: sum:totalVolume{} by {week}.rollup(1w)
```
````

Edit any widget in place by clicking **Edit Widget Query** in the note editor.

## What's Next {sticky full-bleed dark}

```button
label:  ← Cross-Store Joins
target: ex
pipeline:
  - navigate: /guide/analytics/joins
```

```button
label:  WQL Cheat Sheet →
target: ex
pipeline:
  - navigate: /guide/analytics/cheatsheet
```
