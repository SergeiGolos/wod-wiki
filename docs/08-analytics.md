# Analytics

Analytics turn tracked metrics into insight metrics. The same `MetricContainer` shape is used, but metrics now have `origin: 'analyzed'` or `origin: 'analyzed-estimated'`.

## Analytics pipeline

```text
WorkoutResult.data.logs
        │
        ▼
  AnalyticsEngine (realtime + summary processors)
        │
        ▼
  OutputStatement with analyzed metrics
        │
        ▼
  normalizeSummaryFacts() → AnalyticsDataPoint[]
        │
        ▼
  Analytics Store (summary / segment / rollup grains)
        │
        ▼
  QueryService / WQL → widgets / tables
```

## Analytics metrics

| Metric | Origin | Meaning |
| -------- | -------- | --------- |
| `volume` | analyzed | reps × load, normalized |
| `pace` | analyzed | distance / elapsed |
| `power` | analyzed | work / time |
| `elapsed` | analyzed | Σ active span time |
| `total` | analyzed | wall-clock bracket |
| `met-score` | analyzed | normalized MET minutes |
| `session-load` | analyzed | session RPE × total minutes |
| `tis` | analyzed | Training Intensity Score (composite) |

## Effort registry

Every effort (movement) has:

- `slug` — canonical id
- `label` — display name
- `aliases` — alternate names
- `baseAttributes.discipline` — one of the 10 disciplines
- `baseAttributes.intensityTier` — default intensity bucket
- `met` — metabolic equivalent

The `EffortResolver` matches free-text effort names to registry entries with fuzzy matching.

## Disciplines

The canonical 10 disciplines:

1. `bodyweight`
2. `cycling`
3. `gymnastics`
4. `kettlebell`
5. `recovery`
6. `rowing`
7. `running`
8. `strength`
9. `swimming`
10. `walking`

Discipline drives the TIS multiplier.

## WQL — Wod Query Language

WQL is a Datadog-flavored query language over the analytics store.

```text
<aggregator>:<metric.namespace>{<tag filters>} by {<dimensions>} .rollup(<period>)
```

Examples:

```text
sum:reps{effort:push-up} by week
avg:pace{discipline:running} by day
max:load{effort:back-squat} by effort
```

### Aggregators

- `sum`, `avg`, `min`, `max`, `count`, `last`

### Filters

Tag filters inside `{}`. Multiple values for one key are OR; multiple keys are AND. `!` negates.

```text
{effort:push-up|air-squat, discipline:bodyweight}
{!effort:burpee}
```

### Group by

```text
by effort
by day
by week
by discipline
```

### Rollup

```text
.rollup(1w)
.rollup(4w)
```

### Rows queries

Return raw output-statement rows:

```text
rows:{result:abc123}
rows:segment{block:content-id}
```

### Content discovery

```text
find:note{tags:strength} in journal
find:block{text:"cindy"} in all
find:effort{discipline:kettlebell}
```

## Dashboards

A note with `dashboard: true` in frontmatter renders its `query` blocks as dashboard widgets.

```markdown
---
dashboard: true
---

# Weekly volume

```query:timeseries-2
sum:volume{} by week
```

```

Widget suffixes:

| Suffix | Widget type |
|--------|-------------|
| `-2`, `-full` | grid span |
| `value`, `table`, `timeseries`, `bar`, `toplist`, `stacked-bar` | widget kind |

Dashboard controls are declared as `dashboard.<name>` frontmatter keys and referenced in queries as `$name`.

## Analytics Store grains

| Grain | Use |
|-------|-----|
| `summary` | Workout-level aggregates (Tier 2) |
| `segment` | Per-segment numeric metrics, denormalized for filters |
| `rollup` | Windowed aggregates (ACWR, monotony, strain) |

## Rollup math

Rollup facts are computed lazily when the analytics surface opens:

- **ACWR** — acute:chronic workload ratio
- **Monotony** — mean / standard deviation of daily load
- **Strain** — total load × monotony

## Canonical Metric Keys

Cross-workout analysis uses a stable key vocabulary, not raw `MetricType` or display strings:

- `reps`
- `distance`
- `resistance`
- `elapsed`
- `power`
- `pace`
- `totalVolume`
- `totalDistance`
- `tis`
- `<effortSlug>.<family>`
- `calc.<target>`

A resolver maps each metric to its canonical key; the UI derives a human label from it.

## See also

- [`04-metric-lifecycle.md`](./04-metric-lifecycle.md) — metric origins and ownership
- [`05-architecture.md`](./05-architecture.md) — engine package responsibilities
