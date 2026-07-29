# Research: WQL `find:` grammar for cross-store content queries (#782)

## 1. Current WQL grammar, AST contract, and extension points

### 1.1 Grammar shape
`src/grammar/wql.grammar` defines a single `@top` production:

```lezer
@top Query { Head Filters? GroupBy? Rollup? }
Head { Aggregator colon Metric }
Aggregator { Word }
Metric { Word (dot Word)* }
Filters { braceOpen (Filter (comma Filter)*)? braceClose }
Filter { Negate? TagKey colon TagValue }
TagKey { Word }
TagValue { Word Star? (pipe Word Star?)* }
GroupBy { By braceOpen (Dimension (comma Dimension)*)? braceClose }
Dimension { Word }
Rollup { RollupDot parenOpen Int Word parenClose }
```

All identifiers are lexed as one `Word` token; the AST mapper (`src/services/analytics/query/wql.ts`) validates aggregators, dimensions, and the rollup unit semantically. This avoids the precedence problems the comment describes: keyword tokens with global precedence shadow words everywhere.

### 1.2 AST contract
`src/services/analytics/query/wql.ts` exports:

- `type Aggregator = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last' | 'delta'`
- `interface TagFilter { key: string; negate: boolean; values: { value: string; wildcard: boolean }[] }`
- `interface ParsedQuery { raw: string; agg: Aggregator; metric: string; filters: TagFilter[]; groupBy: string[]; rollup?: { size: number; unit: 'd' | 'w' }; displayUnit?: string; error?: string }`
- `export const WQL_AGGREGATORS: Aggregator[]` (reused by the language support).

`parseQuery(raw)` strips an optional `in <unit>` suffix with a regex (`DISPLAY_UNIT_RE`), parses with `wqlParser.parse()`, and walks the recovered tree using `wql.parser.terms.ts` constants (`Head`, `Aggregator`, `Metric`, `Filters`, `Filter`, `TagKey`, `TagValue`, `GroupBy`, `Dimension`, `Rollup`, `Int`, `Word`, `Star`, `Negate`). It returns a `ParsedQuery` with `error` populated when Lezer recovery inserts error nodes, when the aggregator is unknown, or when the rollup unit is not `d`/`w`.

### 1.3 Cleanest grammar extension points
The current grammar has no concept of **query target** (fact vs. note vs. block) or **scope** (`journal`, `collections`, `feeds`, `all`). Three extension strategies are possible:

1. **Extend the same grammar** (`wql.grammar`). Add a new top-level alternative or optional prefix:
   - `FindQuery { find colon Target Filters? WhereClause? ScopeClause? TimeClause? }`
   - `Target { note | block | result }`
   - `ScopeClause { in Word }`  (`journal` | `collections` | `feeds` | `all`)
   - `TimeClause { last Int Word }`  (`1w`, `8w`, …)
   - `WhereClause { where FindPredicate }`
   Because structural literals need their own tokens, `find`, `in`, `last`, `where`, `note`, `block`, `result` must become dedicated `@tokens` (or parse-time keywords) rather than generic `Word`s. This is exactly the trade-off the grammar comment warns about: adding keyword tokens risks shadowing metric/tag/dimension words globally.
2. **Sibling grammar sharing the composer vocabulary**. Keep `wql.grammar` for analytics facts and add `wql-find.grammar` for content queries. Both import the same token helpers and reuse `src/parser/wql-language.ts` vocabulary lists. The front-end dispatches to the right parser based on a leading `find:` sigil. This is lower risk because the fact grammar remains untouched, but it duplicates brace/filter syntax and requires two generated parsers.
3. **One grammar, two AST shapes**. Extend `wql.grammar` with an optional leading `find:` clause and a trailing scope/time clause, then have `parseQuery` return a discriminated union: `ParsedQuery` for facts and `ParsedFindQuery` for content. The composer and executor switch on a new `target` field.

