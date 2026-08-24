# WQL Deep Dive — The Wod Query Language & Query System

This document is the authoritative deep dive into **WQL** (Wod Query Language) and the **Query Service** that executes it. It covers the language surface, the grammar design, the AST contract, the execution plan, the store seams, and how facts flow from raw workout logs into queryable rows.

Implementation lives in `@bitcobblers/wod-wiki-wql` (`wod-wiki-engine/packages/wql/`):

```text
packages/wql/src/
├── grammar/wql.grammar      ← Lezer grammar (structural syntax)
├── wqlSuffix.ts             ← JS-level suffix stripping (where / in / by / .rollup / last)
├── wql.ts                   ← parseQuery + AST types + semantic validation
├── vocabulary.ts            ← the single dictionary (aggregators, keys, dims, targets)
├── QueryService.ts          ← the executor (pure, stores injected)
├── stores.ts                ← FactQueryStore / NoteQueryStore / BlockQueryStore / …
├── derivation.ts            ← logs → summary fact rows (normalizeSummaryFacts)
├── static.ts                ← static-corpus projections (collections/feeds)
├── units.ts                 ← kg↔lb, m↔km conversion
├── dashboard/               ← dashboard note model, tokens, scaffold
└── language.ts              ← CodeMirror language support
```

---

## 1. High-level overview

WQL answers three distinct questions, and the language has **three query families** to match:

| Family | Shape | Question it answers |
| -------- | ------- | --------------------- |
| **Aggregate** | `sum:reps{effort:push-up} by {week}` | "How much/how many over my training history?" |
| **Find** (content discovery) | `find:note{tags:strength} in journal last 8w` | "Which notes/blocks/efforts match?" |
| **Rows** | `rows:segment{result:abc123}` | "Show me the raw per-segment log of this run." |

Two design principles govern everything below:

1. **Logs win.** `WorkoutResult.data.logs` is the authoritative record for a single workout. The Analytics Store is a disposable, re-derivable index. If the two disagree, the logs are right — which is why cross-store joins re-derive from logs rather than trusting the store.
2. **The store seam is inverted.** `QueryService` has zero IndexedDB/storage imports. All persistence is injected through the store interfaces (`stores.ts`), so the service is 100% pure and testable with in-memory fakes.

```text
WorkoutResult.data.logs (authoritative)
        │  normalizeSummaryFacts()
        ▼
Analytics Store (facts: summary / segment / rollup grains)
        │
        ▼
QueryService — SELECT → BUCKET → GROUP → AGGREGATE
        │
        ▼
QueryResult { series, scalar, matched } → widgets/tables (dumb consumers)
```

---

## 2. The language surface

### 2.1 Aggregate queries

```text
<agg>:<metric.key>{<tag filters>} by {<dimensions>} .rollup(<period>) in <unit> where find:…
```

```text
sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w)
avg:tis{effort:back*} by {session}
max:resistance{effort:back-squat} in kg
last:calc.acwr{}
```

- **Aggregators** (`WQL_AGGREGATORS`): `sum`, `avg`, `min`, `max`, `count`, `last`, `delta`.
- **Metric namespaces** are Canonical Metric Keys: families (`reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`), Tier-2 aggregates (`totalVolume`, `totalDistance`, `tis`, `sessionLoad`), effort-scoped keys (`<effortSlug>.<family>`), and calc targets (`calc.acwr`, `calc.e1rm`, `calc.metMinutes`, … — see `WQL_CALC_TARGETS`).
- **`in <unit>`** is a display-unit directive (`in kg`, `in lb`) — conversion happens at read time, facts are stored in their recorded unit.

### 2.2 Find queries (content discovery)

```text
find:<target>{<filters>} in <scope> last <n><unit> where <agg>:<metric>{} <op> <number>
```

```text
find:note{tags:pr} in journal last 8w
find:block{text:"air squats",!source:feed} in all
find:effort{discipline:kettlebell,intensity:high}
find:note{} in journal where sum:totalVolume{discipline:strength} > 5000
```

