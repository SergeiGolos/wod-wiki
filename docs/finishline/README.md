# Production Finishline — Feature Roadmap

A collection of critical features and architectural improvements to reach production readiness. Each has a detailed planning document.

## Core Features

### 1. [Query Language](query-language.md)
A pipe-based query language for interrogating workout history — filter, group, aggregate, and compare workout data. Built on a Lezer grammar, executed against the existing `IContentProvider` data layer.

**Key deliverable:** `workouts | where last 30d AND tag = "strength" | group by exercise | avg(power)`

### 2. [Report Renderer](report-renderer.md)
A composable visualization system that renders query results as tables, time-series charts, bar charts, metric cards, and comparison views. Plugs into the panel system and can embed inline in markdown notes.

**Key deliverable:** Auto-detecting renderer that picks the right chart type based on data shape.

### 3. [Command Palette Line Editor](command-palette-editor.md)
Extends the existing command palette into a keyboard-first, mobile-friendly line editor with Quick Add, Edit-In-Place, and Batch Builder modes. Mobile view replaces the full editor with a tap-to-edit statement list.

**Key deliverable:** Ctrl+Enter opens quick-add; mobile users get a purpose-built input experience with token toolbar and templates.

## Engine & Editor Enhancements

### 4. [Results in Overlay](results-in-overlay.md)
Integrates historical performance data directly into the editor's line-specific overlays. Allows users to see their past split times, rep counts, and intensities while editing or hovering over specific workout movements.

### 5. [Dialect System](dialect-system.md)
Formalizes the execution semantics for different workout contexts. While syntax is shared, `wod` (live tracking), `log` (historical entry), and `plan` (future targeting) dialects inject unique runtime behaviors and UI controls.

### 6. [Comprehensive Runtime Tests](comprehensive-runtime-tests.md)
A data-driven, fixture-based test suite that validates the runtime engine across complex nested structures and ensures consistent behavior across all dialects and metric inheritance scenarios.

## Dependency Graph

```
                  ┌─────────────────┐
                  │  Query Language  │
                  │   (Parser +     │
                  │    Engine)       │
                  └────────┬────────┘
                           │ QueryResult
                           ▼
                  ┌─────────────────┐
                  │ Report Renderer  │
                  │  (Tables +      │
                  │   Charts)        │
                  └────────┬────────┘
                           │ Panel integration
                           ▼
              ┌────────────────────────┐
              │ Command Palette Editor  │
              │  (Query mode +         │
              │   Quick Add +          │
              │   Mobile view)         │
              └────────────────────────┘
```

The query language and command palette editor can be built in **parallel** — they converge when the query mode strategy pipes into the report renderer.

## Suggested Build Order

| Phase  | Feature                          | What Ships                                       |
| ------ | -------------------------------- | ------------------------------------------------ |
| **1a** | Query Language — Parser          | Grammar + AST + validator                        |
| **1b** | Command Palette — Quick Add      | Ctrl+Enter quick add with live preview           |
| **2a** | Query Language — Engine          | Pipeline executor against IContentProvider       |
| **2b** | Report Renderer — Tables + Cards | TableRenderer + MetricCards components           |
| **3**  | Report Renderer — Charts         | TimeSeriesChart + BarChart with Visx             |
| **4a** | Panel + Inline integration       | Report panel, wod-query code fence               |
| **4b** | Command Palette — Edit + Batch   | Edit-in-place and batch builder modes            |
| **5**  | Mobile View                      | MobileWorkoutView + MobilePalette + token bar    |
| **6**  | Polish                          | Feature | What Ships |
|-------|---------|------------|
| **1a** | Query Language — Parser | Grammar + AST + validator |
| **1b** | Command Palette — Quick Add | Ctrl+Enter quick add with live preview |
| **2a** | Query Language — Engine | Pipeline executor against IContentProvider |
| **2b** | Report Renderer — Tables + Cards | TableRenderer + MetricCards components |
| **3** | Report Renderer — Charts | TimeSeriesChart + BarChart with Visx |
| **4a** | Panel + Inline integration | Report panel, wod-query code fence |
| **4b** | Command Palette — Edit + Batch | Edit-in-place and batch builder modes |
| **5a** | Mobile View | MobileWorkoutView + MobilePalette + token bar |
| **5b** | Results in Overlay | Context-aware performance metrics in WodCompanion |
| **6a** | Dialect System | Strategy factory for wod/log/plan execution |
| **6b** | Runtime Tests | Multi-dialect compliance suite |
| **7** | Polish | Autocomplete, voice input, export, saved queries |

## Shared Infrastructure

These features share foundational pieces:

- **Lezer grammar tooling** — query language and WOD parser both use Lezer
- **CommandStrategy pattern** — all features register as command strategies
- **Strategy Factory** — dialect-aware behavior injection into the runtime
- **AnalyticsTransformer** — query engine and report renderer both consume `Segment[]`
- **Panel system** — report panel and query panel use existing panel infrastructure
- **Tailwind design tokens** — consistent styling across all new components
