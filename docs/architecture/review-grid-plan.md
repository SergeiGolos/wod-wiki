# Review Panel → Grid Control — Implementation Plan

## Overview

Replace the current **Review view** (two-panel: `TimerIndexPanel` + `TimelineView`) with a **data grid** that treats `IOutputStatement[]` as rows and `FragmentType` columns as the primary data axis. The grid supports filtering, sorting, multi-fragment cells, debug/default view presets, user-collected overrides, and column-level graph tagging.

---

## Current State (What Exists)

| Component | File | Role |
|-----------|------|------|
| `ReviewPanelIndex` | [src/components/workbench/ReviewPanel.tsx](../src/components/workbench/ReviewPanel.tsx) | Wraps `TimerIndexPanel` → `RuntimeHistoryLog` (indented history list) |
| `ReviewPanelPrimary` | [src/components/workbench/ReviewPanel.tsx](../src/components/workbench/ReviewPanel.tsx) | Wraps `TimelineView` (Recharts line chart) |
| `AnalyticsTransformer` | [src/services/AnalyticsTransformer.ts](../src/services/AnalyticsTransformer.ts) | `IOutputStatement[]` → `Segment[]` + `AnalyticsGroup[]` + `AnalyticsDataPoint[]` |
| `viewDescriptors` | [src/components/layout/panel-system/viewDescriptors.ts](../src/components/layout/panel-system/viewDescriptors.ts) | `createReviewView(indexPanel, primaryPanel)` — two-panel layout |
| `workbenchSyncStore` | [src/components/layout/workbenchSyncStore.ts](../src/components/layout/workbenchSyncStore.ts) | Zustand slice: `analyticsData`, `analyticsSegments`, `analyticsGroups`, `selectedAnalyticsIds` |

**Data flow**: `Runtime.getOutputStatements()` → `AnalyticsTransformer` → Zustand store → Review panels.

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ReviewGridPanel  (full span=3, replaces both index + primary)  │
│                                                                  │
│  ┌─ Toolbar ───────────────────────────────────────────────────┐ │
│  │ View Preset: [Default ▾] [Debug ▾]  │  Filter: [________]  │ │
│  │ Column Visibility: [⏱️ Timer] [🏃 Effort] [💪 Rep] ...     │ │
│  │ Graph Tags: columns marked with 📊 icon send to chart      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Data Grid ─────────────────────────────────────────────────┐ │
│  │ # │ Block    │ Type   │ ⏱ Timer  │ 🏃 Effort │ 💪 Rep │ … │ │
│  │───│──────────│────────│──────────│───────────│────────│───│ │
│  │ 1 │ block-a  │ segment│ 0:30     │ Squats    │ 10     │   │ │
│  │   │          │        │          │           │ 12 (u) │   │ │
│  │ 2 │ block-b  │ compl. │ 1:00     │ Run       │        │   │ │
│  │   │          │        │ 0:45 (u) │           │        │   │ │
│  │ 3 │ [system] │ mile…  │          │           │        │   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Graph Area (collapsible) ──────────────────────────────────┐ │
│  │ Recharts visualization of columns tagged for graphing       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Requirements

### R1 — Fragment-Type Columns

Each `FragmentType` becomes a **column**. A single `IOutputStatement` can carry **multiple fragments of the same type** (e.g., two `rep` fragments from different origins). Grid cells must render all of them.

**Column set** (derived from `FragmentType` enum):

| Column | FragmentType | Cell renders |
|--------|-------------|-------------|
| Timer | `timer` | Formatted duration(s) |
| Rep | `rep` | Numeric rep count(s) |
| Effort | `effort` | Exercise name(s) |
| Distance | `distance` | Distance value(s) |
| Rounds | `rounds` | Round count(s) |
| Action | `action` | Action label(s) |
| Increment | `increment` | Delta value(s) |
| Group | `group` | Group label(s) |
| Text | `text` | Freeform text(s) |
| Resistance | `resistance` | Weight value(s) |
| Sound | `sound` | Sound trigger(s) |

**Fixed columns** (always present): `#` (row index), `Block Key`, `Output Type`, `Stack Level`, `Elapsed`, `Total`.

### R2 — Multi-Value Cells

When a row has multiple fragments of the same `FragmentType`:
- Render each fragment as a **pill/badge** inside the cell, color-coded by `origin` (`parser` / `compiler` / `runtime` / `user`).
- User-origin values get a distinct visual treatment (e.g., `(u)` suffix or italic + border).
- Tooltip on hover shows full `{ value, origin, sourceBlockKey, timestamp }`.