- **Targets** (`WQL_FIND_TARGETS`): `note`, `block`, `effort`.
- **Scopes** (`WQL_SCOPES`): `journal`, `collections`, `feeds`, `all`.
- **Content filter keys** (`WQL_CONTENT_FILTER_KEYS`): `type`, `text`, `has`, `source`, `catalog`, plus the analytics tag keys.
- **`last <n>d|w`** is a time window; an explicit `{start, end}` range passed as an option overrides it.

### 2.3 Rows queries (the session results plane)

```text
rows[:<outputType>]{<scope filters>} last <n><unit>
```

```text
rows:{result:abc123}
rows:segment{block:content-id-xyz}
rows:{note:note-uuid} last 4w
```

- Scope filters are exactly `result:`, `block:`, or `note:` (exact values only — no negation, no wildcards).
- Rows **never aggregate**: `by`, `.rollup`, and `where` are rejected with a loud error.
- Rows re-derive output statements from raw `WorkoutResult` logs through `ResultLogStore` — they never touch the fact store.

### 2.4 Filter semantics

Tag filters live in `{…}` and follow Datadog conventions:

- **OR within a key**: `{effort:push-up|air-squat}` matches either.
- **AND across keys**: `{effort:push-up,discipline:bodyweight}` requires both.
- **Negation spans the value list**: `{!effort:burpee|box-jump}` excludes both.
- **Trailing `*` is a prefix wildcard**: `{effort:back*}` matches `back-squat`, `back-extension`, …
- **Quoted phrases** for multi-word text: `{text:"300 Air Squats"}`.
- **Colon values** for compound ids: `{source:collection:crossfit-girls}`.

### 2.5 Cross-store joins (`where`)

`where` joins the content plane and the analytics plane, in either direction:

```text
-- Direction 1: content restricted by a metric predicate
find:note{tags:competition} in journal where sum:totalVolume{discipline:strength} > 5000

-- Direction 2: a metric computed only over content matching a find
sum:totalVolume{} by {week} where find:note{tags:competition} in journal
```

Both directions are evaluated against **raw logs** joined at `blockContentId`, not against the fact store — the "logs win" rule.

---

## 3. Grammar design (why it looks this way)

The Lezer grammar (`grammar/wql.grammar`) is deliberately minimal:

```text
@top Query { Head Filters? GroupBy? Rollup? }

Head      { Aggregator colon Metric }
Aggregator{ Word }                              // validated semantically
Metric    { Word (dot Word)* }                  // dotted namespaces
Filters   { braceOpen (Filter (comma Filter)*)? braceClose }
Filter    { Negate? TagKey colon TagValue }
TagValue  { Value (pipe Value)* }               // OR-ed alternatives
Value     { Word (colon Word)? Star? | Quoted Star? }
GroupBy   { By braceOpen (Dimension (comma Dimension)*)? braceClose }
Rollup    { RollupDot parenOpen Int Word parenClose }
```

**Token discipline** (the load-bearing design note, from the grammar header):

> Keyword tokens with `@precedence` shadow every position **globally**, not per parser state. A `rollupUnit {"d"|"w"}` token made `week`, `day`, `wod.volume`, `discipline` unparseable. So the grammar lexes all words with a single `Word` token and lets **parser context** disambiguate; the AST mapper validates aggregators, dimensions, and the rollup unit **semantically**.

Structural literals that can never overlap a word position keep their own tokens: `by`, `.rollup`, `!`, `*`, `:`, `|`, `,`, `.`, braces, parens, and `"quoted"` phrases.

**Suffixes are stripped in JS, not lexed.** `where`, `in <unit>`, `last <n>w`, and `in <scope>` never appear in the grammar. `wqlSuffix.ts` (`parseWqlSuffixes`) removes them with anchored regexes before the Lezer parse:

- The `where` split is **brace-aware** (`splitAtWhere` scans at depth 0) so `{text:where}` inside filters is never mistaken for a join.
- `in` is ambiguous between *display unit* (`in kg`) and *scope* (`in journal`) — resolved by family: analytics queries treat a trailing `in <word>` as a display unit, find queries as a scope.
- Rows queries strip `by` / `.rollup` too, but only to report them as errors downstream ("rows never aggregates").

