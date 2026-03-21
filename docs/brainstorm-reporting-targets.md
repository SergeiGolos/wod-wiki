# Feature: Reporting Targets

**Brainstorm Date:** March 21, 2026
**Status:** Draft
**Issue:** Design a reporting system for tables, graphs, and maps embedded as fenced code blocks in the editor

---

## 1. Requirement Analysis

- **Core Problem**: WOD Wiki currently collects workout metrics through its runtime pipeline (parser → dialect → JIT compiler → runtime execution → analytics transformer) and stores them as `Segment` arrays with dynamic metric maps. However, there is no user-facing mechanism to query, aggregate, and visualize this data inline within the editor. Users need a way to embed **tables**, **graphs**, and **maps** directly in their workout documents — using the same fenced code block mental model already established by ` ```wod `, ` ```log `, and ` ```plan ` dialects — to create persistent, queryable reports that render as interactive HTML within the editor view.

- **Success Criteria**:
  - Three new fenced code block types are recognized: ` ```table `, ` ```graph `, ` ```map `.
  - Each block contains a **metric query** that selects, filters, groups, and aggregates workout data.
  - Blocks render as interactive HTML components overlaid on the code editor (similar to how WOD companions overlay ` ```wod ` blocks).
  - A **view/edit toggle** lets users switch between rendered report and raw query syntax.
  - A **wizard component** provides a guided query builder for non-technical users.
  - The metric query language is small, consistent, and extensible.
  - Reports compose with existing note structure — they can reference results from WOD blocks in the same document or across documents.

- **Scope**: Architectural brainstorm — no code changes. Produce analysis document and visual canvas.

- **User Impact**: Users writing workout journals gain inline analytics without leaving the editor. A coach reviewing athlete logs can embed a table summarizing weekly volume, a graph showing intensity trends, or (future) a map showing GPS routes — all co-located with the workout definitions they analyze.

### Summary

The reporting system extends the fenced code block pattern (` ```dialect `) from workout execution (wod/log/plan) to data visualization (table/graph/map). Each reporting block contains a metric query — a small DSL for selecting workout data — and renders as an interactive HTML component overlaid on the code editor. The system reuses the existing analytics pipeline (`AnalyticsTransformer` → `Segment[]` → `IProjectionEngine`) as its data source and the editor overlay architecture (`OverlayTrack` + section-state + widget decorations) as its rendering surface.

---

## 2. Code Exploration

### Relevant Files

