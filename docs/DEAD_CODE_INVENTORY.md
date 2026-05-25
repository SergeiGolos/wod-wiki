# CDL Dead Code Inventory

**Purpose**: Catalog all code that will be removed when CDL implementation (Phases 2–4) is complete.  
**Updated**: 2026-05-25  
**Status**: Complete (Phase 1 analysis)  
**Related**: [ADR-0011](/WOD/issues/WOD-638#document-adr) — Column Definition Language

## Executive Summary

- **Total lines to remove**: ~790 lines
- **Affected files**: 5
- **Net code reduction after CDL interpreter**: ~600 lines
- **Removal phases**: 2, 3, 4 (see roadmap in ADR)
- **Safe to start removal**: After Phase 2 core interpreter is complete and tested

## File-by-File Breakdown

### 1. GridRow.tsx

#### 1.1 renderFixedCell() function

**Location**: `src/components/review-grid/GridRow.tsx` (estimated lines ~200–280)  
**Lines**: ~80  
**Reason for removal**: Replaced by unified CDL renderer

**Current code pattern**:
```tsx
function renderFixedCell(col: GridColumn, row: GridRow): ReactNode {
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return <span className="text-gray-500">{row.index}</span>;
    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return <span className="font-mono">{row.sourceBlockKey}</span>;
    case FIXED_COLUMN_IDS.ELAPSED:
      return <TimeCell seconds={row.elapsed} />;
    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      // ⚠️ BUG: This requires access to all rows, not just current row
      return <TimeCell seconds={/* cumulative */} />;
    // ... 10+ more cases
  }
}
```

**Replacement in CDL**:
```ts
const indexColumn: ColumnDef = {
  id: '#',
  source: { type: 'fixed-field', field: 'index' },
  format: { type: 'text', className: 'text-gray-500' },
};

const elapsedTotalColumn: ColumnDef = {
  id: 'elapsedTotal',
  source: { type: 'derived', compute: (row, context) => ... },
  format: { type: 'time', style: 'long' },
};
```

#### 1.2 GridCell component

**Location**: `src/components/review-grid/GridCell.tsx` (estimated ~300–460)  
**Lines**: ~120–160  
**Reason for removal**: Subsumed into unified CDL renderer

**Current role**: Renders metric cells with branching logic for badges, pills, text, etc.

**Current code pattern**:
```tsx
export const GridCell: React.FC<GridCellProps> = ({ cell, column, row }) => {
  if (!cell) return <div className="empty">—</div>;
  
  // Branch on column type
  if (column.type === MetricType.Rep) {
    return <BadgeCell value={cell.metrics.value} icon="●" />;
  }
  if (column.type === MetricType.Text) {
    return <TextCell text={cell.metrics.text} />;
  }
  if (column.type === MetricType.Effort) {
    return <PillCell effort={cell.metrics.value} />;
  }
  // ... more branches
};
```

**Replacement**: CDL format interpreter handles all rendering:
```ts
interface ColumnFormat {
  type: 'badge' | 'pill' | 'text' | 'combined' | 'custom';
  // ... format-specific config
}

function renderCell(value: unknown, format: ColumnFormat): ReactNode {
  switch (format.type) {
    case 'badge':
      return <BadgeCell style={format.styleResolver(value)} text={format.textResolver(value)} />;
    case 'text':
      return <TextCell text={format.transform?.(value) || value} />;
    // ... etc
  }
}
```

#### 1.3 FIXED_COLUMN_IDS usage

**Location**: Scattered throughout `GridRow.tsx`  
**Lines**: ~30 scattered checks  
**Reason for removal**: Replaced by CDL source definitions

**Current pattern**:
```tsx
if (col.id === FIXED_COLUMN_IDS.INDEX) { ... }
if (col.id === FIXED_COLUMN_IDS.BLOCK_KEY) { ... }
if (col.id === FIXED_COLUMN_IDS.ELAPSED_TOTAL) { ... }
```

**Replacement**: CDL-driven source interpretation:
```ts
// Column defines: source: { type: 'fixed-field', field: 'index' }
// Renderer automatically reads row[source.field]
```

**Total GridRow.tsx removal**: ~310 lines

---

### 2. useGridData.ts

#### 2.1 deriveVolumeCell() function

**Location**: `src/components/review-grid/useGridData.ts` (estimated ~500–560)  
**Lines**: ~40–60  
**Reason for removal**: Replaced by CDL derived source

**Current code pattern**:
```tsx
function deriveVolumeCell(row: GridRow): GridCell | undefined {
  const weight = row.cells.get(MetricType.Weight)?.metrics?.value;
  const reps = row.cells.get(MetricType.Rep)?.metrics?.value;
  
  if (!weight || !reps) return undefined;
  
  return {
    metrics: new MetricContainer({ 
      value: weight * reps, 
      origin: MetricOrigin.Derived 
    }),
    hasUserOverride: false,
  };
}
```

**Replacement in CDL**:
```ts
const volumeColumn: ColumnDef = {
  id: 'volume',
  source: {
    type: 'derived',
    compute: (row) => {
      const weight = row.cells.get(MetricType.Weight)?.metrics?.value;
      const reps = row.cells.get(MetricType.Rep)?.metrics?.value;
      return weight && reps ? weight * reps : undefined;
    },
  },
  format: { type: 'number', decimals: 0, unit: ' kg' },
};
```

#### 2.2 Sort switch statements

**Location**: `src/components/review-grid/useGridData.ts` (estimated ~600–680)  
**Lines**: ~60–80  
**Reason for removal**: Replaced by unified CDL sort interpreter

**Current code pattern**:
```tsx
function getSortValue(col: GridColumn, cell: GridCell | undefined): number | string | null {
  if (!cell) return null;
  
  switch (col.type) {
    case MetricType.Rep:
      return cell.metrics.value || 0;
    case MetricType.Text:
      return cell.metrics.text || '';
    case MetricType.Duration:
      return cell.metrics.seconds || 0;
    case MetricType.Effort:
      return effortSortOrder[cell.metrics.value] || 0;
    // ... 20+ more cases
  }
  
  // Also handle fixed columns
  if (col.id === FIXED_COLUMN_IDS.INDEX) {
    return row.index;
  }
  // ... more fixed column cases
}
```

**Replacement**: CDL-driven sort interpreter:
```ts
function extractSortValue(col: ColumnDef, value: unknown, context?: any): number | string | null {
  if (col.sort?.type === 'numeric') {
    return col.sort.extractor(value) || null;
  }
  if (col.sort?.type === 'text') {
    return col.sort.extractor(value) || null;
  }
  if (col.sort?.type === 'custom') {
    // Custom sort logic defined in ColumnDef
  }
  return null;
}
```

#### 2.3 Filter switch statements

**Location**: `src/components/review-grid/useGridData.ts` (estimated ~700–770)  
**Lines**: ~50–70  
**Reason for removal**: Replaced by unified CDL filter interpreter

**Current code pattern**:
```tsx
function getCellTextForColumn(col: GridColumn, cell: GridCell | undefined): string {
  if (!cell) return '';
  
  switch (col.type) {
    case MetricType.Rep:
      return cell.metrics.value?.toString() || '';
    case MetricType.Text:
      return cell.metrics.text || '';
    case MetricType.Duration:
      return formatSeconds(cell.metrics.seconds);
    case MetricType.Effort:
      return effortLabel[cell.metrics.value] || '';
    // ... more cases
  }
}

function matchesFilter(text: string, filterText: string): boolean {
  return text.toLowerCase().includes(filterText.toLowerCase());
}
```

**Replacement**: CDL-driven filter interpreter:
```ts
function extractFilterText(col: ColumnDef, value: unknown): string {
  if (col.filter?.extractor) {
    return col.filter.extractor(value) || '';
  }
  return '';
}

function matchesFilter(text: string, filterText: string, caseInsensitive?: boolean): boolean {
  if (caseInsensitive) {
    return text.toLowerCase().includes(filterText.toLowerCase());
  }
  return text.includes(filterText);
}
```

**Total useGridData.ts removal**: ~190 lines

---

### 3. useGraphData.ts

#### 3.1 getNumericValue() switch statement

**Location**: `src/components/review-grid/useGraphData.ts` (estimated ~400–520)  
**Lines**: ~80–120  
**Reason for removal**: Replaced by unified CDL graph interpreter

**Current code pattern**:
```tsx
function getNumericValue(col: GridColumn, cell: GridCell | undefined): number | undefined {
  if (!cell) return undefined;
  
  switch (col.type) {
    case MetricType.Rep:
      return cell.metrics.value;
    case MetricType.Duration:
      return cell.metrics.seconds;
    case MetricType.Distance:
      return cell.metrics.distance;
    case MetricType.Effort:
      // Map effort levels to numeric scale
      return effortScale[cell.metrics.value] || 0;
    // ... 15+ more cases
  }
  
  // Also handle derived columns
  if (col.id === FIXED_COLUMN_IDS.ELAPSED_TOTAL) {
    return /* cumulative elapsed */ 0;
  }
  if (col.id === 'volume') {
    return /* weight * reps */ 0;
  }
  // ... more derived cases
}
```

**Replacement**: CDL-driven graph interpreter:
```ts
function extractGraphValue(col: ColumnDef, value: unknown): number | undefined {
  if (col.graph?.extractor) {
    return col.graph.extractor(value);
  }
  return undefined;
}
```

**Total useGraphData.ts removal**: ~120 lines

---

### 4. gridPresets.ts

#### 4.1 ALL_FRAGMENT_COLUMNS constant

**Location**: `src/components/review-grid/gridPresets.ts` (estimated ~100–180)  
**Lines**: ~50–80  
**Reason for removal**: Replaced by CDL preset definitions

**Current code pattern**:
```ts
export const ALL_FRAGMENT_COLUMNS: GridColumn[] = [
  { id: 'rep', type: MetricType.Rep, label: 'Reps', sortable: true, ... },
  { id: 'text', type: MetricType.Text, label: 'Exercise', sortable: true, ... },
  { id: 'duration', type: MetricType.Duration, label: 'Duration', sortable: true, ... },
  { id: 'effort', type: MetricType.Effort, label: 'Effort', sortable: true, ... },
  // ... 30+ columns with no behavior defined
];
```

**Replacement**: CDL-based preset system:
```ts
export const CDL_PRESET_DEFAULT: ColumnSetPreset = {
  label: 'Default',
  visibleColumnIds: [
    '#',          // Index
    'blockKey',   // Block Key
    'rep',        // Reps
    'text',       // Exercise
    'effort',     // Effort
    'duration',   // Duration
    'elapsed',    // Elapsed
  ],
};

export const CDL_PRESET_DEBUG: ColumnSetPreset = {
  label: 'Debug',
  visibleColumnIds: [
    ...CDL_PRESET_DEFAULT.visibleColumnIds,
    'spans',      // Raw spans
    'outputType', // Output type
    'stackLevel', // Stack level
  ],
};
```

#### 4.2 buildFragmentColumns() function

**Location**: `src/components/review-grid/gridPresets.ts` (estimated ~200–300)  
**Lines**: ~70–100  
**Reason for removal**: Replaced by ColumnSet module

**Current code pattern**:
```tsx
export function buildFragmentColumns(
  allMetrics: MetricType[],
  debugMode: boolean,
  graphTags: Set<string>,
  userVisibilityOverrides: Record<string, boolean>,
): GridColumn[] {
  const result: GridColumn[] = [];
  
  // Start with fixed columns
  result.push(
    { id: FIXED_COLUMN_IDS.INDEX, label: '#', ... },
    { id: FIXED_COLUMN_IDS.BLOCK_KEY, label: 'Block Key', ... },
  );
  
  // Add fragment columns for metrics present in data
  for (const metric of allMetrics) {
    if (debugMode || userVisibilityOverrides[getColumnId(metric)] !== false) {
      result.push({
        id: getColumnId(metric),
        type: metric,
        label: getColumnLabel(metric),
        isGraphed: graphTags.has(getColumnId(metric)),
        visible: /* complex visibility logic */,
      });
    }
  }
  
  return result;
}
```

**Replacement**: ColumnSet module:
```ts
class ColumnSet {
  constructor(
    private definitions: ColumnDef[],
    private presets: Record<string, ColumnSetPreset>,
    private context: ColumnSetContext,
  ) {}

  get visibleColumns(): ColumnDef[] {
    const preset = this.presets[this.context.currentPreset];
    const visibility = this.applyVisibilityRules(preset.visibleColumnIds);
    return visibility;
  }

  private applyVisibilityRules(presetColumns: string[]): ColumnDef[] {
    // Apply data-driven visibility
    // Apply debug mode visibility
    // Apply user overrides
    // Return final visible columns
  }
}
```

**Total gridPresets.ts removal**: ~180 lines

---

### 5. GridHeader.tsx

#### 5.1 Column metadata building

**Location**: `src/components/review-grid/GridHeader.tsx` (estimated scattered)  
**Lines**: ~40 scattered  
**Reason for removal**: CDL provides column metadata

**Current pattern**: GridHeader builds temporary objects to track column state (sortable, filterable, graphable).

**Replacement**: CDL provides these directly:
```ts
interface ColumnDef {
  sort?: ColumnSortConfig;     // Sortable if defined
  filter?: ColumnFilterConfig;   // Filterable if defined
  graph?: ColumnGraphConfig;     // Graphable if defined
}
```

**Total GridHeader.tsx removal**: ~40 lines

---

## Dependency Graph

```
GridRow.tsx
  ├─ renderFixedCell()  → replaced by CDL renderer
  ├─ GridCell component → replaced by CDL renderer
  └─ FIXED_COLUMN_IDS checks → replaced by CDL source

useGridData.ts
  ├─ deriveVolumeCell()  → replaced by CDL derived source
  ├─ Sort switches       → replaced by CDL sort interpreter
  └─ Filter switches     → replaced by CDL filter interpreter

useGraphData.ts
  └─ getNumericValue() switch → replaced by CDL graph interpreter

gridPresets.ts
  ├─ ALL_FRAGMENT_COLUMNS  → replaced by CDL presets
  └─ buildFragmentColumns() → replaced by ColumnSet module

GridHeader.tsx
  └─ Column metadata → provided by CDL
```

## Removal Checklist

Use this checklist when performing Phase 4 (Cleanup & Migration):

### Phase 4a: Verify CDL Interpreter is Complete
- [ ] Unified cell renderer implemented and tested
- [ ] Unified sort interpreter implemented and tested
- [ ] Unified filter interpreter implemented and tested
- [ ] Unified graph interpreter implemented and tested
- [ ] All edge cases covered (null values, missing metrics, etc.)

### Phase 4b: Verify Columns are Migrated
- [ ] All GridColumn instances converted to ColumnDef
- [ ] All metric types have CDL definitions
- [ ] All fixed columns have CDL definitions
- [ ] All derived columns have CDL definitions
- [ ] Presets updated to use ColumnDef instead of GridColumn

### Phase 4c: Remove Dead Code
- [ ] Remove renderFixedCell() from GridRow.tsx
- [ ] Remove GridCell component (or keep as reference only)
- [ ] Remove deriveVolumeCell() from useGridData.ts
- [ ] Remove sort switch from useGridData.ts
- [ ] Remove filter switch from useGridData.ts
- [ ] Remove getNumericValue() from useGraphData.ts
- [ ] Remove ALL_FRAGMENT_COLUMNS from gridPresets.ts
- [ ] Remove buildFragmentColumns() from gridPresets.ts
- [ ] Clean up imports and unused constants

### Phase 4d: Verify No Regressions
- [ ] All tests pass
- [ ] All Storybook stories render correctly
- [ ] Manual smoke tests pass (sort, filter, graph all work)
- [ ] No console warnings
- [ ] TypeScript strict mode passes

## Code Statistics

| Metric | Value |
|--------|-------|
| Total lines to remove | ~790 |
| Total files affected | 5 |
| GridRow.tsx | ~310 lines |
| useGridData.ts | ~190 lines |
| useGraphData.ts | ~120 lines |
| gridPresets.ts | ~180 lines |
| GridHeader.tsx | ~40 lines |
| Estimated CDL interpreter size | ~200 lines |
| Net reduction | ~590 lines |

## Success Criteria

- [x] All dead code cataloged with file locations and line ranges
- [x] Replacement CDL pattern documented for each dead code item
- [x] Dependency graph shows safe removal order
- [x] Checklist provided for Phase 4 execution
- [ ] (Phase 2) Dead code actually removed as part of Phase 2–4 implementation
- [ ] (Phase 4) Zero references to removed code remain in codebase

## References

- **ADR**: [ADR-0011 — Column Definition Language](/WOD/issues/WOD-638#document-adr)
- **CDL Interfaces**: `src/components/review-grid/column-definition-language.ts`
- **CDL Examples**: `src/components/review-grid/column-definition-language.examples.ts`
- **Parent issue**: [WOD-637](/WOD/issues/WOD-637)
- **Phase 1 issue**: [WOD-638](/WOD/issues/WOD-638)

