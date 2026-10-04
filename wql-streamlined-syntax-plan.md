# WQL Streamlined Colon Syntax & Standard Page Sources Implementation Plan

## Goal
Implement colon-prefixed WQL grammar (`:{source}`, `:{function}`, `:{chart}`), deprecate redundant `find:`, support left-to-right value pipeline flows, provide auto-populated page sources (`@session`, `@today`), and align `:segment` vs `:event` queries as differing inclusivity filters over the unified `EventRecord` store.

## Impact on Current Work & Codebase

1. **Syntax Simplification**: `find:` is removed as a required keyword. Queries start directly with semantic colon heads:
   - `:{source}`: `:journal{}`, `:collection{}`, `:playground{}`, `:note{}`, `:segment{}`, `:session{}`, `:effort{}`, `:event{}`
   - `:{function}`: `:sum{}`, `:avg{}`, `:count{}`, `:max{}`, `:min{}`, `:last{}`
   - `:{chart}`: `:timeseries{}`, `:bar{}`, `:table{}`, `:donut{}`, `:toplist{}`, `:value{}`
2. **Value-First Pipeline**: Data flows left-to-right via `|`: `:{source} | :{function} | :{chart}` or `@source | :{function} | :{chart}`.
3. **Storage Identity Alignment (`:segment` vs `:event`)**:
   - Both target the exact same underlying storage unit (`EventRecord` in the `events` IndexedDB store).
   - `:segment` is the **data points level** (meaningful domain workout segment outputs: `outputType === 'segment'`).
   - `:event` is the **debug level** (maximal inclusivity across all emitted statements: `system`, `compiler`, `load`, `completion`, ticks).
   - Lower-level refactor: Query execution uses the shared `EventStore` scan path and applies an `outputType` filter predicate rather than divergent fetch abstractions.
4. **Auto-Populated Standards**:
   - `@session`: Injected on page load with active workout execution facts and segment outputs.
   - `@today`: Injected on page load with all telemetry events/notes from the current civil day.
5. **Hierarchy Invariant**: Entities resolve to the highest possible container: parent `Page` if page-bound, else `Note`.
6. **Source Scope**: Generic `:note{}` defaults to `journal | collection | playground`; `feeds` is completely excised.

---

## Tasks

- [ ] Task 1: Update Vocabulary & Constants
  - **Files**: `packages/wql/src/vocabulary.ts`
  - **Changes**: Remove `feeds` from `WQL_SOURCE_VALUES`. Define `WQL_SOURCE_HEADS`, `WQL_FUNCTION_HEADS`, `WQL_CHART_HEADS`, and standard dataset names (`@session`, `@today`).
  - **Verify**: `npm run build -w packages/wql` succeeds without type errors.

- [ ] Task 2: Grammar & Lexer Colon Head Support
  - **Files**: `packages/wql/src/grammar/wql.grammar`
  - **Changes**: Update Lezer grammar to parse leading colon tokens (`:{word}`) and pipeline chaining (`|`). Support dataset references (`@name`). Recompile Lezer parser.
  - **Verify**: Parser generates tree with `Head` and `Pipeline` nodes for `:journal{effort:snatch} | :sum{metric:tis}`.

- [ ] Task 3: AST Mapper & Pipeline Representation
  - **Files**: `packages/wql/src/wql.ts`
  - **Changes**: Parse colon heads directly into structured AST without `find:`. Map pipeline stages (`source -> transforms[] -> sink`). Enforce default scope `journal | collection | playground` on `:note`.
  - **Verify**: Unit test in `packages/wql/tests/wql.test.ts` successfully parses `:journal{effort:snatch}` and pipeline expressions.

- [ ] Task 4: Unified EventRecord Execution & Container Resolution
  - **Files**: `packages/wql/src/QueryService.ts`
  - **Changes**: Refactor telemetry scanning to share a single `EventRecord` path: `:segment` filters to `outputType === 'segment'` (domain data points); `:event` returns the full debug-level statement stream. Route source extractions (`:journal`, `:collection`, etc.) to respective stores. Resolve container links to parent `Page` when `page` ID exists, fallback to `Note`. Remove feed handling.
  - **Verify**: Both `:segment` and `:event` execute over `defaultEventStore` using `outputType` predicates; `runFind` returns `page` container URL for notes with parent page metadata.

- [ ] Task 5: Auto-Populate Standard Page Datasets (`@session`, `@today`)
  - **Files**: `packages/wql/src/queryDocumentRunner.ts`, `apps/playground/src/services/`
  - **Changes**: On page load, register `@session` (active workout results/facts) and `@today` (civil day events) into `PageSourceRegistry` before child queries run.
  - **Verify**: Downstream query `@session | :sum{metric:tis}` evaluates in-memory without database roundtrip.

- [ ] Task 6: Widget Runner & Pipeline Sink Evaluation
  - **Files**: `packages/wql/src/queryDocumentRunner.ts`
  - **Changes**: Evaluate pipeline chains through to chart sink (`:timeseries`, `:bar`, `:table`), passing formatted datasets to rendering components.
  - **Verify**: Query block in test markdown file produces expected chart payload.

- [ ] Task 7 (Phase X): Full Verification & Regression Run
  - **Files**: Full test suite
  - **Run**:
    - `npm run test` (or `npx vitest run packages/wql`)
    - `node ~/.agents/skills/whiteboard-html/check.mjs docs/wql-whiteboard-crosswalk.html`
  - **Verify**: All unit tests pass, zero regressions, and whiteboard document checks green.

---

## Done When
- [ ] Queries execute with colon-first syntax (`:journal{effort:snatch}`, `:sum{metric:tis}`) without `find:`.
- [ ] Left-to-right pipelines (`:{source} | :{function} | :{chart}`) evaluate correctly.
- [ ] `:segment` and `:event` are executed as inclusive filters over the unified `EventRecord` store (`:segment` = domain data points, `:event` = debug statement stream).
- [ ] `@session` and `@today` are automatically populated on page load and queryable downstream.
- [ ] Entities link to Page (if page-bound) or Note (if standalone).
- [ ] Feeds are completely removed from vocabulary and queries.