**Recommendation within this research:** Option 3 is the cleanest for users (one language) and tooling (one CodeMirror grammar, one parser file). It requires adding only four structural tokens (`find`, `in`, `last`, `where`) and treating them as parse-context keywords, not global shadow tokens. Option 2 is a safe fallback if the keyword-shadowing risk proves real during implementation.

### 1.4 Regenerating the Lezer parser
The repo has **no package script** that regenerates `wql.parser.ts` / `wql.parser.terms.ts`. `@lezer/generator` is listed in `devDependencies` (`package.json:116`) and `AGENTS.md`/`CLAUDE.md` state the whiteboard grammar is regenerated via `lezer-generator`. The generated headers on both `src/grammar/wql.parser.ts` and `src/grammar/wql.parser.terms.ts` confirm the source.

The standard Lezer CLI invocation for this repo would be:

```bash
npx lezer-generator --typeScript src/grammar/wql.grammar -o src/grammar/wql.parser
```

This produces `src/grammar/wql.parser.ts` and `src/grammar/wql.parser.terms.ts`. Any grammar change is incomplete until this command is re-run and the generated files are committed. A `package.json` script should be added (e.g. `"generate:wql": "lezer-generator --typeScript src/grammar/wql.grammar -o src/grammar/wql.parser"`) so the regeneration step is discoverable and repeatable.

## 2. How the four-stage QueryService would accommodate content targets

### 2.1 Current executor
`src/services/analytics/query/QueryService.ts` implements the physical plan documented in its header:

```
SELECT (index-first: by-metric + by-timestamp IDBKeyRange fetches, intersected in memory)
BUCKET (time dim or rollup period)
AGGREGATE (per bucket)
GROUP (tag-dimension fan-out)
```

Key seams:

- **Injectable store interface** `FactQueryStore` at `QueryService.ts:18`:
  ```ts
  export interface FactQueryStore {
    getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
    getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]>;
    getNoteTagLabels(noteId: string): Promise<string[]>;
  }
  ```
  `QueryService` receives this in its constructor; the default is `indexedDbFactStore`.
- **Stage 1 SELECT** (`QueryService.ts:80–101`) fetches by metric, optionally intersects by time range, and loads note tag labels only when filters/group-by touch `tags`.
- **`matchesFilters`** (`QueryService.ts:56–74`) uses `factTagValue` to resolve tag keys against an `AnalyticsDataPoint`.
- **`dimValue`** (`QueryService.ts:76–87`) resolves grouping dimensions; `day`/`week`/`session` are virtual.
- **Stage 3+4 GROUP/AGGREGATE** (`QueryService.ts:126–168`) builds `Map<string, AnalyticsDataPoint[]>` groups, then buckets by time, then produces `Series[]`.

`QueryResult` (`QueryService.ts:34`) currently carries `series: Series[]`, `matched: AnalyticsDataPoint[]`, a scalar, and pipeline stage counts.

### 2.2 Mapping content targets onto the same plan
Content queries read:

- **Notes**: `INotePersistence.listNotes(NoteQuery)` (`src/services/persistence/IndexedDBNotePersistence.ts:93`). `NoteQuery` supports `ids`, `dateRange`, `daysBack`, `tags`, `search`, `limit`/`offset`, `projection`, `journalDate`, and `kind` (`src/services/persistence/types.ts:48`). Today `search` is an in-memory substring over `title + rawContent`.
- **Collections/Feeds**: `getGroupings('collections' | 'feeds')` in `src/repositories/script-groupings.ts:137`. These are build-time static markdown globs (`import.meta.glob`) with no runtime index.
- **Blocks**: there is no block index today. `NoteSegment` rows have `[id, version]` compound keys and carry `noteId`, `dataType`, and `rawContent` (`src/types/storage.ts:52`). `WorkoutResult` carries `noteId`, `segmentId`, and `blockContentId` (`src/types/storage.ts:102`), but no `find:`-style block search exists.

Two architectural options:

1. **One executor with source routing by target**. Add a new `ContentQueryStore` interface alongside `FactQueryStore`:
   ```ts
   interface ContentQueryStore {
     listNotes(query: NoteQuery): Promise<HistoryEntry[]>;
     getGroupings(root: 'collections' | 'feeds'): Grouping[];
     // future: listSegments(query), listResults(query)
   }
   ```
   `QueryService.run()` switches on `parsed.target` (or a new `source` field):
   - `target === 'fact'` → existing SELECT/BUCKET/AGGREGATE/GROUP over `AnalyticsDataPoint`.
   - `target === 'note'` → call `listNotes({ dateRange, tags, search, kind })`, then apply content predicates (`type:`, `has:`, `text:`) in memory, bucket by date, and aggregate (e.g. `count`).
   - `target === 'block'` → similar, but over a future block index or by scanning note segments.
   This keeps one public `queryService` and one `runQuery()` call site, but requires `QueryResult` to become a discriminated union because `matched` would hold `HistoryEntry[] | AnalyticsDataPoint[]`.

2. **Separate executors behind one parser**. Keep `QueryService` for facts and add `NoteQueryService`/`BlockQueryService` for content. The barrel re-exports a factory or dispatcher:
   ```ts
   export function runQuery(parsed: ParsedQuery | ParsedFindQuery, options?: QueryOptions): Promise<QueryResult | FindQueryResult>
   ```
   This avoids polluting the fact executor with content concerns, but callers must handle two result types.

**Seams to touch** if either option is chosen:

- `ParsedQuery` needs a `target?: 'fact' | 'note' | 'block'` and scope/time fields (`src/services/analytics/query/wql.ts:35`).
- `QueryService` constructor or `run()` needs the content store seam (`src/services/analytics/query/QueryService.ts:18`/`QueryService.ts:75`).
- `QueryResult` needs a discriminated union shape so UI code can render `matched` correctly (`src/services/analytics/query/QueryService.ts:34`).
- `src/services/analytics/query/index.ts` is the barrel; any new service or result type must be exported there.

## 3. Candidate syntaxes for the cross-store predicate

> **Scope of this section is syntax sketch only.** Semantics for how `find:` joins notes/blocks with fact aggregates, how `>` is evaluated against non-numeric content, and how `last 8w` interacts with note dates belong to ticket #785.

Given the proposed user question — *“notes where volume > 5000”* — the cross-store predicate must express three things: **what to find** (`note`/`block`/`result`), **which scope** (`journal`/`collections`/`feeds`/`all`), **how long back** (`last 8w`), and **the predicate** referencing both content filters and aggregate facts.

### Option A — `find:` head with `where` and inline metric
```wql
find:note{effort:thruster} where sum:totalVolume{} > 5000 in journal last 8w
```
- **Pros**: Symmetric with existing `agg:metric{filters}`; the `find:` head mirrors the analytics head; scope/time read like natural language.
- **Cons**: `where` introduces a second filter sub-language inside one query; grammar needs a comparison expression (`>`, `<`, `=`); autocomplete must switch vocabulary inside `where`.

### Option B — piped sub-query
```wql
sum:totalVolume{effort:thruster} by {note} in journal last 8w | notes where value > 5000
```
- **Pros**: Reuses the existing fact query surface unchanged; the pipe is a familiar compositional operator.
- **Cons**: Two separate WQL expressions to parse and validate; the second clause needs to know the schema of the first (`value`); harder to read for non-technical users.

### Option C — `from` scope inside the existing head
```wql
sum:totalVolume{effort:thruster} from notes in journal last 8w where total > 5000
```
- **Pros**: Existing `agg:metric{}` remains the head; `from notes` is a small additive clause.
- **Cons**: `from notes` changes the return type from `Series[]` to note objects, which is a bigger semantic shift than syntax suggests; less explicit that this is a content search.

