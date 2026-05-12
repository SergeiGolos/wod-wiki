# Report Renderer — Graphs & Tables

## Vision

A composable report rendering system that takes `QueryResult` data (from the query language) or raw `Segment[]` / `AnalyticsGroup[]` and renders it as interactive tables, time-series charts, bar charts, or comparison views. Lives as a panel in the existing panel system and can also be embedded inline in markdown segments.

## What We Have Today

| Asset | Location | Relevance |
|-------|----------|-----------|
| `AnalyticsTransformer` | `src/services/AnalyticsTransformer.ts` | Produces `Segment[]` and `AnalyticsGroup[]` with colors/units |
| `MetricVisualizer` | `src/components/metrics/MetricVisualizer.tsx` | Color-coded metric badges |
| `MetricSourceRow` | `src/components/metrics/` | Generic row renderer with depth/indent |
| `ReviewGrid` | `src/components/` | Full-screen analytics grid |
| `CommitGraph` | `src/components/ui/CommitGraph.tsx` | History timeline DAG (has color system) |
| Panel system | `src/panels/` | Timer, track, plan, analyze panels |
| `AnalyticsGroup` | Analytics transformer output | Pre-grouped metrics with colors and units |
| Tailwind CSS | Throughout | Styling system — no custom CSS |

## Design Space

### What Kinds of Reports?

Based on the domain (workout tracking), users will want:

| Report Type | Data Shape | Visualization | Example |
|-------------|-----------|---------------|---------|
| **Workout summary** | Single result | Metric cards + timeline | "How did today's Fran go?" |
| **Trend over time** | Time-bucketed aggregates | Line/area chart | "My power output last 90 days" |
| **Comparison** | Multiple results side-by-side | Grouped bar chart | "Compare all my Fran attempts" |
| **Leaderboard / ranking** | Sorted aggregates | Table with sparklines | "Best 5k times" |
| **Distribution** | Histogram buckets | Bar chart / box plot | "Rep count distribution" |
| **Volume tracking** | Bucketed sums | Stacked area chart | "Weekly training volume by tag" |

### Charting Library Options

| Library | Size | Pros | Cons |
|---------|------|------|------|
| **Recharts** | ~45KB | React-native, declarative, good defaults | Limited customization |
| **Visx** (Airbnb) | ~20KB tree-shakeable | Low-level D3 + React, full control | More code to write |
| **Chart.js + react-chartjs-2** | ~60KB | Canvas-based, perf for large datasets | Imperative API under the hood |
| **Lightweight-charts** (TradingView) | ~40KB | Beautiful time-series, WebGL | Finance-oriented, less general |
| **SVG from scratch** | 0KB | Full control, Tailwind-friendly | Significant effort |
| **Observable Plot** | ~30KB | Grammar of graphics, expressive | Newer, smaller community |

### Recommendation

**Visx** for chart primitives — it's tree-shakeable, gives us full control over styling with Tailwind, and is built for React. Use it to build a small library of chart components that match the WOD Wiki visual language. For tables, build on native HTML with Tailwind (no heavy table library needed).

If speed-to-ship matters more than customization, **Recharts** is a solid second choice — less code, more opinionated, but good enough for V1.

## Architecture

### Component Hierarchy

```
<ReportPanel>                        # Panel integration
  <ReportView result={queryResult}>  # Picks renderer based on data shape
    <TableRenderer />                # Flat/grouped data
    <TimeSeriesChart />              # Bucketed time data
    <BarChart />                     # Categorical comparisons
    <MetricCards />                  # Single-workout summaries
    <ComparisonView />              # Side-by-side results
  </ReportView>
</ReportPanel>
```

### Auto-Detection Strategy

The renderer should auto-detect the best visualization based on `QueryResult` shape:

```typescript
function detectVisualization(result: QueryResult): VisualizationType {
  const hasTimeBucket = result.columns.some(c => c.name === '_bucket');
  const hasGroups = result.columns.some(c => c.isGroupKey);
  const hasAggregates = result.columns.some(c => c.aggregation);
  const rowCount = result.rows.length;

  if (rowCount === 1 && !hasGroups)     return 'metric-cards';
  if (hasTimeBucket && hasAggregates)   return 'time-series';
  if (hasGroups && hasAggregates)       return 'bar-chart';
  if (rowCount <= 50)                   return 'table';
  return 'table'; // fallback
}
```

