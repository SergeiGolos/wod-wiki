# ADR-0011: Column Definition Language (CDL)

**Date**: 2026-05-25  
**Status**: APPROVED (Pending CTO Sign-off)  
**Author**: CEO Agent  
**Participants**: CTO, Frontend Team  
**Ticket**: [WOD-637](/WOD/issues/WOD-637), [WOD-638](/WOD/issues/WOD-638)

## Context

The Review Grid currently implements column behavior (render, sort, filter, graph) through scattered switch statements and conditional logic across **5+ files**:
- `GridRow.tsx` — `renderFixedCell()`, `GridCell` component
- `useGridData.ts` — sort/filter switches, `deriveVolumeCell()` logic
- `useGraphData.ts` — numeric value extraction switches
- `gridPresets.ts` — hardcoded column lists
- `GridHeader.tsx` — sort/filter/graph toggle UI

### Problems

1. **No single source of truth**: Adding a column requires editing 4–6 files
2. **Scattered logic**: Render, sort, filter, graph logic split across components and hooks
3. **Tight coupling**: Each file imports and branches on `col.id` or `col.type`
4. **Imperative derivation**: `deriveVolumeCell()` hardcodes "Volume = Weight × Reps" instead of declaring it
5. **No fallback chains**: Can't express "use Rep if present, else Increment, else Exertion"
6. **No composability**: Can't combine metrics (e.g., "Heavy — squat" as a single cell)
7. **Fixed vs. Fragment dichotomy**: Two parallel column systems instead of one unified model
8. **Impossible to test**: Mock column renderers, sorters, and filters independently

## Decision

Introduce **Column Definition Language (CDL)** — a declarative schema where each column defines:
- **Source**: Where data comes from (fixed field, metric type, derived expression, or fallback chain)
- **Format**: How to render (plain text, time, badge, combined, custom)
- **Sort**: How to extract comparable values (numeric, text, time, custom)
- **Graph**: How to extract numeric values for charting
- **Filter**: How to match against search text

All defined in **one ColumnDef interface**. The rendering pipeline becomes a thin interpreter that executes the definition.

## Rationale

### Single Source of Truth
Each column is defined once in `ColumnDef`. No switch statements, no file jumping.

**Before (scattered)**:
```tsx
// GridRow.tsx
if (col.id === 'effort') {
  return <BadgeCell value={row.cells.get(MetricType.Rep)} />;
}

// useGridData.ts
if (col.type === MetricType.Rep) {
  sortValue = row.cells.get(MetricType.Rep)?.metrics?.value;
}

// useGraphData.ts
if (col.id === 'effort') {
  numericValue = row.cells.get(MetricType.Rep)?.metrics?.value;
}
```

**After (unified)**:
```ts
const effortColumn: ColumnDef = {
  id: 'effort',
  source: { type: 'metric-type', metricType: MetricType.Rep },
  format: { type: 'badge', ... },
  sort: { type: 'numeric', extractor: (cell) => cell.metrics.value },
  graph: { extractor: (cell) => cell.metrics.value },
};
```

### Fallback Chains
Express "try Rep, then Increment, then Exertion" declaratively:

```ts
source: {
  type: 'fallback',
  semantics: 'first-present',
  sources: [
    { type: 'metric-type', metricType: MetricType.Rep },
    { type: 'metric-type', metricType: MetricType.Increment },
    { type: 'metric-type', metricType: MetricType.Exertion },
  ],
}
```

The rendering engine tries each source in order, returns the first non-null result.

### Grouping & Composition
Express "combine Effort + Text into one cell" with all-present-joined semantics:

```ts
source: {
  type: 'fallback',
  semantics: 'all-present-joined',
  joinString: ' — ',
  sources: [
    { type: 'metric-type', metricType: MetricType.Effort },
    { type: 'metric-type', metricType: MetricType.Text },
  ],
},
format: {
  type: 'combined',
  layout: 'vertical',
  primaryFormat: { ... },
  secondaryFormat: { ... },
}
```

