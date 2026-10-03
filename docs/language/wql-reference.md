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
find:note{tags:benchmark}
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
The parser accepts presentation pipes on find queries. Segment/event tables apply `select`, `order by`, `limit` and `offset`; note/block/effort apply ordering and pagination but not column selection; sessions apply pagination only. The composer preserves existing pipes when editing unrelated clauses, including standalone offsets.

```wql
find:note{source:collections} | order by title | limit 50
find:block{effort:back*} last 8w | limit 20
find:segment{effort:fran} last 26w | select date, elapsed | order by elapsed | limit 5
```

```wql
find:segment{effort:snatch} by {effort} in lb last 2w | select resistance in lb, effort | order by resistance desc | limit 5 offset 2
find:note{source:collections} | offset 20
```

Find target and storage scope are independent: `find:block{source:collections}` queries blocks stored in collections; `find:note{type:collection}` filters page type, not storage location. Guided choices reflect executor support rather than every key the parser can accept. Effort queries have no time dimension; `plane:` narrows sessions, not segment/event tables. Display units apply to aggregates and segment/event tables. Registered custom fact dimensions are available on aggregates and segment/event tables, not content or registry queries.

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
| `domain` / `format` / `equipment` / `quality` / `intent` | Typed note tag | `{equipment:barbell}`, `{intent:benchmark}` |
| `source` | Where a note lives | `{source:journal}`, `{source:collections}` |
| `plane` | Output type on sessions | `{plane:segment}`, `{!plane:compiler}` |
| `result` / `block` / `note` | Session scope | `{result:r1}`, `{note:n1}` |

`source:` accepts exactly `journal | collections | feeds | guides | playground`. Page-ness is expressed with `type:`.

Filter choices depend on the target. Notes support `source`, `text`, `type`, `page`, `catalog`, `tags`, `effort`, `note`, and the typed tags `domain`, `format`, `equipment`, `quality`, and `intent`. Blocks support `source`, `text`, `type`, `catalog`, `tags`, `effort`, and `note`. Efforts support `text`, `effort`, `discipline`, `intensity`, and `origin`. Sessions support `result`, `block`, `note`, and `plane`. Segment/event queries filter projected facts, including custom fact dimensions.

Unsupported filters remain parseable but produce an advisory. For example, `find:note{discipline:climbing}` does not filter notes by discipline. Use an effort query for registry discipline filters, or a note tag filter when the discipline is stored as a tag. Unsupported negation, wildcard, and presentation clauses also produce advisories instead of implying that they executed.

Content streams group by `date`, `day`, `week`, `month`, `year`, `discipline`, `origin`, `source`, `kind`, `type`, or `tag`. An unsupported content dimension such as `by {effort}` falls back to tag grouping with an explicit advisory. Query grouping takes precedence over the saved view grouping, then the route default.

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

## Editor typeahead

The text editor and guided picker use the same target capabilities. Click a head, target, filter key, value, or grouping dimension to replace that token with an alternative. Field suggestions exclude keys already used in the query; add OR values with `|` inside a filter. Picking an aggregator or field key adds `:` and opens the next list. Values use vault data first, then canonical vocabulary, with case-insensitive deduplication.

After a complete head, completion offers grouping and time windows. After a presentation pipe, completion offers `order by`, `select`, and `limit`, then their column, direction, unit, or number slots. A presentation clause that the target does not execute carries an advisory.

`Tab` accepts the active completion and advances to the next slot. `Enter` accepts the active option, or commits and closes the popup when no option is selected. Arrow navigation wraps in both directions. `Escape` closes the popup before leaving the editor. Invalid drafts remain editable, retain previous results, and never enter URL history or Apply. Opening the palette keeps the exact draft, including invalid text.

Completion menus use an opaque themed popover in light and dark mode, the app's sans-serif UI font, and outline icons for search, metrics, filter keys and values. Hover and keyboard selection have distinct highlights. The query text remains monospace.

## 8. Removed forms

* `rows:all{…}` / `rows:<plane>{…}` — removed; use `find:session{…}` (add `plane:<plane>` for plane narrowing).
* `rows:segment{…}` unscoped — removed; use `find:segment{…}`.
* `rows:event{…}` — removed; use `find:event{…}`.
* `find:page` — removed; page-ness is `type:` (e.g. `find:note{type:collection}`).
* `source:page` / `source:pages` / `source:all` — removed; omit `source:` for all sources.
* `.rollup(1d)` / `.rollup(1w)` — removed; use `by {day}` / `by {week}`.