Users can override the auto-detected type via a toolbar toggle.

### Key Interfaces

```typescript
interface ReportViewProps {
  result: QueryResult;
  visualization?: VisualizationType;    // Override auto-detect
  onVisualizationChange?: (type: VisualizationType) => void;
}

type VisualizationType =
  | 'table'
  | 'time-series'
  | 'bar-chart'
  | 'metric-cards'
  | 'comparison'
  | 'distribution';

interface ColumnDef {
  name: string;
  type: 'string' | 'number' | 'date';
  unit?: string;           // 'watts', 'bpm', 'seconds', 'reps'
  aggregation?: string;    // 'avg', 'sum', etc.
  isGroupKey?: boolean;
  color?: string;          // From AnalyticsGroup color system
}
```

## Component Designs

### 1. Table Renderer

The bread-and-butter view. Every query result can fall back to this.

```
┌─────────────┬──────────┬──────────┬──────────┐
│ Exercise    │ Avg Power│ Max Reps │ Sessions │
├─────────────┼──────────┼──────────┼──────────┤
│ Back Squat  │   245w   │    12    │    8     │
│ Deadlift    │   310w   │     8    │    6     │
│ Clean       │   185w   │    15    │   12     │
└─────────────┴──────────┴──────────┴──────────┘
```

Features:
- Sortable columns (click header)
- Unit-aware formatting (seconds → mm:ss, watts → Xw)
- Conditional coloring (heatmap mode for numeric columns)
- Expandable rows for grouped data
- Responsive: horizontal scroll on mobile, sticky first column

Implementation:
```
src/
  components/
    reports/
      TableRenderer.tsx       # Main table component
      TableHeader.tsx         # Sortable header with unit labels
      TableCell.tsx           # Type-aware cell formatting
      HeatmapCell.tsx         # Color-scaled numeric cells
```

### 2. Time Series Chart

For `bucket by` queries — shows trends over time.

```
Power (avg)
300w ┤
     │         ╭──╮
250w ┤    ╭───╯    ╰──╮
     │───╯              ╰───
200w ┤
     └────┬────┬────┬────┬──
        W1   W2   W3   W4
```

Features:
- Multi-series support (overlay multiple metrics)
- Hover tooltip with exact values
- Zoom/pan for long time ranges
- Reference lines (goals, PRs)
- Area fill option for volume metrics

Implementation:
```
src/
  components/
    reports/
      TimeSeriesChart.tsx     # Line/area chart with Visx
      ChartTooltip.tsx        # Hover detail panel
      ChartAxis.tsx           # Formatted axes (time + metric)
      ChartLegend.tsx         # Multi-series legend
```

### 3. Bar Chart

For grouped categorical data — exercise comparisons, tag breakdowns.

```
Avg Power by Exercise (last 30d)

Back Squat  ████████████████████ 245w
Deadlift    ██████████████████████████ 310w  
Clean       ███████████████ 185w
Press       ██████████ 135w
```

Features:
- Horizontal or vertical orientation
- Grouped bars for multi-metric queries
- Stacked bars for volume breakdowns
- Value labels on bars
- Color from `AnalyticsGroup` color system

### 4. Metric Cards

For single-workout or single-result summaries.

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  12:34   │  │   245w   │  │  24 reps │  │  162 bpm │
│ Elapsed  │  │ Avg Power│  │  Total   │  │ Avg HR   │
│ ▼ -0:23  │  │ ▲ +12w   │  │ ═ same   │  │ ▲ +5bpm  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

Features:
- Large hero number with unit
- Metric label below
- Delta from previous attempt (if comparison data available)
- Color-coded delta arrows (green = improvement relative to metric direction)
- Responsive grid (4 → 2 → 1 columns)

### 5. Comparison View

Side-by-side results for the `compare` query stage.

```
        Fran #1 (Jan 3)    Fran #2 (Feb 14)    Fran #3 (Mar 1)
Time      3:45                3:22 ▼              3:08 ▼
Rounds    3                   3                   3
Avg HR    172                 168 ▼               171 ▲
```

Features:
- Column per result, row per metric
- Delta highlighting between adjacent columns
- Sparkline in each cell showing intra-workout progression
- Best value per row highlighted

## Panel Integration

### New Panel: `report-panel`

Register in the panel system alongside timer-panel, track-panel, plan-panel, analyze-panel.