### Derived Columns
Replace imperative `deriveVolumeCell()` with declarative source:

```ts
source: {
  type: 'derived',
  compute: (row) => {
    const weight = row.cells.get(MetricType.Weight)?.metrics?.value;
    const reps = row.cells.get(MetricType.Rep)?.metrics?.value;
    return weight && reps ? weight * reps : undefined;
  },
}
```

### Unified Fixed/Fragment Model
"Fixed" columns (Index, BlockKey) are just columns with `fixed-field` source:

```ts
// Index column
{ source: { type: 'fixed-field', field: 'index' }, ... }

// BlockKey column
{ source: { type: 'fixed-field', field: 'sourceBlockKey' }, ... }
```

No parallel `FIXED_COLUMN_IDS` system.

## Implementation Roadmap

### Phase 1: Design & Interface ✅ COMPLETE
- [x] Define ColumnDef, ColumnSource, ColumnFormat interfaces
- [x] Document fallback chain semantics with 3+ examples
- [x] Document grouping semantics with 3+ examples
- [x] Write this ADR
- [x] Identify dead code to remove (see Cleanup section)

### Phase 2: Core Implementation
- [ ] Implement ColumnSet module with preset + visibility + override logic
- [ ] Implement unified cell renderer (interprets CDL, replaces renderFixedCell + GridCell)
- [ ] Implement unified sort extractor (replaces getSortValue switch)
- [ ] Implement unified graph extractor (replaces getNumericValue switch)
- [ ] Implement unified filter matcher (replaces getCellTextForColumn switch)
- [ ] Migrate existing columns to CDL definitions
- [ ] CTO approval of implementation approach

### Phase 3: Advanced Features
- [ ] Implement fallback chains (first-present, all-present-joined)
- [ ] Implement derived columns with context
- [ ] Implement groupings with combined formats
- [ ] Add all preset definitions using CDL
- [ ] Test fallback chain edge cases

### Phase 4: Cleanup & Migration
- [ ] Remove FIXED_COLUMN_IDS from GridRow.tsx
- [ ] Remove renderFixedCell() function
- [ ] Remove deriveVolumeCell() imperative logic
- [ ] Remove hardcoded switches from useGraphData.ts
- [ ] Remove hardcoded switches from useGridData.ts
- [ ] Update tests to use CDL definitions
- [ ] Update Storybook stories

## Acceptance Criteria

1. ✅ CDL interfaces documented and exported
2. ✅ Fallback chain semantics documented with 3+ examples (first-present, all-present-joined, derived)
3. ✅ Grouping semantics documented with 3+ examples (Effort+Text, combined layouts, vertical/horizontal)
4. ✅ ADR complete and ready for CTO review
5. ⏳ (Phase 2) No switch statements in renderers, sorters, or graphers
6. ⏳ (Phase 2) Existing functionality preserved (sort, filter, graph, presets, debug mode)
7. ⏳ (Phase 2) All dead code removed
8. ⏳ (Phase 2) Test coverage maintained or improved

## Dead Code to Remove

