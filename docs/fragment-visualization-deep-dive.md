# Fragment Visualization Deep Dive

This document explains how fragment chips are produced and reused across the three main surfaces that render workout structure:

- Analytics Results screen
- Track Timer screen (runtime history)
- Plan screen overlays (code statements)

It focuses on the flow from source data to fragments, the shared components, and what differs per surface.

## Big Picture

All surfaces converge on the same visual primitive:

```
Source data (segments | runtime spans | code statements)
  |
  |- adapters -> IDisplayItem (with ICodeFragment[])
  |
  |- UnifiedItemList/UnifiedItemRow (list rendering)
  |
  `- FragmentVisualizer (chips: color + icon + tooltip)
```

Key shared pieces:
- `ICodeFragment` (core model) carries `type`, `fragmentType`, `value`, `image`.
- `FragmentVisualizer` (`src/views/runtime/FragmentVisualizer.tsx`): renders chips with color classes from `fragmentColorMap` and icons from `getFragmentIcon`.
- `UnifiedItemRow` / `UnifiedItemList` (`src/components/unified/`): list rows that embed `FragmentVisualizer` and handle selection, timestamps, durations.
- Display adapters (`src/core/adapters/displayItemAdapters.ts`): normalize different source models into `IDisplayItem` with fragments attached.

## Surface-by-Surface Flow

### 1) Analytics Results screen
- Entry: `AnalyticsIndexPanel` (`src/components/layout/AnalyticsIndexPanel.tsx`).
- Source model: `Segment` (analytics history).
- Adapter path:
  - `segmentToFragments`: builds fragment array (type, start time as timer, per-metric chips with units and inferred fragmentType).
  - `segmentToDisplayItem`: wraps fragments into `IDisplayItem` (depth, header flags, metadata).
- Rendering path: `UnifiedItemList` -> `UnifiedItemRow` -> `FragmentVisualizer` chips.
- Differences: uses historical metrics (power, resistance, distance, reps, heart rate, etc.) and inserts synthetic "end" marker fragments for the last segment.

### 2) Track Timer screen (runtime execution history)
- Entry: `TrackPanel` -> `TimerIndexPanel` -> `RuntimeHistoryLog`.
- Source model: `ExecutionSpan` objects produced by `ScriptRuntime` (active + completed spans).
- Adapter path:
  - `spansToDisplayItems`/`spanToDisplayItem`: converts span metrics to fragments via `spanMetricsToFragments`, inherits metrics from parent spans, computes depth and status.
- Rendering path: `UnifiedItemList` (auto-scroll, optional hide active) -> `UnifiedItemRow` -> `FragmentVisualizer` chips.
- Differences: fragments come from live runtime metrics (`compiledMetrics`/span metrics), statuses reflect execution state (active/completed), depth is from parent span chain. No statement text--labels come from spans/blocks.

### 3) Plan screen overlays (code statement preview)
- Entry: `PlanPanel` overlay and editor inline cards use `StatementDisplay` (`src/components/fragments/StatementDisplay.tsx`).
- Source model: `ICodeStatement` produced by the parser (already includes `fragments`).
- Adapter path: none needed; statements carry fragments directly.
- Rendering path: `StatementDisplay` -> `FragmentVisualizer` chips.
- Differences: shows parsed code fragments exactly as emitted by the parser (timer/rounds/effort/etc.). No runtime status or metrics inheritance. Depth is driven by document structure (e.g., WOD block grouping).

## What Differs Per Screen (at a glance)

| Surface | Source model -> fragments | Status/depth rules | Extra adornments |
|---------|--------------------------|--------------------|------------------|
| Analytics Results | `Segment` -> `segmentToFragments` | Depth from parent chain in segments; headers for separators/root | Adds end marker; units per metric; selection highlights |
| Track Timer | `ExecutionSpan` -> `spanMetricsToFragments` | Depth from parent spans; status reflects runtime (active/completed); can hide active in history mode | Auto-scroll to latest; grouping of linked items optional |
| Plan Overlay | `ICodeStatement` (parser) already has fragments | Depth from document/statement parent; no runtime status | Optional compact mode; click-to-navigate in overlays |

## Shared Visual Rules
- Color mapping lives in `fragmentColorMap.ts` (timer blue, rounds purple, effort yellow, rep green, resistance red, etc.). Unknown types fall back to neutral gray.
- Icons come from `getFragmentIcon` in `FragmentVisualizer` (for example: timer = stopwatch, rounds = circular arrows, resistance = flexed arm, action = play triangle). If no icon, text-only chip.
- Tooltip text is `TYPE: <pretty value>` from `fragment.value`/`fragment.image`.
- `compact` mode shrinks padding and font size; used in dense lists (Plan overlay, history).

## Precedence / Ordering
- Rendering order respects the incoming fragment array from the adapter/source. `FragmentVisualizer` does not reorder or group; grouping happens higher up (e.g., `UnifiedItemList` for linked items).
- Adapter precedence is surface-specific:
  - Analytics: `segmentToFragments` decides which metrics to emit (filters zero/non-present values, prefers group config units).
  - Runtime: `spanMetricsToFragments` uses runtime metrics and inherits missing metrics from parent spans before visualization.
  - Plan: parser-defined fragment order (as written in the WOD script).

## Consistency retrospective (where translation is lossy today)
- Many-to-one mapping: multiple `CodeStatement` nodes can compile into a single `RuntimeBlock` that emits `compiledMetrics`/`MetricResults`. During that merge, statement-level `fragments[]` are not preserved, so later surfaces only see the block label (for example, shows `Effort` text without the grouped metrics).
- Metrics grouping loss: `MetricResults` often hold `metrics[][]` but `spanMetricsToFragments`/`metricsToFragments` flatten or drop grouping context. On Analytics, only the top-level effort label survives, so collections joined with `+` are not visualized as multiple chips.
- Source provenance: runtime spans lack per-fragment provenance back to originating statements, so adapters cannot rehydrate the original fragment set when building `IDisplayItem` for history/analytics.
- Analytics ingestion: `Segment` construction appears to rely on recorded span metrics, not on the richer compiled fragments, so any loss earlier is permanent by the time Analytics renders.

## Efforts needed for a consistent fragment experience
1) Preserve fragments through compilation: when multiple `CodeStatement` items compose one `RuntimeBlock`, carry forward the union of their `fragments[]` (or a summarized form) into `RuntimeBlock.compiledMetrics` and into emitted spans.
2) Keep grouped metrics: extend `MetricResults` -> span payload so that `metrics[][]` survives and `spanMetricsToFragments` can emit multiple chips (one per grouped metric) instead of a single `Effort` label.
3) Add provenance: include originating statement ids (or fragment fingerprints) on spans so adapters can reconstruct the exact fragment set for visualization.
4) Analytics adapter parity: ensure the data feeding `Segment` mirrors runtime span fragments (after grouping fix). If `Segment.metrics` lacks grouping, add a parallel `fragments` or `metricGroups` field and render those in `segmentToFragments`.
5) Tests and story fixtures: add snapshot/story fixtures that cover (a) multi-statement-to-one-block compilation and (b) grouped metrics from `+` collections; assert that FragmentVisualizer shows multiple chips on Track and Analytics.

## Known hard parts / design risks
- Historical data gap: existing recorded segments likely lack fragment/grouping detail; backfill would need migration or regeneration from raw logs.
- Schema ripple: adding provenance and grouping to spans/segments touches runtime logging, adapters, and analytics storage; change management is required across these layers.
- Performance: carrying full fragment arrays per span increases payload size; may need capped fragment summaries to avoid history bloat.

## Reuse Map (where FragmentVisualizer is embedded)
- `UnifiedItemRow` (used by Analytics Index, Runtime History, other unified lists).
- `StatementDisplay` / `BlockDisplay` (Plan overlays, inline previews, block displays).
- Runtime Test Bench panels (Compilation/Stack panels use it for live debugging).
- Storybook demos (`stories/components/FragmentVisualizer.stories.tsx`) for visual QA.

## Mental Model: picking the path
- If you have **parsed code**: render directly with `StatementDisplay` -> `FragmentVisualizer`.
- If you have **runtime spans/blocks**: adapt with `spansToDisplayItems` (or `blockToDisplayItem` for stack) -> `UnifiedItemList` -> `FragmentVisualizer`.
- If you have **analytics history**: map `Segment` with `segmentToFragments` -> `segmentToDisplayItem` -> `UnifiedItemList` -> `FragmentVisualizer`.

Keep fragment creation close to the source model, then let the unified list + FragmentVisualizer handle the visuals consistently across screens.
