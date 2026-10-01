# WQL (Wod Query Language) Reference

**WQL** is a Datadog-inspired declarative query language designed to explore training documents, session runs, and cross-workout telemetry facts.

Every query answers four questions, in the same order:

```
WHAT{WHICH} WHEN by {GROUP} | SHAPE
```

---

## 1. Query Kinds

WQL has two query kinds — things or numbers:

```
find:<noun>{filters} [window] [by {dims}] [| pipes]      ← Things
<agg>:<metric>{filters} [window] [by {dims}] [.rollup]   ← Numbers
```

* **Things**: `find:note`, `find:block`, `find:effort`, `find:session`, `find:segment`, `find:event`.
* **Numbers**: `sum|avg|min|max|count|last|delta:<metric>`.

The noun decides the result shape: `session` returns grouped run cards, `segment` and `event` return flat tables, the content nouns return lists.

---

## 2. Discovery Queries (`find:`)

```wql
find:note{category:benchmark}
find:note{equipment:barbell, source:journal}
find:block{effort:thruster} last 8w | limit 20
find:effort{discipline:strength, intensity:high}
```

### Nouns (`find:<noun>`)
* `note`: Notes filtered by tags, types, or frontmatter properties.
* `block`: Parsed workout blocks from `block_index`.
* `effort`: Movements from the effort registry.
* `session`: Completed workout sessions — run cards grouped per result.
* `segment`: Cross-workout table at segment grain.
* `event`: Cross-workout table at event grain.

### Sessions & tables
```wql
find:session{} last 4w                              ← sessions in a window
find:session{result:r1}                             ← one session's run
find:session{result:r1, plane:segment}              ← narrowed to one output plane
find:segment{effort:snatch} last 12w                ← cross-workout table
find:segment{effort:snatch} by {effort} in lb       ← grouped rows, converted units
```

`plane:` accepts the known output types (`segment`, `system`, `load`, `event`, `compiler`, `completion`, `analytics`, `wellness`) and supports `|` OR and `!` NOT.

### Pipes (`| select / order by / limit`)
Any find query accepts presentation pipes:

```wql
find:note{source:collections} | order by title | limit 50
find:block{effort:back*} last 8w | limit 20
find:segment{effort:fran} last 26w | select date, elapsed | order by elapsed | limit 5
```

---

## 3. Analytics Queries (`<agg>:<metric>`)

Evaluates aggregations over `EventRecord` telemetry facts:

```wql
sum:totalVolume{} by {week} last 12w
max:resistance{effort:back-squat}
avg:pace{effort:run} by {week}
count:reps{discipline:gymnastics} last 4w
sum:sessionLoad{} by {intensity, week}
```

### Head Aggregators
`sum`, `avg`, `min`, `max`, `count`, `last`, `delta`.

### Metric Keys
* **Physical Families**: `reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`.
* **Derived Aggregates**: `totalVolume`, `totalDistance`, `tis`, `sessionLoad`.
* **Calculated Targets**: `calc.e1rm`, `calc.metMinutes`, `calc.acwr`, `calc.monotony`, `calc.strain`.

---

## 4. Filter Vocabulary

Filters are comma-separated within curly braces `{key:value}`:

| Key | Description | Example |
|---|---|---|
| `effort` | Movement slug | `{effort:fran}`, `{effort:clean-and-jerk}` |
| `discipline` | Sport classification | `{discipline:strength}`, `{discipline:gymnastics}` |
| `intensity` | Workout tier | `{intensity:high}` |
| `origin` | Producer provenance | `{origin:user}`, `{origin:runtime}` |
| `tags` | Tag label | `{tags:pr}`, `{tags:benchmark}` |
| `<tagType>` | Any registered dynamic tag type | `{equipment:barbell}`, `{category:girl}` |
| `source` | Where a note lives | `{source:journal}`, `{source:collections}` |
| `plane` | Output type on sessions | `{plane:segment}`, `{!plane:compiler}` |
| `result` / `block` / `note` | Session scope | `{result:r1}`, `{note:n1}` |

`source:` accepts exactly `journal | collections | feeds | guides | playground`. Page-ness is expressed with `type:`.

### Filter Modifiers
* **OR**: Use pipe `|` (`{effort:fran|helen}`).
* **NOT**: Prefix with exclamation mark `!` (`{!discipline:recovery}`).
* **Prefix**: Trailing `*` (`{effort:back*}`).

---

## 5. Time Windows & Buckets

* **Relative windows**: `last 2w`, `last 30d`.
* **Civil ranges**: `from 2026-09-01 to 2026-09-30`.
* **Time buckets**: `by {day}`, `by {week}` — civil days and Monday-aligned weeks in the user's timezone. Combine with other dims: `by {intensity, week}`.
* **Multi-unit rollups**: `.rollup(2w)`, `.rollup(7d)` for widths other than one, aligned to civil Mondays / civil days.

The window always filters on *when it happened*: a note's own `date` (falling back to `createdAt`), a block's parent note date, a session's completion time, a fact's metric date.

---

## 6. Cross-Store Relational Joins (`where`)

Queries join content discovery with telemetry facts — the right-hand side is always the other kind:

```wql
// Numbers, restricted to these things
sum:totalVolume{} where find:note{format:emom}

// Things, restricted by a number
find:note{intent:benchmark} where sum:totalVolume{} > 5000
```

---

## 7. Dashboard Widgets

Chart and value widgets take numbers (`<agg>:` queries); `table` and `list` widgets take things (`find:` queries):

````
```query:table
find:segment{effort:fran} last 26w | select date, elapsed | order by elapsed | limit 5
```
````

---

## 8. Removed forms

* `rows:all{…}` / `rows:<plane>{…}` — removed; use `find:session{…}` (add `plane:<plane>` for plane narrowing).
* `rows:segment{…}` unscoped — removed; use `find:segment{…}`.
* `rows:event{…}` — removed; use `find:event{…}`.
* `find:page` — removed; page-ness is `type:` (e.g. `find:note{type:collection}`).
* `source:page` / `source:pages` / `source:all` — removed; omit `source:` for all sources.
* `.rollup(1d)` / `.rollup(1w)` — removed; use `by {day}` / `by {week}`.