```typescript
// src/panels/report-panel/ReportPanel.tsx
interface ReportPanelProps {
  query?: string;              // Pre-populated query
  result?: QueryResult;        // Pre-computed result
}
```

**Panel behavior:**
- Opens from command palette: "Show Report" command
- Query input at top (CodeMirror with query language grammar)
- Results fill the panel body
- Visualization toggle in toolbar (table / chart / cards)
- Export button (CSV for tables, PNG for charts)

### Inline Embedding

Reports can also be embedded in markdown note segments:

```markdown
## Weekly Summary

```wod-query
workouts | where last 7d | group by tag | sum(duration), count()
```​

This renders as an inline chart/table within the note view.
```

Implementation: Add a `wod-query` code fence handler to the markdown renderer (the section renderers in `src/components/Editor/md-components/section-renderers/`).

## Styling Strategy

All components use Tailwind utilities. Key design tokens:

```
Background:    bg-zinc-900 (dark) / bg-white (light)
Card:          bg-zinc-800/50 rounded-lg p-4
Text primary:  text-zinc-100
Text muted:    text-zinc-400
Accent:        Metric-type colors from AnalyticsGroup
Grid gap:      gap-3 (cards), gap-px (table)
Font:          tabular-nums for all numeric values
```

Chart colors should pull from the existing `AnalyticsGroup` color mappings so metric colors are consistent across the app (power = same color everywhere).

## Implementation Phases

### Phase 1: Table + Metric Cards

Minimum viable report rendering. Covers most query results.

```
src/components/reports/
  ReportView.tsx            # Router: detects viz type, renders sub-component
  TableRenderer.tsx         # Sortable table with unit formatting
  MetricCards.tsx           # Single-result summary cards
  formatters.ts             # Unit-aware number formatting (seconds→mm:ss, etc.)
  types.ts                  # Shared report types
```

**Dependencies:** None (pure React + Tailwind)

### Phase 2: Time Series + Bar Charts

Add charting capabilities.

```
src/components/reports/
  charts/
    TimeSeriesChart.tsx
    BarChart.tsx
    ChartTooltip.tsx
    ChartAxis.tsx
    ChartLegend.tsx
    useChartDimensions.ts   # Responsive sizing hook
```

**Dependencies:** Visx (or Recharts)

### Phase 3: Panel + Inline Integration

Wire reports into the app.

```
src/panels/report-panel/
  ReportPanel.tsx
  ReportToolbar.tsx         # Viz toggle, export, share
  QueryInput.tsx            # CodeMirror with query grammar
```

### Phase 4: Advanced Visualizations

- Comparison view
- Distribution/histogram
- Sparklines in table cells
- Export to CSV/PNG
- Saved report templates

## Data Flow

```
QueryResult (from QueryEngine)
       │
       ▼
  ReportView
       │
       ├── detectVisualization(result)
       │
       ├── TableRenderer ← flat/grouped rows
       ├── TimeSeriesChart ← bucketed time data
       ├── BarChart ← categorical groups
       ├── MetricCards ← single result
       └── ComparisonView ← multiple results
       
Alternative entry:
  AnalyticsTransformer.getAnalyticsFromLogs(logs)
       │
       ▼
  AnalyticsGroup[] (with colors, units)
       │
       ▼
  TimeSeriesChart / BarChart (direct rendering without query)
```

## Mobile Considerations

- Tables: Horizontal scroll with sticky first column, or card-per-row layout on narrow viewports
- Charts: Full-width, reduced axis labels, touch-friendly tooltips
- Metric cards: Stack vertically (1 column)
- Use `useMediaQuery` or Tailwind breakpoints (`sm:`, `md:`) for responsive layouts

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size from charting library | Slower initial load | Tree-shake Visx; lazy-load chart components |
| Performance with large datasets (1000+ segments) | Janky charts | Canvas renderer for large data; virtualized table rows |
| Color accessibility | Unusable for colorblind users | Use patterns/shapes in addition to color; test with simulator |
| Chart interactivity on mobile | Touch targets too small | Minimum 44px tap targets; long-press for tooltip |

## Open Questions

- Should reports be shareable (generate a link or image)?
- Do we want a dashboard mode (multiple reports on one screen)?
- How do we handle real-time updates (live workout → live chart)?
- Should saved report configurations be stored as `NoteSegment` types or separately?