### R3 — Two Results Lists (Runtime + User Overrides)

Maintain **two separate** output lists in the store:

| List | Source | Description |
|------|--------|-------------|
| `runtimeOutputs` | `Runtime.getOutputStatements()` | System-generated (current behavior) |
| `userOutputs` | User data collection UI | User-entered overrides / additions |

The grid displays a **merged view**: for each row (matched by `sourceBlockKey` + `sourceStatementId`), user fragments overlay/augment runtime fragments. User fragments get `origin: 'user'`.

**Store additions** (in `workbenchSyncStore`):
```typescript
userOutputOverrides: Map<string, ICodeFragment[]>;  // key = sourceBlockKey
setUserOverride: (blockKey: string, fragments: ICodeFragment[]) => void;
clearUserOverride: (blockKey: string) => void;
```

### R4 — Filtering & View Presets

**Filter system**:
- Per-column text/value filter (header row filter inputs).
- Global search bar (matches any cell text).
- `outputType` filter (`segment` | `completion` | `milestone` | `label` | `metric`).
- `origin` filter (show/hide by fragment origin).

**View presets** (pre-populated filter configs):

| Preset | Filter Config | Notes |
|--------|--------------|-------|
| `default` | Hide `milestone`, `label` system events; show `segment` + `completion` + `metric` | Normal user view |
| `debug` | Show everything including system events | Activated by existing `DebugButton` toggle on workbench |

Preset is selected by:
- Toolbar dropdown (later: saved user views).
- `isDebugMode` from workbench toggles between `default` ↔ `debug` automatically.

**Interface**:
```typescript
interface GridViewPreset {
  id: string;
  label: string;
  filters: GridFilterConfig;
  visibleColumns: FragmentType[];
  isDefault?: boolean;
}

interface GridFilterConfig {
  outputTypes?: OutputStatementType[];
  origins?: FragmentOrigin[];
  searchText?: string;
  columnFilters?: Record<string, string>;   // column id → filter value
}
```

### R5 — Sorting

- Click column header to sort ascending/descending/none.
- Multi-sort with Shift+click.
- Default sort: row index (insertion order = execution order).
- Numeric columns sort by value; text columns sort alphabetically.
- Multi-value cells sort by first fragment's value.

### R6 — Graph Tagging

- Each numeric column header has a **graph toggle** icon (📊).
- Clicking it tags/untags the column for graph visualization.
- Tagged columns feed into the collapsible graph panel below the grid.
- Graph panel reuses `AnalyticsGroup` / `AnalyticsGraphConfig` types.
- The graph area uses existing Recharts infrastructure (extracted from `TimelineView` into a reusable `MetricChart` component).

### R7 — Debug Integration

- Wire `isDebugMode` (from `WorkbenchContent` state) into the grid.
- When debug mode toggles ON → switch to `debug` preset.
- When debug mode toggles OFF → switch to `default` preset.
- Debug preset reveals: system events, `milestone` / `label` output types, `sourceBlockKey`, `stackLevel`, completion reasons.

---

## Implementation Phases

### Phase 1 — Grid Data Model & Store

**Files to create**:
- `src/components/review-grid/types.ts` — `GridRow`, `GridColumn`, `GridFilterConfig`, `GridViewPreset`, `GridSortConfig`
- `src/components/review-grid/useGridData.ts` — Hook that merges `runtimeOutputs` + `userOutputOverrides`, pivots fragments into column-keyed cells, applies filters/sort
- `src/components/review-grid/gridPresets.ts` — `DEFAULT_PRESET`, `DEBUG_PRESET`

**Store changes** (`workbenchSyncStore.ts`):
- Add `userOutputOverrides`, `setUserOverride`, `clearUserOverride`
- Add `gridViewPreset: string` (preset id), `setGridViewPreset`

**Types**:
```typescript
// GridRow — one per IOutputStatement
interface GridRow {
  id: number;
  index: number;
  sourceBlockKey: string;
  outputType: OutputStatementType;
  stackLevel: number;
  elapsed: number;
  total: number;
  completionReason?: string;
  cells: Map<FragmentType, GridCell>;    // fragment-type → cell data
}

// GridCell — multi-value cell
interface GridCell {
  fragments: ICodeFragment[];            // all fragments of this type for this row
  hasUserOverride: boolean;              // true if any fragment has origin='user'
}

// GridColumn — column definition  
interface GridColumn {
  id: string;
  fragmentType?: FragmentType;           // undefined for fixed columns
  label: string;
  icon?: string;
  sortable: boolean;
  filterable: boolean;
  graphable: boolean;                    // whether this column can be tagged for graphing
  isGraphed: boolean;                    // currently tagged for graph
  visible: boolean;
}
```

