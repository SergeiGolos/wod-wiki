# RuntimeTestBench Architecture Refactoring - Proposal Summary

## ✅ Proposal Status: DRAFT - Ready for Review

**Change ID**: `refactor-testbench-architecture`  
**Created**: October 16, 2025  
**Validation**: ✅ Passed `openspec validate --strict`

---

## Quick Overview

This proposal refactors the RuntimeTestBench component to eliminate architectural debt, improve performance by 65-70%, and reduce component complexity from 550 lines to <200 lines.

### The Problem

- **Performance**: RuntimeAdapter recreated 60 times/second, causing massive object allocation overhead
- **Complexity**: 13 state hooks, 7 callbacks, 4 effects in one 550-line component
- **Redundancy**: 3 transformation layers (RuntimeAdapter → ExecutionSnapshot → Panel Props) duplicating data
- **Coupling**: Highlighting state prop-drilled through 6 layers
- **Missing Features**: Speed control shows UI but does nothing

### The Solution

1. **Eliminate RuntimeAdapter** → Use RuntimeSelectors class with singleton instance (remove 301 lines)
2. **Remove ExecutionSnapshot** → Use direct state slices (remove intermediate object)
3. **Extract execution hook** → Move 200 lines to `useRuntimeExecution` hook with fixed 20ms tick rate
4. **Module-level services** → Share parser/compiler across components
5. **Context API** → Replace prop drilling with React Context
6. **Remove speed control** → Fixed 20ms tick rate, eliminate variable speed UI

### Expected Impact

**Performance Improvements:**
- ✅ 65-70% reduction in object allocations
- ✅ 50% reduction in component re-renders
- ✅ ~15% bundle size reduction
- ✅ Zero adapter recreations (currently 60/second)

**Code Quality Improvements:**
- ✅ Main component: 550 → <200 lines (64% reduction)
- ✅ Panel props: 16+ → <5 per panel
- ✅ Reusable execution logic via hook
- ✅ Testable in isolation

---

## Document Structure

```
openspec/changes/refactor-testbench-architecture/
├── proposal.md           ← Why, what, impact, timeline
├── design.md            ← Architectural decisions, trade-offs, diagrams
├── tasks.md             ← 5 phases, 70+ checklist items, validation steps
├── specs/               ← Spec deltas for affected capabilities
│   ├── testbench-runtime-visualization/
│   │   └── spec.md      ← ADDED/MODIFIED/REMOVED requirements
│   ├── testbench-execution-controls/
│   │   └── spec.md      ← Execution hook requirements
│   └── testbench-cross-panel-coordination/
│       └── spec.md      ← Context API requirements
└── README.md            ← This file
```

---

## Key Architectural Changes

### 1. RuntimeSelectors Class Replaces RuntimeAdapter

**Before:**
```typescript
const adapter = new RuntimeAdapter(); // ❌ Recreated every render
const snapshot = adapter.createSnapshot(runtime);
const blocks = snapshot?.stack.blocks || [];
```

**After:**
```typescript
import { runtimeSelectors } from './selectors/runtime-selectors';
const blocks = runtime ? runtimeSelectors.selectBlocks(runtime) : []; // ✅ Singleton instance
```

### 2. Execution Hook with Fixed Tick Rate

**Before:**
```typescript
// 200 lines of handlers: handleExecute, handlePause, handleResume, etc.
// Duplicated cleanup in 5 locations
// Non-functional speed control UI
// Variable interval timing
```

**After:**
```typescript
import { EXECUTION_TICK_RATE_MS } from './config/constants';
const execution = useRuntimeExecution(runtime);

<ControlsPanel
  onPlay={execution.start}
  onPause={execution.pause}
  onStep={execution.step}
  // Speed control removed - fixed 20ms tick rate
/>
```

### 3. Context API Replaces Prop Drilling

**Before:**
```typescript
<RuntimeStackPanel
  highlightedBlockKey={highlightState.blockKey}
  onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
  showMetrics={showMetrics}
  showIcons={showIcons}
  // ... 12 more props
/>
```

**After:**
```typescript
<RuntimeStackPanel blocks={blocks} />

// Inside panel:
const { highlightedBlock, setHighlight } = useContext(HighlightingContext);
const { showMetrics } = useContext(PreferencesContext);
```

### 4. Module-Level Services

