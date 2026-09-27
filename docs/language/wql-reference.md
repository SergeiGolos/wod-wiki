# WQL (Wod Query Language) Reference

**WQL** is a Datadog-inspired declarative query language designed to explore training documents, raw statement execution logs, and cross-workout telemetry facts.

---

## 1. Query Families

WQL has three distinct query families, each addressing a specific layer of the domain:

```
find:<target>{filters} [where ...] [window]     ← Discovery (notes, blocks, efforts, pages)
rows:<target>{filters} [where ...] [window]     ← Raw execution statement stream
<agg>:<metric>{filters} [by {dim}] [where ...]  ← Analytics facts & time-series
```

---

## 2. Discovery Queries (`find:`)

Used to find authored documents and catalog assets:

```wql
find:note{category:benchmark}
find:note{equipment:barbell, source:journal}
find:block{effort:thruster}
find:effort{discipline:strength, intensity:high}
find:page{category:benchmark}
```

### Targets (`find:<target>`)
* `note`: Discovers notes filtered by tags, types, or frontmatter properties.
* `block`: Discovers parsed workout blocks from `block_index`.
* `effort`: Discovers movements from the effort registry.
* `page`: Discovers parent pages joined through `page_notes`.

---

## 3. Execution Statement Queries (`rows:`)

Used to inspect raw round-by-round statements, split times, and telemetry emitted during workout runs:

```wql
rows:all{note:note-uuid}
rows:segment{block:block-content-id}
rows:segment [last 8w]
rows:all where find:note{equipment:kettlebell}
```

### Targets (`rows:<target>`)
* `all`: Returns all statement output types without filtering.
* `segment`: Returns round intervals and movement completion events.
* `event`, `summary`, `load`, `analytics`: Filters by promoted `outputType`.

---

## 4. Analytics Queries (`<agg>:<metric>`)

Evaluates aggregations over `EventRecord` telemetry facts:

```wql
sum:totalVolume{} by {week} last 12w
max:resistance{effort:back-squat}
avg:pace{effort:run} by {month}
count:reps{discipline:gymnastics} last 4w
```

### Head Aggregators
`sum`, `avg`, `min`, `max`, `count`, `last`, `delta`.

### Metric Keys
* **Physical Families**: `reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`.
* **Derived Aggregates**: `totalVolume`, `totalDistance`, `tis`, `sessionLoad`.
* **Calculated Targets**: `calc.e1rm`, `calc.metMinutes`, `calc.acwr`, `calc.monotony`, `calc.strain`.

---

## 5. Filter Vocabulary

Filters are comma-separated within curly braces `{key:value}`:

| Key | Description | Example |
|---|---|---|
| `effort` | Movement slug | `{effort:fran}`, `{effort:clean-and-jerk}` |
| `discipline` | Sport classification | `{discipline:strength}`, `{discipline:gymnastics}` |
| `intensity` | Workout tier | `{intensity:high}` |
| `origin` | Producer provenance | `{origin:user}`, `{origin:runtime}` |
| `tags` | Tag label | `{tags:pr}`, `{tags:benchmark}` |
| `<tagType>` | Any registered dynamic tag type | `{equipment:barbell}`, `{category:girl}` |
| `source` | Content source scope | `{source:journal}`, `{source:collections}` |

### Filter Modifiers
* **OR**: Use pipe `|` (`{effort:fran|helen}`) or repeat keys (`effort:fran, effort:helen`).
* **NOT**: Prefix with exclamation mark `!` (`{!discipline:recovery}`).

---

## 6. Time Windows & Buckets

* **Relative windows**: `last 2w`, `last 30d`, `last 6m`, `last 1y`.
* **Fixed intervals**: `.rollup(1d)`, `.rollup(1w)`.
* **Grouping Dimensions**: `by {day}`, `by {week}`, `by {month}`, `by {session}`, `by {effort}`.

---

## 7. Cross-Store Relational Joins (`where`)

Queries can join content discovery with telemetry facts:

```wql
// Find notes owning workouts that exceeded 5000kg total volume
find:note{source:journal} where sum:totalVolume{} > 5000

// Show session rows from notes tagged with kettlebell
rows:all where find:note{equipment:kettlebell}
```