### Phase 2 — Grid UI Components

**Files to create**:
- `src/components/review-grid/ReviewGrid.tsx` — Main grid component (replaces both `ReviewPanelIndex` + `ReviewPanelPrimary`)
- `src/components/review-grid/GridToolbar.tsx` — Preset selector, global search, column visibility toggles
- `src/components/review-grid/GridHeader.tsx` — Column headers with sort indicators + graph toggle + filter inputs
- `src/components/review-grid/GridRow.tsx` — Row renderer
- `src/components/review-grid/GridCell.tsx` — Multi-fragment cell renderer (pills/badges)
- `src/components/review-grid/FragmentPill.tsx` — Single fragment badge (styled by `fragmentColorMap` + origin)
- `src/components/review-grid/index.ts` — Barrel export

**Styling**: All Tailwind, using existing `fragmentColorMap` colors. Dark mode support via existing `dark:` variants.

**Key behaviors**:
- Virtual scrolling for large output sets (use CSS `overflow-auto` + `max-height`; defer full virtualization to later).
- Sticky header row.
- Row selection (click / Ctrl+click / Shift+click) — reuses existing `toggleAnalyticsSegment` logic.
- Column resize: stretch within available space, not a priority for Phase 2.

### Phase 3 — Graph Integration

**Files to create**:
- `src/components/review-grid/GridGraphPanel.tsx` — Collapsible graph area below grid
- `src/components/review-grid/useGraphData.ts` — Derives `AnalyticsDataPoint[]` + `AnalyticsGroup[]` from grid rows + tagged columns

**Approach**:
- Extract chart rendering from `TimelineView` into a reusable `MetricChart` component (or keep `TimelineView` and feed it filtered data).
- `GridGraphPanel` shows line/bar chart for each tagged column.
- Segment selection in grid ↔ graph highlighting are bidirectionally synced (via store).

### Phase 4 — User Data Collection

**Files to create**:
- `src/components/review-grid/UserOverrideDialog.tsx` — Modal/popover for entering user values
- `src/components/review-grid/useUserOverrides.ts` — Hook for CRUD on `userOutputOverrides`

**UX**:
- Double-click a cell → opens `UserOverrideDialog` for that row+column.
- User enters a value → creates an `ICodeFragment` with `origin: 'user'`.
- Stored in `userOutputOverrides` map (keyed by `sourceBlockKey`).
- Merged into grid display with visual distinction (border, `(u)` tag).
- User overrides persist in Zustand store (and optionally localStorage for session persistence).

### Phase 5 — View Wiring & Cleanup

**Files to modify**:
- `src/components/layout/panel-system/viewDescriptors.ts` — Change `createReviewView` to accept a single `gridPanel` (span=3) instead of index+primary.
- `src/components/layout/Workbench.tsx` — Replace `ReviewPanelIndex` + `ReviewPanelPrimary` with single `ReviewGrid`. Pass `isDebugMode`.
- `src/components/workbench/ReviewPanel.tsx` — Archive (move to `src/components/workbench/_archive/ReviewPanel.tsx`) or delete.

**`createReviewView` change**:
```typescript
// Before
export function createReviewView(indexPanel, timelinePanel): ViewDescriptor

// After
export function createReviewView(gridPanel: React.ReactNode): ViewDescriptor {
  return {
    id: 'review',
    label: 'Review',
    icon: React.createElement(BarChart2, { className: 'w-4 h-4' }),
    panels: [{
      id: 'review-grid',
      defaultSpan: 3,       // Full width
      content: gridPanel,
    }],
  };
}
```

**`Workbench.tsx` change**:
```tsx
// Before
const reviewIndexPanel = <ReviewPanelIndex ... />;
const reviewPrimaryPanel = <ReviewPanelPrimary ... />;
createReviewView(reviewIndexPanel, reviewPrimaryPanel)

// After
const reviewGridPanel = (
  <ReviewGrid
    runtime={runtime}
    segments={analyticsSegments}
    selectedSegmentIds={selectedAnalyticsIds}
    onSelectSegment={toggleAnalyticsSegment}
    groups={analyticsGroups}
    rawData={analyticsData}
    isDebugMode={isDebugMode}
  />
);
createReviewView(reviewGridPanel)
```

---

## File Inventory

### New Files