This split keeps the grammar small and recoverable (Lezer inserts ⚠ error nodes on malformed input; the mapper rejects any tree containing one) while leaving room for textual extensions without grammar churn.

---

## 4. The AST contract

`parseQuery(raw)` dispatches textually — leading `find:` → find, leading `rows` → rows, otherwise aggregate — and returns one of:

```typescript
interface ParsedQuery {              // aggregate family
  agg: Aggregator;                   // sum | avg | min | max | count | last | delta
  metric: string;                    // Canonical Metric Key
  filters: TagFilter[];
  groupBy: string[];                 // tag keys, or virtual dims: day | week | session | round
  rollup?: { size: number; unit: 'd' | 'w' };
  displayUnit?: string;              // `in kg`
  join?: FindPredicate;              // `where find:…`
  error?: string;
}

interface ParsedFindQuery {          // content-discovery family
  target: string;                    // note | block | effort
  filters: TagFilter[];
  scope?: string;                    // journal | collections | feeds | all
  last?: { size: number; unit: 'd' | 'w' };
  join?: MetricPredicate;            // `where sum:totalVolume{} > 5000`
  error?: string;
}

interface ParsedRowsQuery {          // rows family
  family: 'rows';
  outputType?: string;               // rows:segment{…} → 'segment'
  filters: TagFilter[];              // result: / block: / note: scopes
  last?: { size: number; unit: 'd' | 'w' };
  error?: string;
}

interface TagFilter {
  key: string;
  negate: boolean;
  values: { value: string; wildcard: boolean }[];
}
```

Validation is semantic: unknown aggregators produce `Unknown aggregator "foo". Try: sum, avg, …`; malformed text produces a family-specific `Cannot parse …` message. Type guards `isFindQuery` / `isRowsQuery` discriminate the union.

---

## 5. The Query Service execution model

`QueryService` runs aggregate queries as a **four-stage physical plan** (documented in the module header):

```text
SELECT     index-first: by-metric + by-timestamp fetches, intersected in memory
  │
BUCKET     assign each row to a time bucket (day / week / .rollup period)
  │
GROUP      fan rows out by tag dimensions (effort, discipline, …)
  │
AGGREGATE  fold each bucket's values with the aggregator
```

### 5.1 SELECT

```typescript
const byMetric = await this.store.getFactsByMetric(parsed.metric);
let candidates = byMetric;
if (options.rangeStart !== undefined || options.rangeEnd !== undefined) {
  const inRange = new Set((await this.store.getFactsByTimeRange(start, end)).map(r => r.id));
  candidates = candidates.filter(row => inRange.has(row.id));
}
const matched = this.applyEffortScope(
  candidates.filter(row => matchesFilters(row, parsed.filters, noteTags)), parsed);
```

- Index-first: two indexed fetches intersected in memory. Inputs are **uncapped by design** — personal-journal scale.
- The `tags` key is special: it resolves through the note's frontmatter tag labels (`getNoteTagLabels`), loaded lazily only when the query touches `tags`.
- **Effort-scope de-dup**: summary rows are emitted both per-effort and un-attributed. If the query groups or filters by `effort`, un-attributed rows are dropped (and vice versa) so totals are never double-counted.

### 5.2 BUCKET

Time dims and `.rollup` share one bucketing rule — `Math.floor(ts / bucketMs)` over the row's canonical `timestamp` (the workout's true end time, never the derivation time):

- `day` → 24h buckets, labeled by local date.
- `week` → Monday-aligned buckets (`w/MM-DD`).
- `.rollup(nw)` → n-week buckets; `.rollup(nd)` → n-day buckets.
- No time dim → a single bucket.

### 5.3 GROUP

Each row's group key is the join of its **dimension values** (`dimValue`):

- Virtual dims (`day`, `week`, `session`, `round`) are computed, not stored fields.
- Any other dim is read off the fact row via `factTagValue` (effort → `effortSlug`, discipline, intensity, note, page, origin, grain, metric, block, result, tags).
- A missing dimension value groups under `(none)`; multi-valued tags join with `,`.

### 5.4 AGGREGATE

Per bucket, values are first converted to the display unit (directive `in kg` > caller `preferredUnit` > fact unit), then folded:

| Aggregator | Fold |
| ------------ | ------ |
| `sum` | Σ values |
| `avg` | Σ / n |
| `min` / `max` | extremes |
| `count` | row count (not value count) |
| `last` | value of the newest row by timestamp |
| `delta` | last − first within the ordered series |

Output is a `QueryResult`:

```typescript
interface QueryResult {
  parsed: ParsedQuery;
  series: Series[];           // one per group; points sorted by bucket
  stages: { selected; buckets; aggregated; groups };  // observability counts
  matched: AnalyticsDataPoint[];   // the surviving fact rows
  scalar?: number;            // set when the result is exactly one point
  unit?: string;
}
```

Widgets and tables are dumb consumers of this shape; `stages` exists so UIs can show "selected 1,204 rows → 26 buckets → 3 groups" for transparency.

### 5.5 Cross-store join execution

- **Direction 1** (find + metric predicate): resolve the `blockContentId`s owned by candidate notes/blocks → `deriveMetricFacts` re-derives summary facts from each matching result's raw logs → aggregate per content id → keep ids passing `<op> <threshold>` → filter the content set to owners.
- **Direction 2** (aggregate + find predicate): run the find half → collect owned `blockContentId`s → re-derive the metric from raw logs for exactly those ids → run the normal SELECT/BUCKET/GROUP/AGGREGATE over the derived facts.

`deriveMetricFacts` calls `normalizeSummaryFacts(result.data.logs, identity)` per result — the same function used to build the store — so a join result is *identical* to what the store would hold. That's what "logs win" means operationally.

### 5.6 Rows execution

`runRows` bypasses the fact store entirely: fetch `WorkoutResult`s by `result:`/`block:`/`note:` scope, filter by time window, sort newest-first, optionally narrow logs to `outputType`, and return `{ result, logs }[]` — the wide per-round view that aggregate families can't express.

### 5.7 Find execution

Find is naive in-memory filtering at personal-journal scale: scope-select (journal notes + optional static corpus), apply `source:`/`tags`/`text`/`type`/`catalog` filters, apply the time window, then the optional metric join. The **static corpus** (bundled collections/feeds) arrives through `staticNoteStore`/`staticBlockStore` — pure projections (`static.ts`) of a block index, including a frontmatter tag index so `tags:` clauses work over bundled content.

**Time-window anchoring**: windows anchor to `Date.now()` by default (`'wall-clock'`), or to the newest `createdAt` in the scope selection (`'latest-activity'`), or to an explicit `anchorNow` (tests/replay).

---

## 6. The fact pipeline: how logs become queryable rows

Facts are `AnalyticsDataPoint` rows (`@bitcobblers/wod-wiki-core`):

```typescript
interface AnalyticsDataPoint {
  id: string;
  noteId: string;  blockContentId?: string;  resultId: string;
  grain?: 'segment' | 'summary' | 'rollup';
  metricKey?: string;  metricLabel?: string;  metricUnit?: string;
  value: unknown;  unit?: string;
  effortSlug?: string;  discipline?: string;  intensityTier?: string;  grade?: string;
  segmentId: string;  segmentVersion: number;
  origin?: ResultOrigin;  pageId?: string;
  timestamp: number;   // canonical workout time (workout end)
  createdAt: number;   // when the row was written
}
```

**Three grains** (`WQL_GRAINS`):

- `summary` — Tier-2 workout-level aggregates, one row per result × canonical key × sorted group tags (`totalVolume:effort=thruster`). Keep-last dedupe within a result.
- `segment` — per-segment numeric metrics, denormalized for indexed threshold filters.
- `rollup` — windowed facts (ACWR, monotony, strain) computed lazily on analytics-surface open; recompute-on-open only, no scheduler.

**Normalization** (`derivation.ts`): `normalizeSummaryFacts` scans a result's logs for `outputType: 'analytics'` statements, reads the `Label` metric as the projection name and the numeric value metric, and emits fact rows. The **Canonical Metric Key** comes from the processor's `metadata.canonicalKey` when present (composed calcs), else is derived from the projection name (`'Total Volume' → 'totalVolume'`). Summary processors hang `effortSlug` / `effortDiscipline` / `effortIntensityTier` / `groupTags` on the value metric's `metadata` — pure data that survives the stored-logs round trip.