### Option D — SQL-ish `select` statement
```wql
select notes
where effort = 'thruster'
  and sum(totalVolume) > 5000
  in journal
  last 8w
```
- **Pros**: Familiar to many users; easy to extend with `order by`/`limit`.
- **Cons**: Breaks the Datadog-flavored compact syntax established by WQL; bigger divergence from the current grammar and composer.

**Trade-off summary**: Option A is the most consistent with today’s WQL grammar and the proposed `find:` mode in the composer. Option C is the smallest grammar change but hides the content-return semantics. Option D is the most readable to SQL-literate users but the largest departure. Option B is the most composable but the hardest to teach in the current visual builder.

## 4. Shared vocabulary module and composer call sites

### 4.1 What already lives in one place
`src/parser/wql-language.ts` is the canonical vocabulary module for CodeMirror highlighting and autocomplete. It exports:

- `WQL_METRIC_FAMILIES` (`src/parser/wql-language.ts:20`)
- `WQL_METRIC_AGGREGATES` (`src/parser/wql-language.ts:23`)
- `WQL_TAG_KEYS` (`src/parser/wql-language.ts:27`)
- `WQL_VIRTUAL_DIMS` (`src/parser/wql-language.ts:34`)
- `WQL_CALC_TARGETS` (`src/parser/wql-language.ts:37`)

It also imports `WQL_AGGREGATORS` from `src/services/analytics/query/wql.ts` (`src/parser/wql-language.ts:22`) rather than redefining it, so the parser and the executor already share one aggregator list.

### 4.2 What is currently duplicated in the composer
`src/components/organisms/analytics/WqlQueryComposer.tsx` hardcodes:

- `AGGREGATOR_OPTIONS` (lines 39–49)
- `TAG_KEYS` (line 51)
- `VOCABULARY_VALUES` for `discipline`, `effort`, `intensity`, `note`, `origin` (lines 53–61)
- `GROUP_DIMS` (lines 63–72)
- `ROLLUPS` (lines 74–80)
- the full metric `<select>` with tier labels (lines 144–176)

`src/utils/analytics/useQueryComposerState.ts` hardcodes:

- `HUMAN_AGGREGATORS` (lines 46–53)
- `HUMAN_METRICS` (lines 55–66)
- `generateHumanTranslation()` consumes those maps (lines 68–89)

`src/utils/analytics/explorerQueries.ts` hardcodes the `EXAMPLE_QUERIES` list (lines 12–69) and metric/tag keys in comments.

### 4.3 What the shared module should export
To support `find:` mode and keep one canonical vocabulary, `src/parser/wql-language.ts` (or a new `src/parser/wql-vocabulary.ts` re-exported from it) should own:

1. **Existing analytics vocabulary** (already there):
   - `WQL_AGGREGATORS`, `WQL_METRIC_FAMILIES`, `WQL_METRIC_AGGREGATES`, `WQL_TAG_KEYS`, `WQL_VIRTUAL_DIMS`, `WQL_CALC_TARGETS`.
2. **New content/search vocabulary**:
   - `WQL_CONTENT_TARGETS` = `['note', 'block', 'result']`.
   - `WQL_CONTENT_KEYS` = `['type', 'has', 'text', 'effort', 'discipline', 'tag']`.
   - `WQL_SCOPE_TARGETS` = `['journal', 'collections', 'feeds', 'all']`.
   - `WQL_TIME_UNITS` = `['d', 'w', 'm', 'y']` (or just `['w']` initially).
3. **Human-readable labels** for the composer and translation banner:
   - `WQL_HUMAN_AGGREGATORS`, `WQL_HUMAN_METRICS`, plus new `WQL_HUMAN_CONTENT_TARGETS`, `WQL_HUMAN_CONTENT_KEYS`, `WQL_HUMAN_SCOPE_TARGETS`.
4. **Example queries**:
   - `WQL_EXAMPLE_QUERIES` moved from `explorerQueries.ts`, tagged by target (`fact` | `note` | `block`).