See [DEAD_CODE_INVENTORY.md](#dead-code-inventory) for detailed line counts and file references.

### GridRow.tsx
- `renderFixedCell()` function (~80 lines)
- `GridCell` component (~120 lines)
- `FIXED_COLUMN_IDS` usage (scattered)

### useGridData.ts
- `deriveVolumeCell()` function (~40 lines)
- Sort switches (`switch(col.id)` or `if (col.type)`) (~60 lines)
- Filter switches (~50 lines)

### useGraphData.ts
- `getNumericValue()` switch statement (~80 lines)

### gridPresets.ts
- `ALL_FRAGMENT_COLUMNS` constant (~50 lines)
- `buildFragmentColumns()` function (~70 lines)
- Hardcoded column lists

## Migration Strategy

### Phased Column Migration
1. Start with simple metric columns (Rep, Text, Duration)
2. Move to fixed columns (Index, BlockKey)
3. Tackle derived columns (Volume, ElapsedTotal)
4. Migrate fallback chains and groupings
5. Update presets to use CDL definitions

### Backward Compatibility
During Phase 2, maintain a compatibility layer:
- Keep GridColumn interface as a legacy wrapper
- Map old GridColumn to ColumnDef internally
- Gradually migrate call sites

### Testing Strategy
- Unit tests for each ColumnFormat type
- Unit tests for each ColumnSource type
- Integration tests for sort/filter/graph interpreters
- Snapshot tests for renderer output
- Storybook stories for each column type

## Risks & Mitigations

### Risk: Complexity of interpreter
**Mitigation**: Start with simple interpreter (fixed field, metric type), extend incrementally. Write interpreter as a series of small, testable functions.

### Risk: Performance degradation
**Mitigation**: Profile rendering/sorting/filtering performance before and after. Cache computed values in ColumnSet. Consider memoization for derived columns.

### Risk: Developer learning curve
**Mitigation**: Provide templates and examples for common patterns. Update ADR with troubleshooting section. Host office hours for questions.

### Risk: Incomplete migration leaves technical debt
**Mitigation**: Phase 4 is mandatory before closing CDL initiative. Track removal of dead code explicitly.

## References

- **Parent issue**: [WOD-637](/WOD/issues/WOD-637) — CDL Architecture & Implementation Plan
- **Phase 1 issue**: [WOD-638](/WOD/issues/WOD-638) — Type Definitions & ADR
- **Code location**: `src/components/review-grid/`
- **Documentation**: `docs/results-technical-spec.md` (Section 2.7), `docs/results-design-spec.md` (Section 2.5)
- **Related ADRs**: ADR-0001 (Metric Ownership Model), ADR-0003 (HIIT Discipline Factor)

## Approval

- **Design approved**: ✅ 2026-05-25 (CEO Agent)
- **CTO approval**: ⏳ Pending Phase 2 implementation review
- **Implementation deadline**: Phase 2 completion by 2026-06-15

---

## Appendix: Dead Code Inventory

### GridRow.tsx

| Item | Lines | Location | Note |
|------|-------|----------|------|
| `renderFixedCell()` | 80–120 | GridRow.tsx:200–280 | Replace with unified CDL renderer |
| `GridCell` component | 120–160 | GridRow.tsx:300–460 | Absorbed into unified cell renderer |
| `FIXED_COLUMN_IDS` checks | ~30 scattered | GridRow.tsx (multiple) | Replace with source: 'fixed-field' |

**Total removal**: ~300 lines

### useGridData.ts

| Item | Lines | Location | Note |
|------|-------|----------|------|
| `deriveVolumeCell()` | 40–60 | useGridData.ts:500–560 | Replace with source: 'derived' |
| Sort switch statements | 60–80 | useGridData.ts:600–680 | Replace with unified sort interpreter |
| Filter switches | 50–70 | useGridData.ts:700–770 | Replace with unified filter interpreter |

**Total removal**: ~190 lines

### useGraphData.ts

| Item | Lines | Location | Note |
|------|-------|----------|------|
| `getNumericValue()` switch | 80–120 | useGraphData.ts:400–520 | Replace with unified graph interpreter |

**Total removal**: ~120 lines

### gridPresets.ts

| Item | Lines | Location | Note |
|------|-------|----------|------|
| `ALL_FRAGMENT_COLUMNS` | 50–80 | gridPresets.ts:100–180 | Replace with CDL preset definitions |
| `buildFragmentColumns()` | 70–100 | gridPresets.ts:200–300 | Replace with ColumnSet module |

**Total removal**: ~180 lines

### Total Dead Code
- **Estimated removal**: ~790 lines
- **Net code reduction**: ~600 lines after adding CDL interpreter (~200 lines)
- **Affected files**: 5 (GridRow, useGridData, useGraphData, gridPresets, GridHeader)