| File | Role |
|------|------|
| `src/components/Editor/types/section.ts` | Defines `SectionType`, `WodDialect`, `EditorSection` — the taxonomy of recognized block types |
| `src/components/Editor/utils/blockDetection.ts` | `matchDialectFence()` and `detectWodBlocks()` — fence detection for ` ```wod `, ` ```log `, ` ```plan ` |
| `src/components/Editor/extensions/section-state.ts` | CM6 StateField that parses the document into `EditorSection[]` with type-aware rendering |
| `src/components/Editor/extensions/wod-results-widget.ts` | CM6 widget decorations rendering expandable results tables inside WOD blocks |
| `src/components/Editor/overlays/OverlayTrack.tsx` | Scroll-synced overlay positioning system for section-aligned companion panels |
| `src/components/Editor/overlays/OverlayWidthPolicy.ts` | Width allocation per section type (`wod: 35%`, `code: 30%`, etc.) |
| `src/components/Editor/overlays/WodCompanion.tsx` | Full companion panel for WOD blocks (metric chips, run buttons, history) |
| `src/core/models/AnalyticsModels.ts` | `Segment`, `AnalyticsGraphConfig`, `AnalyticsGroup` — analytics data structures |
| `src/services/AnalyticsTransformer.ts` | `getAnalyticsFromRuntime()`, `getAnalyticsFromLogs()` — transforms runtime data to segments |
| `src/timeline/analytics/analytics/index.ts` | Projection engines: Volume, Rep, Distance, SessionLoad, MetMinute |
| `src/timeline/analytics/analytics/IProjectionEngine.ts` | `IProjectionEngine` interface for metric aggregation |
| `src/timeline/analytics/analytics/ProjectionResult.ts` | `ProjectionResult` — aggregated metric result with name, value, unit |
| `src/core/models/MetricContainer.ts` | `MetricContainer` — typed collection with precedence-aware resolution |
| `src/core/contracts/IMetricSource.ts` | `IMetricSource` interface and `MetricFilter` type |
| `src/core/models/Metric.ts` | `MetricType` enum (25 types), `MetricOrigin`, `IMetric` interface |
| `src/core/utils/metricPrecedence.ts` | `ORIGIN_PRECEDENCE` map and `resolveMetricPrecedence()` |
| `src/views/runtime/metricColorMap.ts` | Tailwind color mapping for 17+ metric types |

### Similar Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| **WOD Block Detection** | `blockDetection.ts`, `section-state.ts` | Fenced code block detection for ` ```wod `/` ```log `/` ```plan `. Reporting blocks (` ```table `/` ```graph `/` ```map `) follow the same pattern. |
| **Section Type System** | `section.ts` | `SectionType` already includes `'wod'`, `'markdown'`, `'code'`, `'frontmatter'`, `'embed'`. Adding `'table'`, `'graph'`, `'map'` extends this taxonomy. |
| **Results Widget** | `wod-results-widget.ts` | CM6 widget decoration rendering an expandable HTML table below WOD blocks. Demonstrates compound component overlay within the editor. |
| **Overlay Width Policy** | `OverlayWidthPolicy.ts` | Per-section-type width allocation. Reporting blocks need their own width policy (likely `active: 100, inactive: 100` for full-width rendering). |
| **Analytics Transformer** | `AnalyticsTransformer.ts` | Converts runtime `OutputStatement[]` → `Segment[]` with normalized time/metrics. Primary data source for report queries. |
| **Projection Engines** | `timeline/analytics/analytics/` | Domain-specific aggregators (Volume, Rep, Distance, MET-minutes). Each produces `ProjectionResult[]` — query language maps to these. |
| **Overlay Track** | `OverlayTrack.tsx` | Scroll-synced positioning for section-aligned overlays. Reporting blocks render their visualizations through this system. |
| **Review Stories** | `stories/Components/Review/` | `ReviewWebHarness` demonstrates full runtime → analytics → visualization pipeline. Reporting blocks replicate this flow inline. |

### Key Patterns

| Pattern | How It Applies |
|---------|---------------|
| **Fenced code block detection** | `matchDialectFence()` matches ` ```wod `, ` ```log `, ` ```plan `. Extend to match ` ```table `, ` ```graph `, ` ```map ` with a separate "report dialect" category. |
| **Section-state CM6 extension** | `section-state.ts` classifies document lines into typed sections. New report section types flow through the same pipeline. |
| **Widget decoration pattern** | `wod-results-widget.ts` uses CM6 `WidgetType` to render HTML below WOD lines. Report blocks use the same mechanism to render tables/graphs/maps as inline widgets. |
| **Overlay companion pattern** | `WodCompanion.tsx` overlays a React component on WOD sections. Report blocks could use a `ReportCompanion` that shows the rendered visualization alongside the query source. |
| **Projection engine pattern** | `IProjectionEngine.calculateFromWorkout()` aggregates metrics into `ProjectionResult[]`. The query language maps user queries to engine invocations. |
| **Metric filter pattern** | `MetricFilter` already supports `origins`, `types`, `excludeTypes`. The query language reuses this filtering vocabulary. |

---

## 3. Proposed Solutions

### Solution A: Report Section Types with Inline CM6 Widget Rendering

**How It Works:** Extend the section-state system to recognize ` ```table `, ` ```graph `, ` ```map ` as new `SectionType` values (`'report-table'`, `'report-graph'`, `'report-map'`). Each reporting block contains a metric query (a small DSL parsed into a `ReportQuery` AST). A CM6 widget decoration replaces the block content with the rendered visualization (HTML table, chart, or map) in **view mode**. An edit button toggles back to raw query syntax. The query language reuses existing `MetricFilter` vocabulary and `IProjectionEngine` aggregation.

The block content follows a line-oriented query syntax:

```
```table
source: #fran, #murph            // filter by note tags or block IDs
metrics: duration, rep, effort    // select metric types
group: date                       // group by time period
sort: date desc                   // sort order
limit: 10                         // row limit
```​
```

A `ReportQueryParser` converts this into a `ReportQuery` object consumed by `ReportDataResolver` which invokes the analytics pipeline.

- **Implementation Complexity**: Medium
- **Alignment**: Excellent — extends existing section-state, widget decoration, and analytics patterns
- **Key Files**: New `src/components/Editor/types/reportQuery.ts`, new `src/components/Editor/extensions/report-widget.ts`, extend `section-state.ts`, extend `section.ts`, new `src/services/ReportDataResolver.ts`

### Solution B: Overlay Companion Panels for Report Blocks

**How It Works:** Instead of replacing block content with widget decorations, render report visualizations as **overlay companion panels** (like `WodCompanion.tsx`) that appear beside the code block. The raw query is always visible in the editor; the rendered report appears in the overlay track at `active: 100%` width. This preserves the "code is always visible" principle but requires more horizontal space.

The query language is the same as Solution A, but rendering uses React components in the overlay system rather than CM6 widget decorations.

- **Implementation Complexity**: Medium
- **Alignment**: Good — reuses overlay architecture but requires special handling for 100%-width companions that effectively become inline panels
- **Key Files**: New `src/components/Editor/overlays/ReportCompanion.tsx`, extend `OverlayWidthPolicy.ts`, extend `section-state.ts`, new `src/services/ReportDataResolver.ts`

### Solution C: Hybrid Widget + Companion with Edit Toggle

**How It Works:** Combine Solutions A and B. In **view mode**, the report block renders as a full-width CM6 widget decoration (the raw query is hidden, replaced by the visualization). In **edit mode**, the block reverts to raw query syntax with a companion overlay showing a live preview. A toggle button switches between modes. This matches the issue requirement: "once loaded, they become part of the view and are not editable unless an edit button is clicked."

The query language uses the same line-oriented DSL. The `ReportSectionState` tracks view/edit mode per block. Widget decorations use `Decoration.replace()` for view mode and `Decoration.widget()` for edit-mode preview.

- **Implementation Complexity**: Medium-High
- **Alignment**: Excellent — directly matches the issue description of view/edit toggle behavior, and reuses both widget decoration and overlay patterns
- **Key Files**: New `src/components/Editor/extensions/report-widget.ts`, new `src/components/Editor/overlays/ReportCompanion.tsx`, extend `section-state.ts`, new `src/services/ReportDataResolver.ts`, new `src/components/Editor/types/reportQuery.ts`

---

## 4. Recommendation

**Recommended: Solution C — Hybrid Widget + Companion with Edit Toggle**

This approach directly satisfies the core requirement: reporting blocks render as interactive HTML in the editor view and revert to editable query syntax on demand. It leverages both proven patterns from the codebase:

1. **CM6 widget decorations** (from `wod-results-widget.ts`) for the view-mode rendering — the visualization replaces the fenced code block in the document flow, creating a seamless reading experience.
2. **Overlay companion panels** (from `WodCompanion.tsx`) for the edit-mode preview — the query syntax is editable on the left while a live preview renders on the right.

The key architectural insight is that report blocks have a fundamentally different interaction model than WOD blocks. WOD blocks are *authored* (users write workout syntax) and *executed* (the runtime processes them). Report blocks are *configured* (users write queries) and *rendered* (the visualization engine processes them). The view/edit toggle maps cleanly to this distinction: **view mode is the default** (users consume reports), **edit mode is on-demand** (users configure queries).

### Implementation Steps

1. **Extend section type taxonomy** in `src/components/Editor/types/section.ts`:
   - Add `ReportDialect = 'table' | 'graph' | 'map'` type
   - Add `VALID_REPORT_DIALECTS: ReportDialect[]` constant
   - Add `'report-table' | 'report-graph' | 'report-map'` to `SectionType` union
   - Add optional `reportDialect?: ReportDialect` to `EditorSection`

2. **Extend fence detection** in `src/components/Editor/utils/blockDetection.ts` and `src/components/Editor/extensions/section-state.ts`:
   - Add `matchReportFence()` function recognizing ` ```table `, ` ```graph `, ` ```map `
   - Wire into `section-state.ts` document parser alongside existing `matchDialectFence()`
   - Classify detected blocks as `report-table`, `report-graph`, or `report-map` sections

3. **Define metric query language** in new `src/components/Editor/types/reportQuery.ts`:
   - Define `ReportQuery` interface: `{ source, metrics, group, sort, limit, filters }`
   - Define `ReportQueryParser` that converts line-oriented DSL → `ReportQuery` AST
   - DSL keywords: `source`, `metrics`, `group`, `sort`, `limit`, `where`
   - Reuse `MetricType` enum values and `MetricFilter` vocabulary

4. **Create report data resolver** in new `src/services/ReportDataResolver.ts`:
   - `ReportDataResolver.resolve(query: ReportQuery): ReportDataSet`
   - Consumes `AnalyticsTransformer` segments and `IProjectionEngine` aggregation
   - Returns `ReportDataSet` with typed rows/columns for tables, series/points for graphs

5. **Create CM6 report widget extension** in new `src/components/Editor/extensions/report-widget.ts`:
   - `reportWidgetField` StateField tracking view/edit mode per report section
   - `ReportViewWidget` extends `WidgetType` — renders table/graph/map HTML with edit toggle button
   - `Decoration.replace()` hides raw query, shows visualization in view mode
   - Toggle dispatches transaction to switch to edit mode (removes replacement decoration)

6. **Create report companion overlay** in new `src/components/Editor/overlays/ReportCompanion.tsx`:
   - React component rendering live preview during edit mode
   - Consumes `ReportQuery` parsed from block content
   - Renders appropriate visualization (table, chart, map placeholder)
   - Shows query validation errors inline

7. **Extend overlay width policy** in `src/components/Editor/overlays/OverlayWidthPolicy.ts`:
   - Add `'report-table'`, `'report-graph'`, `'report-map'` section types
   - View mode: `{ active: 100, inactive: 100 }` (full-width visualization)
   - Edit mode: `{ active: 50, inactive: 0 }` (side-by-side with query)

8. **Create wizard component** in new `src/components/Editor/overlays/ReportWizard.tsx`:
   - Step-based query builder: Select source → Pick metrics → Configure grouping → Preview
   - Generates query DSL text and inserts into editor
   - Accessible from report companion panel or command palette

9. **Create visualization components**:
   - `src/components/reports/ReportTable.tsx` — Sortable, filterable data table
   - `src/components/reports/ReportGraph.tsx` — Chart visualization (leverage Recharts, already used in ReviewGrid)
   - `src/components/reports/ReportMap.tsx` — Map placeholder (future, for GPX data)

10. **Add tests** for:
    - Report fence detection (` ```table `, ` ```graph `, ` ```map `)
    - Query parser: valid queries, edge cases, error messages
    - Data resolver: segment filtering, grouping, aggregation
    - Widget toggle: view ↔ edit mode transitions
    - Overlay width policy: report section types