---

## 7. Vocabulary reference

All of these live in `vocabulary.ts` — the single dictionary every surface (composer, typeahead, dashboard gate) imports from.

| Constant | Values |
| ---------- | -------- |
| `WQL_AGGREGATORS` | `sum`, `avg`, `min`, `max`, `count`, `last`, `delta` |
| `WQL_COMPARISON_OPS` | `>`, `>=`, `<`, `<=`, `==`, `!=` |
| `WQL_METRIC_FAMILIES` | `reps`, `distance`, `resistance`, `elapsed`, `power`, `pace` |
| `WQL_METRIC_AGGREGATES` | `totalVolume`, `totalDistance`, `tis`, `sessionLoad` |
| `WQL_TAG_KEYS` | `effort`, `discipline`, `intensity`, `note`, `page`, `origin`, `grain`, `metric`, `block`, `result`, `tags` |
| `WQL_VIRTUAL_DIMS` | `day`, `week`, `session`, `round` |
| `WQL_FIND_TARGETS` | `note`, `block`, `effort` |
| `WQL_SCOPES` | `journal`, `collections`, `feeds`, `all` |
| `WQL_CONTENT_FILTER_KEYS` | `type`, `text`, `has`, `source`, `catalog`, + tag keys |
| `WQL_SOURCES` | `journal`, `collections`, `feeds`, `notes`, `blocks`, `efforts`, `metrics` (composer planes) |
| `WQL_GRAINS` | `segment`, `summary`, `rollup` |
| `WQL_ROLLUP_PERIODS` | `1d`, `1w` (grammar accepts any `Nd`/`Nw`) |
| `WQL_DISPLAY_UNITS` | `kg`, `lb` (canonical options; `in <word>` accepts any) |
| `WQL_INTENSITY_TIERS` | `low`, `moderate`, `high` |
| `WQL_CALC_TARGETS` | `calc.metMinutes`, `calc.acwr`, `calc.monotony`, `calc.strain`, `calc.e1rm`, `calc.ctl`, `calc.atl`, `calc.tsb`, `calc.soreness`, `calc.sleep`, `calc.hrv`, `calc.readiness`, `calc.mvcBw`, `calc.ef`, `calc.adherence`, `calc.pct1rm`, `calc.sends` |

`WQL_CALC_TARGETS` must stay in sync with the CalcEngine seeds in `@bitcobblers/wod-wiki-lang`; a cross-package test enforces alignment. `calc.pmc` is deliberately absent — PMC ships as the three loads (`ctl`/`atl`/`tsb`) because the store calc model publishes one scalar key per definition.

**Unit conversion** (`units.ts`) is narrow and pure: mass (`kg` ↔ `lb`, exact `0.45359237`) and distance (`m` ↔ `km`). Unknown or cross-family units pass through unchanged.

**Rollup math** lives in lang (`analytics/rollup/workloadRollup.ts`) — Foster sRPE periodization over daily `sessionLoad`: acute = mean of trailing 7 days, chronic = mean of trailing 28, `ACWR = acute/chronic`, `monotony = mean7/sd7`, `strain = monotony × Σ7`. Day buckets are UTC — the same bucketing the Query Service uses for the `day` dimension.

---

## 8. Dashboards: WQL as a document format

A dashboard is a markdown note with `dashboard: true` frontmatter; each ` ```query[:<type>][-<N>|-full] ` block is one widget whose body is one WQL line plus optional `/`-separated positional params.

```markdown
---
dashboard: true
dashboard.window: [4w, 12w, 26w]
---

# Volume trend

```query:timeseries-2
sum:totalVolume{} by {week}
```

# Heaviest pulls

```query:toplist
max:resistance{discipline:strength} by {effort}
```


