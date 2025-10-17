# Decisions Summary: Refactor RuntimeTestBench Architecture

**Date**: October 17, 2025  
**Status**: Decisions Finalized

## Overview

This document captures the finalized decisions for all open questions in the `refactor-testbench-architecture` proposal, based on user input.

---

## Decision 1: RuntimeAdapter Removal Strategy

**Question**: Should we keep RuntimeAdapter as deprecated for one release cycle?

**Recommendation**: No - it's purely internal, no external consumers

**DECISION**: ✅ **No - Hard cutover and clean up the code**

**Rationale**: RuntimeAdapter is internal to the testbench with no external dependencies. A hard cutover simplifies the migration and eliminates maintenance burden.

**Impact**:
- Remove RuntimeAdapter.ts immediately (301 lines)
- Update all references in single PR
- No deprecation warnings needed
- Cleaner codebase faster

---

## Decision 2: Context Granularity

**Question**: How granular should Context splits be (one vs multiple contexts)?

**Recommendation**: Three contexts - HighlightingContext, PreferencesContext, ExecutionContext

**DECISION**: ⏳ **Accepted recommendation - implement three separate contexts**

**Rationale**: Separate contexts prevent re-render cascades when only one type of state changes (e.g., highlighting changes shouldn't re-render preference consumers).

**Implementation**:
- `HighlightingContext` - high-frequency updates (hover events)
- `PreferencesContext` - low-frequency updates (user toggles)
- `ExecutionContext` - execution state if needed (may be redundant with hook)

---

## Decision 3: Selector Function Architecture

**Question**: Should selector functions be pure functions or class-based?

**Recommendation**: Pure module-level functions for tree-shaking benefits

**DECISION**: ✅ **Class-based selectors**

**Rationale**: Class-based approach provides better organization and potential for future optimization (e.g., caching).

**Impact**:
- Create `RuntimeSelectors` class instead of individual functions
- Instantiate once at module level or as singleton
- Methods: `selectBlocks()`, `selectMemory()`, `selectStatus()`
- Potential for future memoization if needed

**Updated Implementation**:
```typescript
// runtime-selectors.ts
export class RuntimeSelectors {
  selectBlocks(runtime: ScriptRuntime): RuntimeStackBlock[] {
    return runtime.stack.blocks.map(block => ({
      key: block.key.toString(),
      type: block.type,
      label: block.label || block.type,
      depth: block.depth,
      state: block.state,
      metrics: this.extractMetrics(block)
    }));
  }

  selectMemory(runtime: ScriptRuntime): MemoryEntry[] {
    return runtime.memory.search({}).map(this.adaptMemoryEntry);
  }

  private extractMetrics(block: any) { /* ... */ }
  private adaptMemoryEntry(entry: any) { /* ... */ }
}

export const runtimeSelectors = new RuntimeSelectors();
```

---

## Decision 4: ExecutionSnapshot Handling

**Question**: Keep ExecutionSnapshot as deprecated type alias or remove entirely?

**Recommendation**: Remove entirely - no external usage, internal only

**DECISION**: ✅ **Remove entirely**

**Rationale**: No external usage, internal only. Clean removal is clearer than deprecated type.

**Impact**:
- Delete ExecutionSnapshot interface
- Remove all references
- Update panel props to receive direct data
- No migration period needed

---

## Decision 5: Execution Speed Control

**Question**: Should useRuntimeExecution support variable speed (10ms-1000ms intervals)?

**Recommendation**: Yes - implement speed control that currently shows as no-op

**DECISION**: ✅ **No variable speed - fixed 20ms tick rate, remove speed controller**

**Rationale**: 
- Execution ticks should happen at a fixed 20ms interval
- This should be a high-level configuration constant
- There is no need for runtime speed changes
- Speed controller UI should be removed

**Impact**:
- **Remove** speed control from ControlsPanel UI
- **Remove** speed state and handlers from RuntimeTestBench
- **Fix** execution interval to 20ms constant
- **Define** `EXECUTION_TICK_RATE = 20` as configuration constant
- **Simplify** useRuntimeExecution hook (no speed parameter)

**Updated Implementation**:
```typescript
// config/constants.ts
export const EXECUTION_TICK_RATE_MS = 20; // 50 ticks per second

// useRuntimeExecution.ts
const start = useCallback(() => {
  if (status === 'running') return;
  setStatus('running');
  startTimeRef.current = Date.now();
  
  executeStep();
  intervalRef.current = setInterval(executeStep, EXECUTION_TICK_RATE_MS);
}, [status, executeStep]);
```

---

## Related Decisions from fix-runtime-loop-execution

For context, here are related decisions from the runtime execution proposal:

### LazyCompilationBehavior
**DECISION**: ✅ **Fully remove** - not kept for any block types

### AMRAP Completion
**DECISION**: ✅ **Timer on parent creates pop events** - timer creates pop event for all children and existing ending timer

### Metric Inheritance
**DECISION**: ✅ **JIT has knowledge of stack node** - strategies can access public elements on current stack node

### Rep Scheme Validation
**DECISION**: ✅ **Ends when rounds complete** - reps instances drive rounds value, so fewer reps than rounds is unrealistic

### Backward Compatibility
**DECISION**: ✅ **Hard cutover with test fixes** - no gradual migration, fix tests to match new behavior

---

## Summary of Changes Required

### Documents to Update
1. ✅ **design.md** - Update selector architecture to class-based, remove speed control sections
2. ✅ **tasks.md** - Remove speed control tasks, update selector implementation tasks
3. ✅ **spec deltas** - Update execution-controls spec to remove speed requirements
4. ✅ **README.md** - Update summary to reflect decisions

### Code Changes
1. **Add**: `RuntimeSelectors` class with methods
2. **Remove**: Speed control UI and logic
3. **Add**: `EXECUTION_TICK_RATE_MS` constant
4. **Remove**: RuntimeAdapter immediately (no deprecation)
5. **Remove**: ExecutionSnapshot interface
6. **Add**: Three separate Context providers

---

## Validation

After implementing these decisions:

- [ ] Run `openspec validate refactor-testbench-architecture --strict`
- [ ] Verify all spec deltas reflect fixed 20ms tick rate
- [ ] Verify class-based selector approach documented
- [ ] Verify speed control removal documented
- [ ] Verify hard cutover approach documented

---

**Approved By**: User (via proposal annotations)  
**Date**: October 17, 2025  
**Next Step**: Update related documents and validate proposal