### Metric Query Language Design

The query language uses a line-oriented key-value syntax consistent with the declarative nature of WOD Wiki:

```
```table
source: @workout/fran, @workout/murph    // note references (wikilink-style)
metrics: duration, rep, effort            // MetricType values to include
group: week                               // group by: day | week | month | exercise
sort: date desc                           // sort by field + direction
limit: 20                                 // max rows
where: duration > 300                     // filter predicate (optional)
```​
```

```
```graph
source: *                                 // all workouts in current note
metrics: duration                         // y-axis metric
group: exercise                           // series grouping
type: bar                                 // chart type: bar | line | scatter | pie
range: 30d                                // time range: 7d | 30d | 90d | 1y | all
```​
```

```
```map
source: @runs/*                           // wildcard note matching
metrics: distance, duration               // overlay metrics
type: route                               // map type: route | heatmap | points
```​
```

**Design Principles:**
- Each line is a `key: value` pair
- Keys map to `ReportQuery` fields
- Values use existing vocabulary (`MetricType` names, sort directions)
- Source references use `@note/path` wikilink convention or `*` wildcard
- Extensible: new keys can be added without breaking existing queries

### Testing Strategy

| Category | Test Cases |
|----------|-----------|
| Fence detection | ` ```table `, ` ```graph `, ` ```map ` recognized as report sections; ` ```TABLE ` case insensitive; ` ```tablefoo ` rejected |
| Query parsing | Valid multi-line query → `ReportQuery` AST; missing required fields → error; unknown keys → warning; empty block → default query |
| Data resolution | Single-note source resolves segments; cross-note `@path` resolves; wildcard `*` resolves all; metric type filter applies; grouping produces correct buckets |
| Widget rendering | View mode replaces block with visualization; edit toggle restores raw syntax; re-entering view mode re-renders |
| Overlay policy | Report sections get correct width in view vs. edit mode |
| Wizard | Step-through produces valid query DSL; inserting query updates editor |

---

## 5. Validation & Next Steps

- [ ] Review this brainstorm analysis for completeness and alignment with project goals
- [ ] Validate that the query language syntax is intuitive for non-technical users
- [ ] Confirm view/edit toggle UX matches expected behavior from the issue
- [ ] Decide whether `source` references use `@path` notation, `#tag` notation, or both
- [ ] Determine chart library preference for `ReportGraph` (Recharts is already a dependency via ReviewGrid)
- [ ] Clarify map requirements: is GPX data already stored, or does the map block need a data ingestion pipeline?
- [ ] Assess whether the query language needs a formal grammar (Chevrotain/Lezer) or if line-based parsing suffices
- [ ] Create a Plan issue using `.github/ISSUE_TEMPLATE/plan.md` to transition to implementation planning
- [ ] Update `AGENTS.md` with reporting block conventions once the design is finalized

---

## 6. Alternatives and Edge Cases

### Simpler Alternative Considered

The simplest approach would be to render report blocks as static Markdown tables using a CM6 preview decoration (similar to `preview-decorations.ts`). The query language would be replaced by inline Markdown table syntax with a custom header row that triggers data population. This avoids the widget decoration complexity and view/edit toggle but severely limits interactivity — no sorting, filtering, chart types, or map rendering. It also conflates data definition (what to query) with data presentation (table formatting), making it fragile when the underlying data changes.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Empty query block** | Render a placeholder with "Configure this report" prompt and wizard button. No error. |
| **Invalid metric type** | Query parser emits warning diagnostic; unknown metrics are ignored in data resolution. Visualization renders available metrics only. |
| **No matching data** | Render empty state: "No data matches this query" with a link to the wizard for query adjustment. |
| **Cross-note references** | `source: @workout/fran` resolves via note repository. If note not found, render warning with broken-link styling. |
| **Circular references** | Report block referencing its own note's WOD results is valid (self-referential analytics). Report blocks referencing other report blocks is prohibited (no report-of-reports). |
| **Large datasets** | `limit` keyword caps row count. Graph rendering uses downsampling for > 1000 points. Table uses virtual scrolling. |
| **Concurrent edits** | View-mode widget re-renders on document change (CM6 transaction). Edit-mode preview debounces query re-evaluation (300ms). |
| **Mixed report and WOD blocks** | A single document can contain both ` ```wod ` and ` ```table ` blocks. Section-state handles them independently. Report blocks query results from WOD blocks in the same document. |
| **Mobile rendering** | Report widgets render full-width. Tables scroll horizontally. Graphs resize responsively. Map (future) uses touch gestures. |

### Performance Implications

- **Query parsing** is line-based string splitting — negligible cost (< 1ms per block).
- **Data resolution** invokes `AnalyticsTransformer` and projection engines. For typical workout notes (< 100 segments), resolution is < 10ms. Cross-note queries may be slower depending on note repository performance.
- **Widget rendering** uses `Decoration.replace()` which is efficient in CM6 — the replaced range is not parsed or laid out by the editor. The HTML widget renders outside the CM6 layout flow.
- **View/edit toggle** is a CM6 transaction (state update + decoration recalculation). Cost is proportional to the number of report blocks in the document, typically < 5.
- **Recharts rendering** (for graphs) is React-based and may take 50-100ms for initial render. Subsequent re-renders are faster due to React reconciliation.

### Feature Interactions

| Feature | Interaction |
|---------|-------------|
| **Dialect System** | Report blocks are a new dialect axis: *visualization dialects* (table/graph/map) orthogonal to both measurement dialects (CrossFit/Running) and language dialects (wod/log/plan). |
| **Metric Container Alignment** (brainstorm) | Reports consume metrics via `IMetricSource.getDisplayMetrics()`. Layered precedence resolution is transparent to report consumers. Reports may want to access specific origin layers via `MetricFilter.origins`. |
| **Syntax Feedback** (brainstorm) | Report query syntax needs its own hover tooltips (metric type documentation, source resolution status). Integrates with the CM6 hover tooltip extension. |
| **View/Panel Architecture** (brainstorm) | Report blocks are panel-like components embedded in the editor view. In multi-view configurations, the same report block could render in both an editor panel and a dedicated analytics panel. |
| **Results Widget** (existing) | `wod-results-widget.ts` renders expandable result tables below WOD blocks. Report tables are conceptually similar but driven by queries rather than block-local results. |
| **Projection Engines** (existing) | The query language's `metrics` field maps directly to projection engine selection. `metrics: volume` → `VolumeProjectionEngine`, `metrics: distance` → `DistanceProjectionEngine`. |
