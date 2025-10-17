# Proposal: Refactor RuntimeTestBench Architecture

**Change ID**: `refactor-testbench-architecture`  
**Status**: Draft  
**Created**: 2025-10-16  
**Author**: AI Assistant

## Why

The RuntimeTestBench component has accumulated significant architectural debt that impacts performance, maintainability, and scalability:

1. **Performance Issues**: RuntimeAdapter recreated on every render (~60 times/second during execution), causing unnecessary object allocations
2. **State Management Complexity**: 13 distinct pieces of state in a 550+ line component with deep nesting and effect chains
3. **Redundant Abstractions**: Multiple transformation layers (RuntimeAdapter → ExecutionSnapshot → Panel Props) that duplicate data and add overhead
4. **Prop Drilling**: Highlighting state and callbacks passed through 6 layers, creating tight coupling
5. **Missing Features**: Speed control and step mode have no-op implementations despite UI presence

**Impact**: The current architecture creates a 65-70% overhead in runtime allocations and makes it difficult to add new debugging features or optimize rendering performance.

## What Changes

### Core Architectural Changes
- **Eliminate RuntimeAdapter layer** - Replace 301-line adapter class with lightweight selector functions
- **Remove ExecutionSnapshot intermediary** - Use direct state slices instead of aggregated snapshot object
- **Extract execution logic to custom hook** - Move ~200 lines of execution control to `useRuntimeExecution` hook
- **Move parser/compiler to module scope** - Convert component-scoped singletons to module-level services
- **Implement Context API** - Replace prop drilling with React Context for UI preferences and highlighting
- **Reduce component complexity** - Target <200 lines for main component (currently 550+)

### Capability Changes

This change modifies the following existing capabilities:

1. **`testbench-runtime-visualization`** - State management and rendering optimization
2. **`testbench-execution-controls`** - Execution lifecycle management extracted to hook
3. **`testbench-cross-panel-coordination`** - Context-based state sharing replaces prop drilling

### Breaking Changes
- **BREAKING**: `ExecutionSnapshot` interface removed - panels receive direct state slices
- **BREAKING**: `RuntimeAdapter` class removed - replaced with selector functions
- **BREAKING**: Panel prop interfaces simplified - some unused props removed

## Impact

### Affected Specs
- `testbench-runtime-visualization` - Modified state management patterns
- `testbench-execution-controls` - Extracted to reusable hook
- `testbench-cross-panel-coordination` - Context API implementation

### Affected Code
**Primary Files:**
- `src/runtime-test-bench/RuntimeTestBench.tsx` (550 → <200 lines target)
- `src/runtime-test-bench/adapters/RuntimeAdapter.ts` (301 lines - to be removed)
- `src/runtime-test-bench/types/interfaces.ts` (658 lines - significant reduction)
- `src/runtime-test-bench/hooks/useRuntimeSnapshot.ts` (to be deprecated)

**New Files:**
- `src/runtime-test-bench/hooks/useRuntimeExecution.ts` - Extracted execution logic
- `src/runtime-test-bench/contexts/TestBenchContext.tsx` - Shared state context
- `src/runtime-test-bench/selectors/runtime-selectors.ts` - Lightweight selector functions
- `src/runtime-test-bench/services/testbench-services.ts` - Module-level parser/compiler

**Affected Components:**
- All 6 panel components (simplified props)
- Storybook stories for RuntimeTestBench
- Integration tests

### Performance Impact
**Estimated improvements:**
- 65-70% reduction in runtime object allocations
- 50% reduction in component re-renders
- ~15% bundle size reduction (adapter + unused code removal)
- Elimination of 60 adapter recreations per second during execution

### Migration Impact
- Existing RuntimeTestBench usage in Storybook stories requires prop updates
- Integration tests may need updates for new state structure
- No impact on end-user workout execution (pure internal refactoring)

## Dependencies

**Depends On:**
- None - independent refactoring

**Blocks:**
- Future testbench features benefit from cleaner architecture
- Performance optimizations easier with granular state

**Related:**
- `fix-runtime-loop-execution` - Separate change fixing runtime engine (this fixes the visualization tool)

## Risks & Mitigations

**Risk 1: Breaking Storybook stories during refactoring**
- *Mitigation*: Update stories incrementally, validate after each phase
- *Mitigation*: Run `npm run storybook` continuously during development
- *Mitigation*: Maintain backward compatibility where possible via prop adapters

**Risk 2: Performance regressions if Context API overused**
- *Mitigation*: Use separate contexts for highlighting vs preferences
- *Mitigation*: Benchmark before/after with Chrome DevTools profiler
- *Mitigation*: Implement context selectors to prevent unnecessary re-renders