**Before:**
```typescript
// In component:
const parser = useMemo(() => new MdTimerRuntime(), []);
const compiler = useMemo(() => {
  const c = new JitCompiler();
  // ... register 6 strategies
  return c;
}, []);
```

**After:**
```typescript
// Module-level (testbench-services.ts):
export const globalParser = new MdTimerRuntime();
export const globalCompiler = (() => {
  const c = new JitCompiler();
  // ... register strategies once
  return c;
})();

// Also in runtime-selectors.ts:
export class RuntimeSelectors {
  selectBlocks(runtime: ScriptRuntime) { /* ... */ }
  selectMemory(runtime: ScriptRuntime) { /* ... */ }
}
export const runtimeSelectors = new RuntimeSelectors();

// In component:
import { globalParser, globalCompiler } from './services';
import { runtimeSelectors } from './selectors/runtime-selectors';
// Use directly - no hooks needed
```

---

## Implementation Phases

### Phase 1: Foundation (4-6 hours) - Non-Breaking
- Create module-level services
- Create selector functions
- Create useRuntimeExecution hook
- Create Context providers
- **Deliverable**: New infrastructure ready, existing code unchanged

### Phase 2: Execution Hook Migration (4-6 hours)
- Replace execution handlers with hook
- Implement speed control
- Remove ~200 lines from main component
- **Deliverable**: Execution controls simplified, speed control working

### Phase 3: Selector Migration (6-8 hours) - BREAKING
- Remove RuntimeAdapter (301 lines)
- Remove ExecutionSnapshot
- Simplify panel props
- **Deliverable**: Zero adapter allocations, simplified data flow

### Phase 4: Context Migration (6-8 hours) - BREAKING
- Wrap components in TestBenchProvider
- Migrate panels to useContext
- Remove prop drilling
- **Deliverable**: <5 props per panel, no prop drilling

### Phase 5: Testing & Documentation (4-6 hours)
- Update all tests
- Performance benchmarking
- Documentation updates
- **Deliverable**: Validated, documented, production-ready

**Total Estimate**: 24-33 hours

---

## Success Criteria

### ✅ Functional
- All Storybook stories render identically
- All panels show correct data
- Highlighting works across panels
- Execution controls work (including speed)

### ✅ Performance
- Re-renders reduced ≥50%
- RuntimeAdapter allocations = 0
- Object allocations reduced ≥65%
- Bundle size reduced ~15%

### ✅ Code Quality
- Main component <200 lines
- No new TypeScript errors
- ≥90% test coverage for new code
- JSDoc on all APIs

### ✅ Testing
- Unit tests pass
- Storybook tests pass
- Integration tests pass
- Manual validation complete

---

## Relationship to Other Changes

### Complementary to `fix-runtime-loop-execution`

- **fix-runtime-loop-execution**: Fixes the workout runtime execution engine (behavior system)
- **refactor-testbench-architecture**: Fixes the development tool that visualizes the runtime

Both changes are **independent** and can proceed in parallel. This refactoring makes the testbench a better tool for debugging the runtime fixes.

---

## Next Steps

### Before Implementation
1. **Review this proposal** - Read proposal.md, design.md, and spec deltas
2. **Ask clarifying questions** - See "Open Questions" in proposal.md
3. **Approve proposal** - Get sign-off before starting implementation
4. **Resolve open questions** - Make decisions on recommended options

### During Implementation
1. **Follow tasks.md sequentially** - Complete Phase 1 before Phase 2, etc.
2. **Validate after each phase** - Run tests and Storybook after each phase
3. **Update checklist** - Mark tasks complete as you finish them
4. **Track progress** - Update proposal status as phases complete

### After Implementation
1. **Archive change** - Use `openspec archive refactor-testbench-architecture`
2. **Update specs** - Merge spec deltas into main specs
3. **Document learnings** - Add post-implementation notes

---

## Questions or Issues?

- **View full proposal**: `npx openspec show refactor-testbench-architecture`
- **View spec deltas**: Check `specs/*/spec.md` files
- **Validate proposal**: `npx openspec validate refactor-testbench-architecture --strict`
- **Source analysis**: See `docs/runtime-testbench-architecture-analysis.md`

---

**Status**: ✅ Ready for review and approval  
**Last Updated**: October 16, 2025  
**Author**: AI Assistant based on architectural analysis