5. **Discipline/value lists**:
   - Export a single `WQL_TAG_VALUE_VOCABULARY: Record<string, readonly string[]>` derived from `src/effort-registry/disciplines.ts` and the effort resolver, replacing `VOCABULARY_VALUES` in `WqlQueryComposer.tsx`.

### 4.4 Call sites that would change
A `find:` implementation would modify these real call sites:

- `src/services/analytics/query/wql.ts` — `parseQuery` must accept the new syntax and emit a discriminated AST.
- `src/services/analytics/query/QueryService.ts` — `run()` needs a content-source seam and target-based routing.
- `src/services/analytics/query/index.ts` — barrel must export the new AST types, result type, and any new service.
- `playground/src/views/analytics/AnalyticsExplorerPage.tsx:4,56,87` — calls `parseQuery` and `queryService.runQuery`; must handle `find:` results.
- `playground/src/views/analytics/AnalyticsExplorerPage.test.tsx:6,43` and `AnalyticsDashboardPage.test.tsx:42` — mocks need to cover new result shapes.
- `src/components/organisms/analytics/WqlQueryComposer.tsx` — replace hardcoded `AGGREGATOR_OPTIONS`, `TAG_KEYS`, `GROUP_DIMS`, `ROLLUPS`, `VOCABULARY_VALUES`, and metric select with imports from the vocabulary module; add `find:` controls.
- `src/utils/analytics/useQueryComposerState.ts` — replace `HUMAN_AGGREGATORS`/`HUMAN_METRICS` with vocabulary imports; extend `generateHumanTranslation` for `find:`.
- `src/utils/analytics/explorerQueries.ts` — replace hardcoded `EXAMPLE_QUERIES` with the shared list; update `serializeQuery` if the AST shape changes.
- `src/components/organisms/editor/WqlQueryField.tsx:15` — the CodeMirror field uses `wql()` from `src/parser/wql-language.ts`; if `find:` lives in the same grammar, this needs no change; if it is a sibling grammar, a new `wqlFind()` language extension must be mounted.
- `tests/parser/wql-grammar.test.ts` and `src/parser/wql-language.test.ts` — add coverage for the new `find:` productions and completions.

## Recommendation

Adopt **one extended WQL grammar** with an optional `find:` leading clause, a `where` predicate, an `in <scope>` clause, and a `last <n><unit>` time clause. Keep the existing `agg:metric{filters} by {dims} .rollup(period)` fact surface untouched except for the new optional prefix/suffix.

**Why**: The current grammar is intentionally minimal and validates semantics in the mapper (`src/services/analytics/query/wql.ts`). Adding structural tokens for `find`, `in`, `last`, and `where` is consistent with how `By` and `RollupDot` already avoid the global-word-shadow problem. One grammar preserves the single CodeMirror language (`src/parser/wql-language.ts`) and the single `parseQuery` call site in `AnalyticsExplorerPage.tsx`.

**Execution order**:

1. Add a `generate:wql` npm script so `src/grammar/wql.parser.ts` regeneration is repeatable.
2. Extend `src/parser/wql-language.ts` to own all composer vocabulary, including new `WQL_CONTENT_TARGETS`, `WQL_SCOPE_TARGETS`, `WQL_CONTENT_KEYS`, human labels, and example queries.
3. Update `src/components/organisms/analytics/WqlQueryComposer.tsx` and `src/utils/analytics/useQueryComposerState.ts` to consume the shared vocabulary.
4. Extend `src/services/analytics/query/wql.ts` to parse the new `find:` clause into a discriminated AST.
5. Add a content-source seam to `src/services/analytics/query/QueryService.ts` (or a sibling content executor) and route by target, leaving the existing fact pipeline intact.
6. Update the barrel (`src/services/analytics/query/index.ts`) and the playground call sites (`AnalyticsExplorerPage.tsx` + tests).

Defer the exact predicate semantics and content-result shape to ticket #785; this research only commits the syntactic direction and the vocabulary consolidation.