**Risk 3: Lost functionality during adapter removal**
- *Mitigation*: Create comprehensive test suite before refactoring
- *Mitigation*: Validate all panel visualizations match current behavior
- *Mitigation*: Keep adapter code available for reference during migration

**Risk 4: Increased complexity from hook extraction**
- *Mitigation*: Extensive JSDoc documentation on new hooks
- *Mitigation*: Unit tests for hooks in isolation
- *Mitigation*: Simple, focused API for `useRuntimeExecution`

## Success Criteria

**Functional Requirements:**
- [ ] All Storybook stories render identically to current implementation
- [ ] All 6 panels display correct data with new state management
- [ ] Highlighting coordination works across panels
- [ ] Execution controls (play, pause, step, reset) function correctly
- [ ] Code editor parsing and compilation unchanged
- [ ] No visual regressions in panel layouts

**Performance Requirements:**
- [ ] Component re-renders reduced by ≥50% (measured with React DevTools Profiler)
- [ ] Zero RuntimeAdapter instantiations during renders
- [ ] Parser/compiler initialized once per module load
- [ ] Object allocations reduced by ≥65% during execution
- [ ] Storybook build time unchanged or improved

**Code Quality Requirements:**
- [ ] Main component reduced to <200 lines
- [ ] Zero TypeScript errors introduced (beyond existing 369)
- [ ] All new hooks have ≥90% test coverage
- [ ] JSDoc documentation on all public APIs
- [ ] No ESLint warnings in new code

**Test Coverage:**
- [ ] Unit tests pass (no new failures beyond baseline)
- [ ] Storybook component tests pass (`npm run test:storybook`)
- [ ] Integration tests updated and passing
- [ ] Manual testing checklist completed for all panels

**Documentation:**
- [ ] Architecture analysis document updated with new patterns
- [ ] Migration guide created for similar component refactorings
- [ ] Inline code comments explain key architectural decisions
- [ ] Storybook docs updated to reflect new structure

## Timeline Estimate

- **Phase 1: Foundation** (4-6 hours) - Module-level services, execution hook
- **Phase 2: State Simplification** (8-10 hours) - Remove adapter/snapshot layers
- **Phase 3: Context Implementation** (6-8 hours) - Context API for cross-panel state
- **Phase 4: Testing & Validation** (4-6 hours) - Test suite updates, validation
- **Phase 5: Documentation** (2-3 hours) - Update docs and inline comments

**Total**: 24-33 hours for complete implementation and validation

## Open Questions

1. **Should we keep RuntimeAdapter as deprecated for one release cycle?**
   - **Recommendation**: No - it's purely internal, no external consumers
   - **Decision needed**: Confirm no external packages import RuntimeAdapter
   - ANSWER: NO, remove hard cut over and clean up the code.

2. **How granular should Context splits be (one vs multiple contexts)?**
   - **Recommendation**: Three contexts - HighlightingContext, PreferencesContext, ExecutionContext
   - **Decision needed**: Validate context split prevents re-render cascades

3. **Should selector functions be pure functions or class-based?**
   - **Recommendation**: Pure module-level functions for tree-shaking benefits
   - **Decision needed**: Confirm no stateful transformations needed
   - ANSWER: class based is good.

4. **Keep ExecutionSnapshot as deprecated type alias or remove entirely?**
   - **Recommendation**: Remove entirely - no external usage, internal only
   - **Decision needed**: Scan codebase for any external references
   - ANSWER: remove

5. **Should useRuntimeExecution support variable speed (10ms-1000ms intervals)?**
   - **Recommendation**: Yes - implement speed control that currently shows as no-op
   - **Decision needed**: Define speed scale (1-10?) and interval mapping
    - ANSWER: there is no variable updates, the ticks should happen every 20ms and have this avaliable somewher at a high level configuration , but this doesn't change, and there is no changes to execution speed to speed controller shoudl be removed.

## Related Documents

- **Analysis**: `docs/runtime-testbench-architecture-analysis.md` (source document for this proposal)
- **Runtime Refactoring**: `openspec/changes/fix-runtime-loop-execution/proposal.md` (separate runtime engine changes)
- **Runtime Interfaces**: `docs/runtime-interfaces-deep-dive.md`
- **Behavior Guide**: `docs/behavior-metric-emission-guide.md`

## Notes

This refactoring is **complementary** to the `fix-runtime-loop-execution` change:
- **fix-runtime-loop-execution**: Fixes the runtime execution engine (behavior system)
- **refactor-testbench-architecture**: Fixes the development tool that visualizes the runtime

Both changes improve the workout execution experience - one fixes the engine, the other fixes the debugging interface.