| File | Phase | Purpose |
|------|-------|---------|
| `src/components/review-grid/types.ts` | 1 | Grid types and interfaces |
| `src/components/review-grid/gridPresets.ts` | 1 | Default + Debug view presets |
| `src/components/review-grid/useGridData.ts` | 1 | Data transformation hook |
| `src/components/review-grid/ReviewGrid.tsx` | 2 | Main grid component |
| `src/components/review-grid/GridToolbar.tsx` | 2 | Toolbar (presets, search, column toggles) |
| `src/components/review-grid/GridHeader.tsx` | 2 | Sortable/filterable column headers |
| `src/components/review-grid/GridRow.tsx` | 2 | Row renderer |
| `src/components/review-grid/GridCell.tsx` | 2 | Multi-fragment cell |
| `src/components/review-grid/FragmentPill.tsx` | 2 | Single fragment badge |
| `src/components/review-grid/index.ts` | 2 | Barrel export |
| `src/components/review-grid/GridGraphPanel.tsx` | 3 | Collapsible graph |
| `src/components/review-grid/useGraphData.ts` | 3 | Graph data derivation |
| `src/components/review-grid/UserOverrideDialog.tsx` | 4 | User value entry |
| `src/components/review-grid/useUserOverrides.ts` | 4 | Override CRUD hook |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/components/layout/workbenchSyncStore.ts` | 1 | Add `userOutputOverrides`, `gridViewPreset`, actions |
| `src/components/layout/panel-system/viewDescriptors.ts` | 5 | `createReviewView` → single panel |
| `src/components/layout/Workbench.tsx` | 5 | Wire `ReviewGrid`, pass `isDebugMode` |

### Archived Files

| File | Phase | Action |
|------|-------|--------|
| `src/components/workbench/ReviewPanel.tsx` | 5 | Move to `_archive/` or delete |

---

## Data Flow (New)

```
Runtime.getOutputStatements()
  │
  ▼
WorkbenchSyncBridge (existing polling, no changes)
  │
  ├─► analyticsSegments (Segment[]) ─── still computed for graph compatibility
  ├─► analyticsData (AnalyticsDataPoint[]) 
  └─► analyticsGroups (AnalyticsGroup[])
  │
  ▼
useGridData(analyticsSegments, userOutputOverrides, activePreset, sortConfig, filterConfig)
  │
  ├─► gridRows: GridRow[]           (filtered + sorted)
  ├─► gridColumns: GridColumn[]     (visible, with graph tags)
  └─► graphTaggedColumns: string[]  (columns feeding graph)
  │
  ├───────────────────────► ReviewGrid (table render)
  └─► useGraphData(gridRows, graphTaggedColumns)
       │
       └─► GridGraphPanel (Recharts)
```

---

## Testing Strategy

| Test | Scope | Location |
|------|-------|----------|
| `useGridData` unit tests | Data pivot, merge, filter, sort | `src/components/review-grid/__tests__/useGridData.test.ts` |
| `gridPresets` unit tests | Preset filter application | `src/components/review-grid/__tests__/gridPresets.test.ts` |
| `FragmentPill` render tests | Multi-origin display | `src/components/review-grid/__tests__/FragmentPill.test.ts` |
| `ReviewGrid` integration | End-to-end with mock segments | `tests/review-grid/ReviewGrid.test.ts` |
| `UserOverrideDialog` tests | CRUD overrides merge | `src/components/review-grid/__tests__/UserOverrideDialog.test.ts` |
| Storybook stories | Visual verification | `stories/runtime/ReviewGrid.stories.tsx` |

---

## Migration Checklist

- [ ] Phase 1: Grid data model, store additions, presets
- [ ] Phase 2: Grid UI components (table, toolbar, cells, pills)
- [ ] Phase 3: Graph integration (collapsible chart panel)
- [ ] Phase 4: User data collection (override dialog + merge)
- [ ] Phase 5: Wire into Workbench, update view descriptors, archive old panel
- [ ] Validate: `bun run test` — no new failures
- [ ] Validate: `bun x tsc --noEmit` — no new type errors
- [ ] Validate: `bun run storybook` — grid renders in Review view

---

## Dependencies

- **No new npm packages required**. Table is built with native HTML `<table>` + Tailwind CSS.
- Recharts (already installed) for the graph panel.
- Zustand (already installed) for store extensions.
- `fragmentColorMap` (already exists) for cell styling.

## Open Questions (Deferred)

1. **Saved views**: User-defined presets persisted to localStorage or backend — deferred to a follow-up.
2. **Column reordering via drag**: Low priority, not in initial plan.
3. **CSV/JSON export**: Useful but not blocking.
4. **Virtual scrolling**: Only needed if output sets exceed ~500 rows; defer to optimization pass.
