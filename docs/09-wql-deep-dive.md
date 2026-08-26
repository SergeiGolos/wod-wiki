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
├── stores.ts                ← UnifiedEventStore / NoteQueryStore / BlockQueryStore / EffortQueryStore
├── derivation.ts            ← logs → event rows + summary rows (toEventRows / toSummaryEventRows / projectEventToFacts)
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
| **Aggregate** | `sum:totalVolume{discipline:strength} by {week} last 6w` | "How much/how many over my training history?" |
| **Rows** | `rows:segment{result:abc123} last 4w` | "Show me the raw per-segment log of this run." |
| **Find** (deprecated alias of rows on content planes) | `find:note{tags:strength,source:journal} last 8w` | "Which notes/blocks/efforts match?" |

`rows:<target>` is the list-returning form for **every** plane — result
planes narrow the promoted `outputType` column, content planes (`note`,
`block`, `effort`) scope by content id, and `rows:all` is the explicit
no-narrowing pseudo-target. `find:` still parses and executes content
discovery (the composer and older dashboards emit it), but new surfaces
should prefer `rows:note|block|effort{…}`.

Two design principles govern everything below:

1. **Logs win; the store is their projection.** `WorkoutResult.data.logs` is the authoritative record for a single workout; the unified event store is the queryable projection of that stream (finalize-owned summaries, ticket 005). Cross-store joins re-derive from logs rather than trusting projections.
2. **The store seam is inverted.** `QueryService` has zero IndexedDB/storage imports. All persistence is injected through the store interfaces (`stores.ts`), so the service is 100% pure and testable with in-memory fakes.

```text
WorkoutResult.data.logs (authoritative)
        │  toEventRows() + toSummaryEventRows()
        ▼
Events Store (UnifiedEventRecord: grain 'event' | 'summary')
        │  projectEventToFacts() folds rows to flat facts at read
        ▼
QueryService — SELECT → BUCKET → GROUP → AGGREGATE (window-first hybrid:
                   by-timestamp when windowed, full scan otherwise; by-metric never used)
        │
        ▼
QueryResult { series, scalar, matched } → widgets/tables (dumb consumers)
```

---

## 2. The language surface

### 2.1 Aggregate queries

```text
<agg>:<metric.key>{<tag filters>} [by {<dimensions>}] [.rollup(<period>)] [in <unit>] [<window>] [where find:…]

window := last <n><d|w> | from <YYYY-MM-DD> [to <YYYY-MM-DD>]
```

```text
sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w) last 6w
avg:tis{effort:back*} by {session}
max:resistance{effort:back-squat} in kg
sum:tis{} from 2026-01-01 to 2026-03-31 by {week}
last:calc.acwr{}
```

- **Aggregators** (`WQL_AGGREGATORS`): `sum`, `avg`, `min`, `max`, `count`, `last`, `delta`.
- **Metric namespaces** are Canonical Metric Keys: families (`reps`, `distance`, `resistance`, `elapsed`, `power`, `pace`), Tier-2 aggregates (`totalVolume`, `totalDistance`, `tis`, `sessionLoad`), effort-scoped keys (`<effortSlug>.<family>`), and calc targets (`calc.acwr`, `calc.e1rm`, `calc.metMinutes`, … — see `WQL_CALC_TARGETS`).
- **`in <unit>`** is a display-unit directive (`in kg`, `in lb`) — conversion happens at read time, facts are stored in their recorded unit. `in` means units on **every** family (C2); provenance is a `source:` filter, never an `in` clause.
- **`<window>`** (C1) is one time-selection clause, legal on every family: `last 6w` is relative to the anchor (wall clock by default), `from … to …` is a civil-date range (local-midnight semantics, inclusive end day). One window per query — `last` and `from` are mutually exclusive (C3 conflict).

### 2.2 Find queries (content discovery) — deprecated alias

`find:` is the legacy head for content discovery; it still parses and
executes, but the modern form is `rows:note|block|effort{…}` (see §2.3).
Provenance is a **`source:` filter** inside the braces (C2) — the legacy
trailing `in <scope>` still parses (rewritten by the compat normalizer with
a deprecation advisory), but new queries should not use it.

```text
find:<target>{<filters incl. source:> [<window>]} [where <agg>:<metric>{} <op> <number>]
```

```text
find:note{tags:pr,source:journal} last 8w
find:block{text:"air squats",!source:feed}
find:effort{discipline:kettlebell,intensity:high}
find:note{source:journal} where sum:totalVolume{discipline:strength} > 5000
```

