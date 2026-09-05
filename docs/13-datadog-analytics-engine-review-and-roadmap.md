# Datadog-Style Analytics Engine Review & Roadmap

**Status**: ARCHITECTURE REVIEW & PROPOSAL  
**Date**: 2026-09-05  
**Context**: Monorepo packages (`@bitcobblers/wod-wiki-core`, `@bitcobblers/wod-wiki-wql`, `@bitcobblers/wod-wiki-lang`, `@bitcobblers/wod-wiki-ui`) and `apps/playground`. Builds on [WQL Deep Dive (09-wql-deep-dive.md)](09-wql-deep-dive.md), [WQL Composition Style (10-wql-composition-style.md)](10-wql-composition-style.md), and [Routes & WQL Defaults (11-routes-wql-defaults-and-library-aliases.md)](11-routes-wql-defaults-and-library-aliases.md).

---

## Executive Summary

The goal is a Datadog-style dynamic analytics engine for WOD Wiki to analyze workout performance across disciplines, grouping by time and arbitrary metric relationships, renderable both on dedicated dashboard screens and embedded note query blocks (` ```query `).

The repository has strong foundations:
- Immutable, statement-level workout logs.
- Canonical Metric Keys (`totalVolume`, `tis`, `sessionLoad`, etc.).
- Injectable `QueryService` decoupled from browser persistence.
- Dimension-checked calculation registry in `@bitcobblers/wod-wiki-lang`.
- Reusable UI widgets and CodeMirror block previews in `@bitcobblers/wod-wiki-ui`.

However, the current architecture **cannot yet serve as a reliable dynamic analytics engine over arbitrary JSON properties and cross-workout relationships**. The primary bottlenecks are semantic correctness and grain discipline, not a shortage of chart types.

---

## 1. Current Architecture & Data Flow

```text
1. Workout Execution / Logging
   OutputStatement[] (metrics: IMetric[])
        │
        ▼
2. Canonical Storage (IndexedDB / results)
   WorkoutResult.data.logs (lossless archival stream)
        │
        ├── toEventRows()          ──▶ UnifiedEventRecord (grain: 'event', id: `${resultId}:${seq}`)
        └── toSummaryEventRows()   ──▶ UnifiedEventRecord (grain: 'summary', id: `${resultId}:summary:${rowKey}`)
                                            │
                                            ▼
3. Analytics Projection & Storage (IndexedDB 'events')
   UnifiedEventStore (IndexedDBService: by-timestamp, by-result, by-content)
        │
        ▼
4. Query Execution (QueryService)
   parseQuery(WQL) ──▶ 4-Stage Plan:
      [SELECT]    Range fetch on by-timestamp OR scanAll()
      [PROJECT]   projectEventToFacts() flattens UnifiedEventRecord ──▶ AnalyticsDataPoint[]
      [FILTER]    matchesFilters() (tags, negation, wildcards, sources)
      [BUCKET]    Civil calendar days/weeks OR fixed epoch rollups
      [GROUP]     Dimension partitioning (' · ' concatenation)
      [AGGREGATE] sum / avg / min / max / count / last / delta + display unit conversion
        │
        ▼
5. Presentation Surfaces
   ├── Analytics Explorer (/dashboard)          ──▶ ?q= URL state + QueryExecutor
   ├── Dashboard View (/dashboard/:slug)        ──▶ DashboardDocument + DashboardView grid
   └── Embedded Note Blocks (```query)          ──▶ QueryBlockView / CM6 preview
```

---

## 2. What Is Good in the Current Design

1. **Authoritative Logs with Derived Query Projections**:  
   `WorkoutResult.data.logs` remains the archival truth. Fact stores are disposable and re-derivable, preventing data-loss bugs when analytics schemas evolve (`packages/core/src/types/results.ts:27`).
2. **Unified Event Record Seam with Dual-Grain Identity**:  
   `UnifiedEventRecord` (`packages/core/src/types/storage.ts:198`) cleanly isolates raw statement events from folded workout summaries. Summary records have deterministic content keys (`${resultId}:summary:${rowKey}`), making `finalizeSummaries` re-runs idempotent.
3. **Canonical Metric Keys**:  
   The defined family/aggregate join vocabulary (`reps`, `distance`, `totalVolume`, `tis`) establishes a stable cross-workout comparison standard (`CONTEXT.md:126`).
4. **Pure, Injectable Query Seams**:  
   `QueryService` (`packages/wql/src/QueryService.ts:359`) depends only on abstract interfaces (`UnifiedEventStore`, `NoteQueryStore`, `BlockQueryStore`, `EffortQueryStore`). It runs cleanly in unit tests, in-memory fixtures, Node/Bun CLI, or IndexedDB without browser mocks.
5. **Dashboard-as-Note Document Format**:  
   Using Markdown notes with frontmatter metadata (`dashboard: true`, `dashboard.*` tokens) and ` ```query ` blocks (`packages/wql/src/dashboard/model.ts`) avoids proprietary database schemas and makes dashboards versionable and portable.
6. **AST-Driven Query Serialization**:  
   WQL has a Lezer grammar, parser, and total serializer (`packages/wql/src/serialize.ts:92`) ensuring UI-composed queries round-trip losslessly to canonical text.
7. **Static Dimension Algebra & Cycle Detection in Calc Engine**:  
   `CalculationRegistry` (`packages/lang/src/analytics/calc/registry.ts`) statically verifies unit dimensions, DAG dependencies, and authoritative unit casts.

---

## 3. Shortcomings Identified (Empirically Verified)

Executable probes run against the live package code uncovered critical architectural defects:

### 3.1. Custom JSON Properties Collapse in Identity (High Severity)
- **Code Path**: `packages/lang/src/runtime/compiler/metrics/PropertyMetric.ts:20-27` and `packages/wql/src/derivation.ts:307-312`.
- **Finding**: `PropertyMetric` accepts arbitrary keys (`new PropertyMetric('hrv', 48)`), but its metric `type` defaults to `'custom'`. In `projectEventToFacts`, it looks only for `metadata.canonicalKey`, the statement's `Label` metric, or `m.type`. It never inspects `PropertyMetric.key`.
- **Observed Probe Output**:
  ```json
  [
    {"key":"custom","value":48},
    {"key":"custom","value":7.5}
  ]
  ```
- **Consequence**: Distinct custom JSON metrics (e.g., `hrv`, `sleepQuality`, `barVelocity`) on the same statement without an explicit label collapse into `metricKey: "custom"` and silently sum together.

### 3.2. Double Counting across Event and Summary Grains (High Severity)
- **Code Path**: `packages/wql/src/QueryService.ts:708-710` and `packages/wql/src/derivation.ts:190-255`.
- **Finding**: Tier-2 analytics outputs (`outputType: 'analytics'`) are emitted into event rows by `toEventRows` and simultaneously folded into summary rows by `toSummaryEventRows`. The default aggregate query SELECT leg (`QueryService.run`) scans all event rows and projects facts from both grains without filtering to `grain: 'summary'`.
- **Observed Probe Output**:
  A single `Total Volume = 100 kg` statement generated two records; running `sum:totalVolume{}` returned **`200 kg`**. Filtering explicitly with `{grain:summary}` was required to recover the true `100 kg`.

### 3.3. Unit Conversion Anomaly on Mixed Inputs (Medium Severity)
- **Code Path**: `packages/wql/src/units.ts:55-101` and `packages/wql/src/QueryService.ts:324-345`.
- **Finding**: When a query has no explicit `in <unit>` directive, `resolveDisplayUnit` defaults `convert: false` and uses the unit of the first encountered fact. Subsequent facts in compatible units are added directly without conversion.
- **Observed Probe Output**:
  Aggregating `1000 m` followed by `1 km` via `sum:distance{}` returned **`1001 m`**. When queried with `in m`, it correctly returned **`2000 m`**.

### 3.4. Chronological Inversion in Delta Aggregation (Medium Severity)
- **Code Path**: `packages/wql/src/QueryService.ts:343` (`delta: return values[values.length - 1] - values[0]`).
- **Finding**: The delta aggregator computes the difference between the first and last array elements of the matched fact list. If candidate rows are supplied in reverse chronological order (newest to oldest), delta computes `oldest - newest`.
- **Observed Probe Output**:
  For an early value of `10` and later value of `20`, delta returned **`-10`**.

### 3.5. Silent Degradation on Unknown Dimensions
- **Code Path**: `packages/wql/src/QueryService.ts:318-321`.
- **Finding**: When a query groups by an unsupported or missing dimension (e.g. `by {shoe}` or `by {round}`), `dimValue` returns `'(none)'` rather than raising a semantic diagnostic.

### 3.6. Duplicate Scopes in Rows Queries
- **Code Path**: `packages/wql/src/QueryService.ts:455-458`.
- **Finding**: When a `rows:` query specifies overlapping scopes (e.g. `rows:all{result:r1,note:n1}`), events are gathered per scope without ID deduplication before grouping into runs, causing identical events to appear twice.

### 3.7. Content Join Drops Event-Grain Facts
- **Code Path**: `packages/wql/src/QueryService.ts:936-941`.
- **Finding**: `deriveMetricFacts` filters exclusively for `row.grain === 'summary'`. A query targeting raw segment metrics with a content join (e.g., `sum:distance{grain:event} where find:block{}`) returns 0 matched rows because event-grain rows are discarded during join projection.

### 3.8. Global Scope Collapse in Effort Deduplication
- **Code Path**: `packages/wql/src/QueryService.ts:916-925`.
- **Finding**: `applyEffortScope` checks if *any* row in the matched candidate set has `effortSlug !== undefined`. If so, it globally drops all unattributed rows across the entire result set, regardless of whether they originate from distinct workout sessions.

### 3.9. Surface Parity Gaps
- **Forked Dashboard Model**: `apps/playground/src/lib/dashboard/model.ts` is a near-identical live copy of `packages/wql/src/dashboard/model.ts`.
- **Range & Option Discrepancy**:
  - Dashboard route forces a page-level time window that overrides query-level `last Nw` clauses (`QueryService.ts:697-699`).
  - Embedded `QueryBlockView` passes no options, so unit preferences and host ranges are ignored.
- **Rows on Dashboards**: The dashboard runner routes all queries to `runQuery`, converting `rows:` queries into synthetic empty aggregates rather than delegating to `runRows`.
- **Token Preview in Editor**: CodeMirror's preview extension does not pass frontmatter tokens, displaying "unknown token" warning badges in editor preview for valid dashboard blocks.

---

## 4. The Path to a Coherent Datadog-Style Analytics Engine

### 4.1. Core Concepts Borrowed from Datadog
1. **Typed Facet & Measure Catalog**: Any indexed JSON property can be promoted to a faceted dimension (string) or measure (number) with an explicit physical unit.
2. **Unified Query Document**: One document structure holding multiple named queries (`a = ...`, `b = ...`) plus read-time formulas (`show a / b`).
3. **Decoupled Visualizations**: The query definition is independent of the widget; changing a widget from `table` to `timeseries` or `bars` preserves the underlying dataset.
4. **Log & Segment Drill-Down**: Direct navigation from aggregated metrics down into the raw execution statements (`rows:segment`).

### 4.2. Target Query & Document Syntax

#### A. Multi-Line Query Block with Formulas (Additive to WQL)
````markdown
```query:timeseries-2
a = sum:running.distance{discipline:running} by {week} last 12w in km
b = sum:running.movingTime{discipline:running} by {week} last 12w in hr
show a / b -> km/hr
```
````
- WQL line syntax remains completely unchanged.
- Formula expression evaluator reuses `@bitcobblers/wod-wiki-lang/calc`.
- Alignment enforces matching `by` dimensions across lettered queries.

#### B. Generalized Analytical Tables
````markdown
```query:table-full
rows:segment{discipline:running} last 4w
| select date, effort, distance in km, elapsed in min, pace, heartRate
| order by date desc
| limit 50
```
````
Transforms `rows:` from a single-session log viewer into a cross-workout tabular exploration plane.

---

## 5. Phased Implementation Roadmap

```text
Phase 1: Metric Correctness & Grain Integrity (Foundation)
Phase 2: Typed Field Catalog & Custom JSON Properties
Phase 3: Unified Surface Architecture & Query Document Model
Phase 4: Analytical Table Engine (rows: generalization)
Phase 5: Multi-Query Formulas & Relationship Analytics
Phase 6: Shared Invalidation & Pipeline Performance
```

### Phase 1: Metric Correctness & Grain Integrity (P0)
- **Goal**: Ensure calculations produce provably correct mathematical results.
- **Actions**:
  1. Default the SELECT leg in `QueryService.run` to `grain: 'summary'` unless explicitly overridden, eliminating the Tier-2 double-count.
  2. Update `resolveDisplayUnit` to normalize all fact values to the target family unit prior to running `aggregate()`.
  3. Sort matched facts chronologically by `timestamp asc` before evaluating `delta`.
  4. Scope `applyEffortScope` per result ID rather than globally across the query result.
  5. Deduplicate event IDs in `runRows` when evaluating multi-scope queries.
- **Acceptance Criteria**:
  - Unit tests verify `sum:totalVolume{}` on a finalized workout matches exact workout summary volume.
  - Mixed unit queries (`1000m` + `1km`) equal `2000m` without requiring explicit query directives.

### Phase 2: Typed Field Catalog & Custom JSON Ingest (P1)
- **Goal**: Enable custom JSON properties to be queried, filtered, and grouped across disciplines.
- **Actions**:
  1. Update `PropertyMetric` to carry custom property keys into `IMetric.metadata.canonicalKey` or introduce `metadata.fieldKey`.
  2. Update `projectEventToFacts` to read `metadata.fieldKey` and preserve custom metric identity.
  3. Support arbitrary tags in `metadata.tags` to allow custom metrics to be grouped by discipline, tags, or gear (`by {shoe}`).
  4. Introduce a dynamic `FieldCatalog` interface to discover available fields from stored records without requiring hardcoded enum entries in `vocabulary.ts`.
- **Acceptance Criteria**:
  - `PropertyMetric('hrv', 48)` and `PropertyMetric('sleep', 7.5)` project to distinct queryable metric keys `hrv` and `sleep`.
  - Custom metrics group cleanly by dynamic tags (`avg:hrv{} by {tag}`).

### Phase 3: Unified Surface Architecture (P1)
- **Goal**: Identical query semantics and rendering across Explorer, Dashboard routes, and Note blocks.
- **Actions**:
  1. Delete `apps/playground/src/lib/dashboard` and consolidate imports to `@bitcobblers/wod-wiki-wql/dashboard`.
  2. Extract a shared `QueryDocumentRunner` module to orchestrate range resolution, token substitution, and `ensureRollupFacts`.
  3. Replace `query.includes('calc.')` string sniffing with an AST predicate `consumesRollupFacts(parsed)`.
  4. Thread frontmatter tokens through `query-block-preview.tsx` into `QueryBlockView` so CodeMirror previews render without token errors.
  5. Update `DashboardView` to delegate `rows:` queries directly to `runRows` and `RowsTable`.
- **Acceptance Criteria**:
  - `apps/playground/src/lib/dashboard` is completely removed.
  - A note containing a `rows:` or token-parameterized query renders identically in the Note Editor preview and on `/dashboard/:slug`.

### Phase 4: Analytical Table Engine (P2)
- **Goal**: Turn raw statement logs into filterable, sortable analytical tables.
- **Actions**:
  1. Relax `validateRowsFilters` in `packages/wql/src/wql.ts` to permit cross-session content filters (`discipline:`, `effort:`, `origin:`).
  2. Add optional pipe extensions (`| select ... | order by ... | limit N`) parsed at the suffix boundary.
  3. Share data structures between tabular results and chart widgets via a unified `QueryDataset` abstraction.
- **Acceptance Criteria**:
  - `rows:segment{discipline:running} last 4w` returns all running segments in the time window without requiring a specific session ID.

### Phase 5: Multi-Query Formulas & Relationship Analytics (P2)
- **Goal**: Datadog-style read-time ratios, moving averages, and cross-discipline correlations.
- **Actions**:
  1. Update `parseDashboardNote` to support multi-line query fence blocks (`a = ...`, `b = ...`, `show <expr> -> unit`).
  2. Wire the Pratt expression evaluator from `@bitcobblers/wod-wiki-lang/calc` into query document execution.
  3. Implement series alignment rules by bucket key (civil day/week) with explicit handling of missing values (zero-fill vs skip).
  4. Add correlation visualizations (scatter plots and multi-axis timeseries).
- **Acceptance Criteria**:
  - `show a / b -> km/hr` evaluates total distance divided by total time across matching buckets.
  - Dimension mismatches produce clear, localized error badges.

### Phase 6: Invalidation & Pipeline Performance (P3)
- **Goal**: Fast, responsive querying across multi-year journal histories.
- **Actions**:
  1. Coalesce identical subqueries within the same dashboard document into a single execution pass.
  2. Invalidate dashboard results based on note and result revision hashes rather than crude full-page refreshes.
  3. Add bounded pagination and index-assisted timestamp slicing for large multi-year corpora.
- **Acceptance Criteria**:
  - Dashboards with 12+ widgets sharing identical time ranges execute with zero redundant store scans.

---

## 6. Verification & Traceability

This architectural review is grounded in:
1. Static code analysis of `packages/core`, `packages/wql`, `packages/lang`, `packages/ui`, and `apps/playground`.
2. Executable runtime probes executing real `QueryService` queries with in-memory stores.
3. Cross-referencing Datadog's published specifications for [Dashboard Querying](https://docs.datadoghq.com/dashboards/querying/), [Log Facets](https://docs.datadoghq.com/logs/explorer/facets/), and [Log Analytics](https://docs.datadoghq.com/logs/explorer/analytics/).
4. Monorepo architecture guidelines defined in `CONTEXT.md` and `docs/05-architecture.md`.
