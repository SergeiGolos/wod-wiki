# Shared query execution across dashboards and notes

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 05, 06
Prerequisites: [Query documents and shared-key formulas](05-query-documents-and-formulas.md); [Cross-workout tables and aggregate drill-down](06-analytical-tables-and-drilldown.md)

## Question

Which execution and rendering boundaries make the same query document mean the same thing in the Explorer, dashboard route, embedded note view, and editor preview?

Resolve:
- One ownership path for parsing, tokens, query/host range precedence, unit preferences, rollup prerequisites, query-family dispatch, and diagnostic propagation.
- Share one captured current instant/system timezone per document execution, using the calendar/range rules from [Time buckets, group keys, and alignment](../assets/time-alignment-contract.md). Expose bucket-mismatch diagnostics with a user-chosen Normalize action, persist its intent, and show partial-period/date-only semantics consistently; grouping mismatches are not implicitly broadcast.
- Route direct and content-joined aggregates through one contribution-selection contract from [Automatic grain selection and contribution ownership](../assets/automatic-grain-contract.md). Preserve explicit grain constraints, result-local coverage, unassigned effort groups, and identical limitation/inspection behavior across surfaces.
- Remove duplicate dashboard-model ownership and string-based calc detection through a source-grounded clean cutover; choose whether an existing module can own the work rather than automatically introducing QueryDocumentRunner.
- Rows must execute as rows rather than synthetic empty aggregates. Editor previews must receive applicable frontmatter tokens and execution context.
- Widget-independent query results and the rendering requirements for supported charts, analytical tables, scatter, multi-axis views, zero-filled gaps, and explained invalid calculations.
- Implementable shared-consumer contract for [Missing values, units, and numerical correctness](../assets/arithmetic-contract.md): use compatible explicit query units or the system dimension defaults, not first-record or independent widget-preference fallbacks. Preserve presence/error/partial-window state across widgets; format unrounded numeric results only at display time. Identify every caller of the current kg/lb-only preference path for clean cutover.
- Public package contracts, injected storage dependencies, and which host responsibilities remain app-side.
- Inject the catalog-backed field and categorical-value completion provider into every applicable query-authoring surface using the existing WQL language-support seam. Follow [Field discovery and catalog contract](../assets/field-discovery-contract.md); do not open IndexedDB inside the shared query package or scan history to provide suggestions.

Resolution must give a responsibility diagram or concise contract table, affected callers, and parity scenarios covering every surface gap in source section 3.9 and Phase 3. It specifies the cutover and visual acceptance criteria; it does not implement it.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Unified QueryDocumentRunner in packages/wql — agreed during grilling

Consolidate all query execution across Explorer, dashboard routes, embedded notes, and editor previews into a single `QueryDocumentRunner` in `@bitcobblers/wod-wiki-wql`:

- Threads frontmatter tokens into all authoring/rendering contexts, including CodeMirror editor previews.
- Replaces `.includes('calc.')` string sniffing with AST-based rollup detection (`consumesRollupFacts(ast)`).
- Captures a single evaluation instant and system timezone per document run, shared across all widgets.
- Dispatches queries natively by family: `aggregate` to aggregate execution, `find` to content queries, and `rows` directly to `runRows` / `RowsTable`.
- Enforces unified range precedence: explicit query range > block defaults > host/dashboard range.
- Retires duplicate dashboard logic in `apps/playground`.

### Rendering parity and localized error badges — agreed during grilling

Widgets consume structured `DocumentResult` or `TabularResult` contracts without triggering silent reaggregation when switching visualization types. Charts render missing in-range positions as zero-filled; tabular widgets render absent values as empty/dash (`—`). Query/formula errors display localized error badges on the affected widget while other dashboard widgets execute and render normally. Note editor previews in CodeMirror receive frontmatter tokens and execute through the exact same runner.

## Answer

Resolved through live grilling with Serge. The authoritative [Shared query execution contract](../assets/shared-execution-contract.md) defines:

- Single execution engine: `QueryDocumentRunner` in `@bitcobblers/wod-wiki-wql/dashboard` orchestrating parsing, token substitution, AST rollup inspection (`consumesRollupFacts`), unified range precedence (query > defaults > host), and native family dispatch.
- Captured single execution context (timestamp + system timezone) shared across all widgets in a document run.
- Native delegation of `rows:` queries directly to `runRows` and `RowsTable`.
- Zero browser storage coupling with injected store, catalog, and evaluator dependencies.
- Decoupled widget rendering with zero-filled charts, dashed table cells, localized error badges, and full editor preview parity.
- Clean cutover removing duplicate logic in `apps/playground/src/lib/dashboard`.

No production code was modified.