- **Targets** (`WQL_FIND_TARGETS`): `note`, `block`, `effort` (C7 closed enum — an unknown target is a parse error listing the valid ones).
- **Sources** (`WQL_SOURCE_VALUES`): `journal`, `collections`, `feeds`, `all`, plus `collection:<id>` / `feed:<id>` compound values. `all` is the default — omit it.
- **Content filter keys** (`WQL_CONTENT_FILTER_KEYS`): `type`, `text`, `has`, `source`, `catalog`, plus the analytics tag keys.
- **`<window>`** (C1) — same clause as every family; the legacy `last` field name survives only in the join-half AST.

### 2.3 Rows queries (the results plane)

```text
rows:<target>{<scope filters>} [<window>]
```

```text
rows:all{result:abc123}
rows:segment{block:content-id-xyz}
rows:all{note:note-uuid} last 4w
rows:note{note:note-uuid}
```

- The **target is required** (C4): `rows:all` is the explicit no-narrowing pseudo-target; bare `rows:{…}` is rewritten by the compat normalizer with a deprecation advisory.
- **Result-plane targets** (`WQL_RESULT_PLANES` — the store's known `outputType` values: `segment`, `analytics`, `wellness`, `load`, `event`, `system`, `compiler`, `completion`) narrow the promoted column.
- **Content-plane targets** (`note`, `block`, `effort`) scope by content id instead of narrowing — `rows:note{note:note-uuid}` and `rows:all{note:note-uuid}` are equivalent.
- **Scope filters** (`WQL_ROWS_SCOPE_KEYS`) are exactly `result:`, `block:`, or `note:` (exact values only — no negation, no wildcards); execution requires at least one.
- Rows **never aggregate**: `by`, `.rollup`, and `where` are rejected with a loud error.
- Rows read event rows directly from the unified store — no WorkoutResult blob parsing.


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
find:note{tags:competition,source:journal} where sum:totalVolume{discipline:strength} > 5000

-- Direction 2: a metric computed only over content matching a find
sum:totalVolume{} by {week} where find:note{tags:competition,source:journal}
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

**Suffixes are stripped in JS, not lexed.** `where`, `in <unit>`, windows (`last <n>d|w`, `from … to …`), and the legacy `in <scope>` never appear in the grammar. `wqlSuffix.ts` (`parseWqlSuffixes`) removes them with anchored, right-to-left regexes before the Lezer parse — peel order: `window` → `displayUnit` → `.rollup` → `by {}`; `where` still splits first (brace-aware):

- `in` is no longer ambiguous (C2): it is a **display unit** on every family. The legacy find/rows `in <scope>` is detected, rewritten into a `source:` filter by the compat normalizer, and reported as a deprecation advisory.
- Duplicate clauses of the same kind are a **parse error naming both spans** (C3) — never rightmost-wins. `last` + `from` together is the same conflict.
- Rows queries strip `by` / `.rollup` too, but only to report them as errors downstream ("rows never aggregates").

This split keeps the grammar small and recoverable (Lezer inserts ⚠ error nodes on malformed input; the mapper rejects any tree containing one) while leaving room for textual extensions without grammar churn.

---

## 4. The AST contract
`parseQuery(raw)` dispatches textually — leading `find:` → find, leading `rows` → rows, otherwise aggregate — and returns one of the **C5 discriminated-union** variants (`family` on every member):

```typescript
type AnyParsedQuery =
  | ParsedAggregateQuery    // family: 'aggregate'
  | ParsedFindQuery         // family: 'find'
  | ParsedRowsQuery;        // family: 'rows'

interface ParsedAggregateQuery {
  family: 'aggregate';
  raw: string;
  agg: Aggregator;                   // sum | avg | min | max | count | last | delta
  metric: string;                    // Canonical Metric Key
  filters: TagFilter[];
  groupBy: string[];                 // tag keys, or virtual dims: day | week | session | round
  rollup?: { size: number; unit: 'd' | 'w' };
  window?: QueryWindow;              // C1 — `last 6w` / `from … [to …]`
  displayUnit?: string;              // `in kg`
  join?: FindPredicate;              // `where find:…`
  advisories?: string[];             // C2 deprecation notices (legacy syntax used)
  error?: string;
}

interface ParsedFindQuery {
  family: 'find';
  raw: string;
  target: string;                    // note | block | effort (C7 closed enum)
  filters: TagFilter[];              // provenance lives here: source:journal
  window?: QueryWindow;              // C1
  join?: MetricPredicate;            // `where sum:totalVolume{} > 5000`
  advisories?: string[];
  error?: string;
}

interface ParsedRowsQuery {
  family: 'rows';
  raw: string;
  outputType?: string;               // rows:segment{…} → 'segment'; absent for rows:all
  filters: TagFilter[];              // result: / block: / note: scopes
  window?: QueryWindow;              // C1
  advisories?: string[];
  error?: string;
}

/** C1 — one time-selection clause, legal on every family. */
type QueryWindow =
  | { kind: 'relative'; size: number; unit: 'd' | 'w' }          // last 6w
  | { kind: 'range'; start: string; end?: string };              // from 2026-01-01 [to …]

interface TagFilter {
  key: string;
  negate: boolean;
  values: { value: string; wildcard: boolean }[];
}
```

Validation is semantic: unknown aggregators produce `Unknown aggregator "foo". Try: sum, avg, …`; unknown find/rows targets produce the same shape listing `WQL_FIND_TARGETS` / `WQL_ROWS_TARGETS` (C7); duplicate suffix clauses produce a conflict naming both spans (C3). Type guards `isFindQuery` / `isRowsQuery` discriminate the union. `serialize(parsed)` (C6) renders any variant back to canonical text — the fixed point of `parse ∘ serialize`.


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
// C1: explicit range options win; otherwise the parsed window drives a
// by-timestamp fetch; no window scans all-time.
const range = options.rangeStart !== undefined || options.rangeEnd !== undefined
  ? { start: options.rangeStart ?? 0, end: options.rangeEnd ?? Number.MAX_SAFE_INTEGER }
  : windowRange(parsed.window);
const eventRows = range
  ? await this.store.getEventsByTimeRange(range.start, range.end)
  : await this.store.scanAll();
const candidates = eventRows
  .flatMap(projectEventToFacts)
  .filter(row => row.metricKey === parsed.metric);
const matched = this.applyEffortScope(
  candidates.filter(row => matchesFilters(row, parsed.filters, noteTags)), parsed);
```

- **Window-first hybrid**: a window (textual or options) fetches through by-timestamp — the one proven culling index; all-time queries scan. by-metric is never used (measured non-selective and slower than scanning).
- The window resolves through `windowRange(parsed.window)` — relative windows anchor to `Date.now()` (`'wall-clock'`), the scope's newest activity (`'latest-activity'`), or an explicit `anchorNow` (tests/replay).
- The `tags` key is special: it resolves through the note's frontmatter tag labels (`getNoteTagLabels`), loaded lazily only when the query touches `tags`.
- **Effort-scope de-dup**: summary rows are emitted both per-effort and un-attributed. If the query groups or filters by `effort`, un-attributed rows are dropped (and vice versa) so totals are never double-counted.

### 5.2 BUCKET

Time dims and `.rollup` share one bucketing rule — `Math.floor(ts / bucketMs)` over the row's canonical `timestamp` (the workout's true end time, never the derivation time). Group keys are **local civil ISO dates** (v2 decision): `day` → the local date's `YYYY-MM-DD`; `week` → the civil Monday's `YYYY-MM-DD`:

- `day` → 24h buckets keyed by local civil date.
- `week` → Monday-aligned buckets keyed by the Monday's `YYYY-MM-DD`.
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

`runRows` bypasses the projected fact view and reads **event rows directly** from the unified store: scope filters (`result:`/`block:`/`note:` — at least one required, validated at parse) fetch through `getEventsByResult`/`getEventsByContent`/`getEventsForNote`, groups are filtered by the parsed `window`, sorted newest-first, and event rows are narrowed to the `outputType` target (skipped for content-plane targets). Returns `runs: { resultId, noteId, timestamp, events: UnifiedEventRecord[] }[]` — the wide per-round view aggregate families can't express.

### 5.7 Find execution

Find is naive in-memory filtering at personal-journal scale: scope-select (journal notes + optional static corpus), apply `source:`/`tags`/`text`/`type`/`catalog` filters, apply the time window, then the optional metric join. The **static corpus** (bundled collections/feeds) arrives through `staticNoteStore`/`staticBlockStore` — pure projections (`static.ts`) of a block index, including a frontmatter tag index so `tags:` clauses work over bundled content.

**Time-window anchoring**: windows anchor to `Date.now()` by default (`'wall-clock'`), or to the newest `createdAt` in the scope selection (`'latest-activity'`), or to an explicit `anchorNow` (tests/replay).

---

## 6. The fact pipeline: how logs become queryable rows

Facts are `AnalyticsDataPoint` rows (`@bitcobblers/wod-wiki-core`):

```typescript
interface AnalyticsDataPoint {   // flat fact currency — projected from event rows, never stored
  id: string;
  noteId: string;  blockContentId?: string;  resultId: string;
  grain?: 'event' | 'summary';
  metricKey?: string;  metricLabel?: string;  metricUnit?: string;
  value: unknown;  unit?: string;
  effortSlug?: string;  discipline?: string;  intensityTier?: string;  grade?: string;
  segmentId: string;  segmentVersion: number;
  origin?: ResultOrigin;  pageId?: string;
  timestamp: number;   // canonical workout time (workout end)
  createdAt: number;   // when the row was written
}
```

**Two grains** (`WQL_GRAINS`):

- `summary` — workout-level aggregates, one row per result × canonical key × sorted group tags. Engine-authored summaries are finalize-owned; user-authored (wellness, origin 'user') are reconcile-owned.
- `event` — one row per output statement (the old 'segment' grain renamed).
- `rollup` is RETIRED (parse-time error) — rollups are read-time math via the `.rollup` suffix, never stored.

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
| `WQL_SOURCE_VALUES` | `journal`, `collections`, `feeds`, `all` (+ `collection:<id>`, `feed:<id>`) — the C2 `source:` filter vocabulary |
| `WQL_CONTENT_FILTER_KEYS` | `type`, `text`, `has`, `source`, `catalog`, + tag keys |
| `WQL_SOURCES` | `journal`, `collections`, `feeds`, `notes`, `blocks`, `efforts`, `metrics` (composer planes) |
| `WQL_RESULT_PLANES` | the store's known `outputType` values: `segment`, `analytics`, `wellness`, `load`, `event`, `system`, `compiler`, `completion` |
| `WQL_ROWS_TARGETS` | `WQL_FIND_TARGETS` + `WQL_RESULT_PLANES` + `all` |
| `WQL_ROWS_SCOPE_KEYS` | `result`, `block`, `note` |
| `WQL_GRAINS` | `summary`, `event` (`rollup` retired — parse-time error) |
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
interface UnifiedEventStore {
  // reads (all return UnifiedEventRecord[])
  getEventsByTimeRange(start, end): Promise<…>;   // windowed — by-timestamp index
  getEventsByResult(resultId): Promise<…>;        // by-result-grain index
  getEventsForNote(noteId): Promise<…>;           // join through results store
  getEventsByContent(blockContentId): Promise<…>; // by-content-grain index (join hot path)
  scanAll(): Promise<…>;                          // all-time SELECT leg
  // writes (write-path lifecycle owns these)
  appendEvents(rows): Promise<void>;               // per-statement flush / wellness upserts
  finalizeSummaries(resultId, rows): Promise<void>;// atomic: clear engine-authored summaries + write finals
  deleteEvents(ids): Promise<void>;                // wellness reconcile + GC sweeps
}
interface NoteQueryStore   { getAllNotes(): Promise<Note[]>; getNoteIdsForTag(label): Promise<Set<string>>;
                             getNoteTagLabels(noteId): Promise<string[]>; }  // moved from the retired FactQueryStore
interface BlockQueryStore  { getAllBlocks(): Promise<BlockIndexRow[]>; }
interface EffortQueryStore { getAllEfforts(): Promise<IEffort[]>; }
```

## 10. Errors and edge cases

Parse errors are **values, not exceptions** (error-as-value): every `Parsed*` carries `error?: string`; executors return empty results with the error attached. The catalog:

- Lezer error recovery: any ⚠ node in the tree → family-specific `Cannot parse "…"` message.
- **C3 suffix conflicts**: duplicate clauses of one kind → `Duplicate '<kind>' clause: '<span A>' conflicts with '<span B>'` (one line naming both spans); `last` + `from` together conflicts the same way; range windows on join halves are rejected.
- **C7 source validation**: unknown `source:` values → `Unknown source "…". Try: journal, collections, feeds, all (or collection:<id>, feed:<id>)`.
- **Retired grain**: `grain:rollup` is a parse-time error — rollups are read-time math via `.rollup`.
- Rollup units are validated semantically — only `d` and `w`.
- A rows query with `by` / `.rollup` / `where` fails loudly ("rows never aggregates").
- A `where` on an analytics query must be a `find:…` half (and vice versa) — a same-plane join is a no-op and rejected.
- Negated or wildcard `result:`/`block:`/`note:` scopes in rows are rejected.
- **Deprecation advisories** (not errors): legacy syntax parses but attaches `advisories` — bare `rows:{…}` → "use `rows:all{…}`", legacy `in <scope>` → "use `source:<scope>` filter".

## 11. Using WQL from code

```typescript
import { QueryService, parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-wql';

// Parse only (editor/typeahead/diagnostics)
const parsed = parseQuery('sum:totalVolume{discipline:strength} by {week} last 6w');

// Execute against injected stores
const qs = new QueryService({ eventStore, noteStore, blockStore, effortStore });
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