- **Widget types** (`DASHBOARD_WIDGET_TYPES`): `table` (default), `value`, `timeseries`, `bar`, `toplist`, `stacked-bar`, plus `goal-rings` / `zone-distribution` placeholders.
- **Grid**: `-N` spans N of `DASHBOARD_GRID_MAX_COLS = 4` columns; `-full` takes the row.
- **Tokens**: `dashboard.*` frontmatter keys become controls; queries reference them as `$name` and are substituted as raw text at execution time; control edits write back to frontmatter.
- **Proposed metrics**: a `calc.*` key not yet in `WQL_CALC_TARGETS` renders a labeled placeholder badge instead of failing.
- The model (`dashboard/model.ts`, `parser.ts`, `frontmatter.ts`, `scaffold.ts`) is pure — no React, no QueryService — so the editor, the inline renderer, and the `/analytics/dashboard` route all share it.

---

## 9. Store seams (dependency inversion)

```typescript
interface FactQueryStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]>;
  getNoteTagLabels(noteId: string): Promise<string[]>;
}
interface NoteQueryStore   { getAllNotes(): Promise<Note[]>; getNoteIdsForTag(label): Promise<Set<string>>; }
interface BlockQueryStore  { getAllBlocks(): Promise<BlockIndexRow[]>; }
interface EffortQueryStore { getAllEfforts(): Promise<IEffort[]>; }
interface ResultLogStore {
  getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]>;
  getResultById(resultId: string): Promise<WorkoutResult | undefined>;
  getResultsForNote(noteId: string): Promise<WorkoutResult[]>;
}
```

The app implements these over IndexedDB; tests and the CLI use `inMemoryFactStore` from `@bitcobblers/wod-wiki-engine`. Any missing store defaults to an empty implementation, so partial wiring degrades to empty results rather than crashes.

## 10. Errors and edge cases

- Parse errors are values, not exceptions: every `Parsed*` carries `error?: string`; executors return empty results with the error attached.
- Lezer error recovery: any ⚠ node in the tree → family-specific `Cannot parse "…"` message.
- Rollup units are validated semantically — only `d` and `w`.
- A rows query with `by` / `.rollup` / `where` fails loudly ("rows never aggregates").
- A `where` on an analytics query must be a `find:…` half (and vice versa) — a same-plane join is a no-op and rejected.
- Negated or wildcard `result:`/`block:`/`note:` scopes in rows are rejected.

## 11. Using WQL from code

```typescript
import { QueryService, parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-wql';

// Parse only (editor/typeahead/diagnostics)
const parsed = parseQuery('sum:totalVolume{discipline:strength} by {week}');

// Execute against injected stores
const qs = new QueryService({ factStore, noteStore, blockStore, resultStore, effortStore });
const result = await qs.runQuery('sum:totalVolume{discipline:strength} by {week}', {
  preferredUnit: 'kg',
});
for (const s of result.series) console.log(s.label, s.points);

// CLI (engine package)
//   wod query "sum:reps{} by {effort}" --format table
```

## 12. Extending the system

| You want to… | Do this |
| -------------- | --------- |
| Add a queryable metric | Emit it as a summary processor output (lang); it lands in facts via `normalizeSummaryFacts`. Add the key to `WQL_METRIC_AGGREGATES`/`WQL_CALC_TARGETS` if it's a new canonical key. |
| Add a calc target | Register the calc in lang's CalcEngine seeds **and** add the key to `WQL_CALC_TARGETS` (the cross-package test enforces parity). |
| Add a tag dimension | Stamp the field on fact rows in derivation + add the key to `WQL_TAG_KEYS` + map it in `factTagValue`. |
| Add a virtual dimension | Add to `WQL_VIRTUAL_DIMS` + implement in `dimValue`/bucketing. |
| Back the store differently | Implement the store interfaces — nothing else changes. |
| Add an aggregator | Add to `WQL_AGGREGATORS` + fold in `aggregate()` + CodeMirror vocabulary. |

---

## See also

- [`08-analytics.md`](./08-analytics.md) — metrics, grains, canonical keys (app-level view)
- [`04-metric-lifecycle.md`](./04-metric-lifecycle.md) — how metrics get their origins
- `wod-wiki-engine/packages/wql/src/grammar/wql.grammar` — the grammar source of truth
- `wod-wiki-engine/packages/wql/src/vocabulary.ts` — the dictionary source of truth
