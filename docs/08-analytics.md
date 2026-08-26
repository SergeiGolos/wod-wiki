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
  Unified Event Store (summary / event grains)
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
sum:reps{effort:push-up} by {week}
avg:pace{discipline:running} by {day}
max:resistance{effort:back-squat} by {effort}
```

### Aggregators

- `sum`, `avg`, `min`, `max`, `count`, `last`, `delta`

### Filters

Tag filters inside `{}`. Multiple values for one key are OR; multiple keys are AND. `!` negates.

```text
{effort:push-up|air-squat, discipline:bodyweight}
{!effort:burpee}
```

### Group by

```text
by {effort}
by {day}
by {week}
by {discipline}
```

### Rollup

```text
.rollup(1w)
.rollup(4w)
```

### Rows queries

Return raw output-statement rows:

```text
rows:all{result:abc123}
rows:segment{block:content-id}
```

### Content discovery

```text
find:note{tags:strength,source:journal}
find:block{text:"cindy"}
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
sum:totalVolume{} by {week}
```

```

Widget suffixes:

| Suffix | Widget type |
|--------|-------------|
| `-2`, `-full` | grid span |
| `value`, `table`, `timeseries`, `bar`, `toplist`, `stacked-bar` | widget kind |

Dashboard controls are declared as `dashboard.<name>` frontmatter keys and referenced in queries as `$name`.

## Event store grains

| Grain | Use |
|-------|-----|
| `summary` | Workout-level aggregates (Tier 2), finalize-owned |
| `event` | Per-output-statement rows (formerly `segment`) |

`rollup` is retired — windowed aggregates (ACWR, monotony, strain) are computed at read time via `.rollup`, never stored.

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
