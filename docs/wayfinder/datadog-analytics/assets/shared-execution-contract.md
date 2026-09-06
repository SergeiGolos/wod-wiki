# Shared query execution across dashboards and notes

Status: resolved decision contract; planning only.

Owned by [Shared query execution across dashboards and notes](../issues/07-shared-query-execution-and-surfaces.md). Composes with [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), [Time buckets, group keys, and alignment](time-alignment-contract.md), [Missing values, units, and numerical correctness](arithmetic-contract.md), [Query documents and shared-key formulas](query-documents-contract.md), and [Cross-workout analytical tables and drill-down](analytical-tables-contract.md). This asset specifies required behavior; it is not production code.

## 1. Unified execution engine: `QueryDocumentRunner`

All query execution across the Explorer, dashboard routes, embedded note queries, and CodeMirror editor previews is consolidated into a single engine: `QueryDocumentRunner` in `@bitcobblers/wod-wiki-wql/dashboard`.

### 1.1 Architecture and dependencies

- `@bitcobblers/wod-wiki-wql` owns query document parsing, token resolution, AST-level rollup inspection, range precedence, and query scheduling.
- **Zero browser storage coupling:** accepts injected interfaces for storage (`UnifiedEventStore`), discovery (`IFieldCatalog`), and formula evaluation (`IFormulaEvaluator`).
- Consuming packages (`@bitcobblers/wod-wiki-ui`, `apps/playground`) invoke `QueryDocumentRunner` rather than reimplementing execution loops or token replacement.

### 1.2 Execution lifecycle

For each document execution:

1. **Token substitution:** frontmatter tokens (`$name`) are substituted into queries using active parameter values. This is executed identically in dashboard views and in editor previews (`QueryBlockView`).
2. **Rollup prerequisite check:** replaces `.includes('calc.')` string sniffing with an AST predicate:
   ```typescript
   function consumesRollupFacts(query: AnyParsedQuery): boolean;
   ```
   Inspects parsed query metrics and formulas. If any metric references a rollup-dependent key (e.g. `calc.acwr`, `calc.strain`), the host's `onEnsureRollupFacts()` hook is triggered once before running queries.
3. **Execution context capture:** captures **one current instant and one system timezone** per document run. Every named query, relative window, formula alignment, and bucket generation uses this shared context, preventing cross-midnight or Monday-start splits between widgets.
4. **Range precedence:**
   `explicit query window` > `block defaults window` > `host / dashboard range parameter`
5. **Native query family dispatch:**
   - `aggregate`: routed to `runAggregate` / `buildResult`.
   - `find`: routed to `runFind`.
   - `rows`: routed directly to `runRows`, rendering tabular results or single-session logs via `RowsTable`.

## 2. Rendering parity and widget decoupling

### 2.1 Decoupled result contracts

- Multi-query and aggregate blocks emit a `DocumentResult` containing named series outputs, units, dimensions, and group metadata.
- Cross-workout tabular queries emit `TabularResult` (columns, rows, total count).
- Widgets are pure renderers of these structured results; switching from `table` to `timeseries` or `bars` preserves the underlying dataset and calculations without silent re-aggregation.

### 2.2 Visual presentation of missing data

- **Charts (`timeseries`, `bars`, `scatter`, `multi-axis`):** missing positions within the requested domain are rendered as zero-filled per the agreed graph rules. Out-of-scope dates are excluded.
- **Tables (`table`, `table-full`, `RowsTable`):** missing field values are rendered as absent/empty (`—`), strictly distinguished from a recorded `0`.
- **Scalar widgets (`query-summary`):** display the unrounded value formatted to the target unit, or an empty state if all inputs were absent.

### 2.3 Localized error badges

When an individual query or formula fails (syntax error, division by zero, incompatible grouping dimensions, or circular reference):

- A localized error badge is rendered on that specific widget with an informative diagnostic.
- Remaining widgets in the dashboard or document continue executing and rendering normally. A single query failure never crashes the entire dashboard.

### 2.4 Editor preview parity

`QueryBlockView` inside the CodeMirror note editor renders the exact same widget view as the published note or dashboard route:

- Receives note frontmatter tokens from the editor's document state.
- Executes via the same `QueryDocumentRunner`.
- Provides an interactive toggle between the raw query text and the live rendered preview.

## 3. Authoring support and catalog typeahead

- `@bitcobblers/wod-wiki-wql/language` provides the CodeMirror language extension (`wqlLanguage`, `wqlCompletionSource`).
- The catalog-backed autocompletion provider queries `IFieldCatalog` prefix indexes directly for field paths and categorical values.
- Zero event or result history scanning is performed during typeahead.

## 4. Cutover and clean removals

1. **Delete duplicate logic:** remove `apps/playground/src/lib/dashboard` and redirect all imports to `@bitcobblers/wod-wiki-wql/dashboard`.
2. **Refactor `DashboardView` and `QueryBlockView`:** delegate execution directly to `QueryDocumentRunner`.
3. **Retire kg/lb-only assumptions:** migrate callers of `useAnalyticsUnitPreference` to use the comprehensive system dimension default table.
