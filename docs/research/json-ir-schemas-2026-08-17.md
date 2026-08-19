# JSON IR Schemas — Headless Engine Input/Output (wayfinder #955)

Date: 2026-08-17 · Map: [Wayfinder map #953](https://github.com/SergeiGolos/wod-wiki/issues/953) · Status: **Decided**

## The decision in one line

The IR is **not a new vocabulary**. It freezes the shapes the system already
produces and consumes — `QueryResult`, `FindQueryResult`, `RowsQueryResult`,
`StoredOutputStatement`, `AnalyticsDataPoint`, `WorkoutResult` — as
version-stamped, JSON-safe files wrapped in a small envelope. Widgets already
render these shapes; the Node CLI already-executes against them via the
injectable store seams. Zero transformation = headless/UI parity by
construction (the requirement recorded on #958/#959).

## Evidence (why freezing works)

- `QueryService.ts:11-12` — "widgets and tables are dumb consumers of
  QueryResult". `QueryResult.series: Series[]` (`wql.ts:137`) is exactly what
  `WidgetChart`/`WqlTimeseries`/`WqlBars` render; `scalar?` drives value
  widgets.
- `RowsQueryResult.runs: RowsRun[]` (`QueryService.ts:286-296`) —
  `{ result: WorkoutResult; logs: StoredOutputStatement[] }` — is exactly what
  `RowsTable` renders.
- `StoredOutputStatement` (`src/components/Editor/types/index.ts:45`) is
  already a plain-data shape "safe for JSON / IndexedDB round-trips … class
  methods and non-serialisable fields (Set, Map, MetricContainer instances)
  are intentionally excluded". The JSON discipline already exists.
- Store seams are already injectable: `FactQueryStore` (`QueryService.ts:110`),
  `NoteQueryStore`, `BlockQueryStore`, `EffortQueryStore`, `ResultLogStore` —
  an in-memory adapter over a fixture file is the same seam production
  IndexedDB satisfies.
- `AnalyticsDataPoint` (`src/types/storage.ts:215`) is the fact-row input
  shape the whole four-stage plan (SELECT→BUCKET→AGGREGATE→GROUP) reads.

## Envelope — `WodWikiIRFile<T>`

Every file (input fixture or output artifact) carries:

```ts
interface WodWikiIRFile<T> {
  "$schema": "https://wod-wiki.dev/ir/v1.json";
  kind: IrKind;            // discriminator — see tables below
  generatedAt: number;     // epoch ms (outputs) / scenario as-of (fixtures)
  source?: string;         // provenance: "cli:wod-wql", "storybook:fixtures/fran", …
  data: T;
}
```

## Input fixture kinds (CLI + Storybook load these)

| `kind` | `data` type (source of truth) | Feeds |
|---|---|---|
| `fact-set` | `AnalyticsDataPoint[]` (core) | `FactQueryStore` |
| `result-set` | `WorkoutResult[]` + their `StoredOutputStatement[]` logs | `ResultLogStore` |
| `note-set` | `Note[]`, `NoteSegment[]`, `BlockIndexRow[]`, `Tag[]` | `NoteQueryStore` / `BlockQueryStore` |
| `corpus` | one composite of all above (+ `IEffort[]`) | golden scenarios — the whole store surface |

A **corpus** is the golden-scenario form (#959): one file = one workout
history. `wod-wql` and Storybook load it into in-memory store adapters —
the identical seam production uses.

## Output dataset kinds (engine emits; widgets render)

| `kind` | `data` type (source of truth) | Owner package |
|---|---|---|
| `query-result` | `QueryResult` (series/scalar/matched/stages/unit) | wql |
| `find-result` | `FindQueryResult` (notes/blocks/efforts/stages) | wql |
| `rows-result` | `RowsQueryResult` (runs of WorkoutResult+logs) | wql |
| `parse-tree` | `StatementNode` tree — **new, see below** | lang |
| `execution-log` | `WorkoutResults` + `StoredOutputStatement[]` | lang |

`QueryResult.parsed` embeds the parsed AST today; v1 keeps it **verbatim** —
it is already plain JSON and re-derivable from `parsed.raw`. No slimming in
v1; revisit only if a consumer chokes.

### `StatementNode` — the one genuinely new shape

Parse output today is live `CodeStatement` objects holding `MetricContainer`
(a class). The parse-tree IR follows `StoredOutputStatement`'s existing
discipline for its plain form:

```ts
interface StatementNode {
  id: number;
  type: string;                  // statement kind
  raw: string;                   // source text of the statement
  from: number; to: number;      // source span
  metrics: IMetric[];            // flat — container resolved to array
  hints?: string[];              // Set → string[] (same rule as stored form)
  children: StatementNode[];
}
```

Consumed by the parser storybook (#957's "example text → rendered code
statements" verification) and `wod-run --emit parse-tree`.

## Invariants (all kinds)

1. **JSON round-trip safe** — no `Set`/`Map`/class instances/`Date`; timestamps
   are epoch `number`s (existing shapes already comply; `StatementNode` adopts
   the rule).
2. **Types are the source of truth** — the TypeScript interfaces in
   `@bitcobblers/wod-wiki-core` (shapes) + wql/lang (results) define the IR. JSON Schema
   files are **generated** (ts-json-schema-generator) and shipped for external
   tooling — never hand-maintained (no second convention).
3. **Additive versioning** — v1 = today's shapes verbatim. Breaking change ⇒
   `v2` in `$schema` + kind, v1 readers keep working.
4. **Ownership respects the DAG** — envelope + `fact-set`/`result-set`/
   `note-set`/`corpus` kinds live in **core** (they reference only core
   shapes); `query-result`/`find-result`/`rows-result` in **wql**;
   `parse-tree`/`execution-log` in **lang**. ui imports via the engine
   umbrella; core stays dependency-free.

## CLI surface enabled (feeds the graduated ticket)

- `wod-run <input.txt | -> [--emit parse-tree|execution-log] [-o out.json]`
- `wod-wql '<wql>' --corpus fixtures/fran.json [-o out.json]` (emits
  `query-result`/`find-result`/`rows-result` per query family)

Flag/pipe/exit-code conventions are a separate ticket (graduated from map fog).

## Verification

- Fixture files validate against generated schemas (ajv) in CI.
- Same corpus through `wod-wql` (headless) and Storybook (in-memory stores)
  produces byte-identical `data` payloads — the parity contract #959 tests.
- Golden corpus catalog starts with: Fran, Murph, and a multi-week journal
  scenario (carried into #959).
