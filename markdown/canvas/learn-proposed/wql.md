# Query Your Training (WQL)

> Proposed chapter 6 of 8 — see [README](./README.md). Replaces `/guide/analytics` (README, anatomy, filters, joins) and the analytics cheat sheet. Homepage: the 04-Explore header actions link here and to the [Dashboards cookbook](./dashboards.md#cookbook).

WQL (Wod Query Language) queries your journal across two planes: numeric **facts** the clock recorded, and the markdown **content** those facts came from.

```query
sum:totalVolume{discipline:strength} by {week} last 6w
```

Three surfaces use the same language: the **Library** (zero-syntax tri-state browsing), the **Explorer** (`/analytics/explorer` workbench), and **in-note ```query blocks** — the one this chapter focuses on, which [dashboards](./dashboards.md) compose.

## The two planes {#planes}

| Plane | Shape | Searches | Example |
|---|---|---|---|
| **Metrics** | `agg:metric{filters} by {dim}` | the fact store | `sum:totalVolume{} by {week}` |
| **Content** | `find:target{filters,source:scope}` | notes, blocks, efforts | `find:note{effort:fran,source:journal} last 8w` |

## Aggregate queries {#aggregate}

```
<aggregator>:<metric>{<filters>} by {<dimension>} last <window>
```

**Aggregators** — `sum`, `avg`, `min`, `max`, `count`, `last` (most recent value), `delta` (change across the window).

**Metrics** — two tiers of stored facts, plus everything calculated:

- Tier-2 aggregates: `totalVolume`, `totalReps`, `totalDistance`, `tis`, `sessionLoad`
- Metric families: `reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`
- Calculated: the [`calc.*` list](./metrics.md#calculated) (`calc.acwr`, `calc.e1rm`, `calc.readiness`, …)

`avg:session-rpe{}` works too — [captured metrics](./metrics.md#session-rpe) are facts like any other.

**Dimensions** — time buckets `day`, `week`, `session`, `round`; metadata `effort`, `discipline`, `intensity`, `grade`; and any [custom property you authored](./metrics.md#custom-metrics) (`by {coach}`).

### Filters {#filters}

Inside the braces:

| Filter | Meaning |
|---|---|
| `{effort:thruster}` | exact match |
| `{!discipline:recovery}` | negation — exclude |
| `{discipline:strength\|gymnastics}` | OR |
| `{text:fran}` | substring (content plane) |
| `{intensity:high}` | intensity tier — one of `low`, `moderate`, `high` |
| `{tags:benchmark}` | note tags |
| `{coach:greg}` | your custom property |

### Sources {#sources}

The `source:` filter names where content lives — five values, plural:

`journal` (your notes) · `collections` (catalog sessions) · `feeds` (dated posts) · `guides` · `playground`

Omitting `source:` searches **all** of them — there is no `source:all` (the parser refuses it). Pin one catalog with an id: `collection:crossfit-girls`. The singular spellings (`source:collection`) still parse as legacy, but write plural.

### Windows {#windows}

One per query, at the end: relative — `last 7d`, `last 6w`, `last 12w` — or absolute — `from 2026-01-01 to 2026-03-31` (both dates included; drop `to …` to stay open). There is no `since:` keyword.

### Grouping & rollups {#grouping-rollup}

`by {week}` buckets; multiple dimensions group hierarchically — `by {intensity, week}`. Smooth weekly series with `.rollup(2w)` or `.rollup(4w)` (any multi-day/multi-week period; `.rollup(1w)` is refused — use `by {week}`).

### Where joins {#joins}

Content queries can require a numeric threshold computed over each result's linked workouts:

```query
find:note{tags:pr,source:journal} last 8w where sum:totalVolume{} > 5000
```

Keep only journal notes tagged `pr` whose total volume exceeds 5,000 kg. Joins are supported on `find:note` and `find:block`; other targets report an advisory and ignore the clause. Joins lean on the **Block Content Id** — a content hash of each workout block, stable across reorders and preserved when you clone a catalog benchmark into your journal, so history aggregates across every note where that workout lives.

## Content queries {#content}

```query
find:block{text:fran,source:collections}
```

Targets: `find:note` (whole notes), `find:block` (addressable fenced blocks), `find:effort` (registry entries, filterable by `effort`, `discipline`, `intensity`, `origin`, `text`), plus the advanced `find:session`, `find:segment`, `find:event` for recorded results and raw rows. Content-only keys (`type`, `text`, `has`, `source`, `catalog`) are category errors on aggregates.

### Presentation pipes {#pipes}

Content queries can end with pipes — `| select … | order by … | limit … [offset …]`:

```query
find:note{tags:pr,source:journal} last 8w | limit 5
```

`order by <column> [asc|desc]` sorts by a field of the result rows; `select` picks columns (with `in kg`/`in lb` units). Pipes ride on `find:` queries — aggregates don't take them — and some targets ignore a pipe and say so via advisory (`find:session` always orders by completion time; `| select` only reshapes `find:segment` and `find:event`).

**Run & observe.** After running the kettlebell note a few times this week, paste `sum:totalVolume{discipline:strength} by {effort} last 6w` into a ```query block in any note — your swings session appears as an effort row alongside (badged **sample** in demo data until facts exist). Then [compose those queries into a dashboard](./dashboards.md).
