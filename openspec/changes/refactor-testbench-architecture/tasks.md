# Implementation Tasks: Refactor RuntimeTestBench Architecture

## Overview

This task list implements the RuntimeTestBench refactoring in 5 phases, each with clear validation criteria. Tasks are ordered to minimize disruption and enable incremental validation.

**Estimated Total Time**: 24-33 hours

---

## Phase 1: Foundation (Non-Breaking) - 4-6 hours

### 1.1 Create Module-Level Services
- [ ] Create `src/runtime-test-bench/services/testbench-services.ts`
- [ ] Export `globalParser` as module-level MdTimerRuntime instance
- [ ] Export `globalCompiler` as IIFE with strategies registered
- [ ] Add JSDoc documentation explaining module-level pattern
- [ ] Add unit tests verifying singleton behavior

**Validation**: 
- Services export correctly and can be imported
- Multiple imports reference same instance
- `npm run test:unit` passes with new tests

### 1.2 Create Selector Class
- [ ] Create `src/runtime-test-bench/selectors/runtime-selectors.ts`
- [ ] Create `RuntimeSelectors` class
- [ ] Implement `selectBlocks(runtime: ScriptRuntime): RuntimeStackBlock[]` method
- [ ] Implement `selectMemory(runtime: ScriptRuntime): MemoryEntry[]` method
- [ ] Implement `selectStatus(runtime: ScriptRuntime): ExecutionStatus` method
- [ ] Add private helper methods: `extractMetrics`, `adaptMemoryEntry`
- [ ] Export singleton instance: `export const runtimeSelectors = new RuntimeSelectors()`
- [ ] Add JSDoc with performance characteristics (< 0.1ms target)

**Validation**:
- Selectors transform data identically to RuntimeAdapter output
- Unit tests verify correct data transformation
- Performance benchmarks show < 0.1ms execution time
- Single instance created at module load

### 1.3 Create useRuntimeExecution Hook
- [ ] Create `src/runtime-test-bench/config/constants.ts` with `EXECUTION_TICK_RATE_MS = 20`
- [ ] Create `src/runtime-test-bench/hooks/useRuntimeExecution.ts`
- [ ] Implement execution state: status, elapsedTime, refs
- [ ] Implement `executeStep` callback with error handling
- [ ] Implement `start()` function with fixed interval using `EXECUTION_TICK_RATE_MS`
- [ ] Implement `pause()` function with interval cleanup
- [ ] Implement `stop()` function with state reset
- [ ] Implement `reset()` function
- [ ] Implement `step()` function for single-step execution
- [ ] Add useEffect for automatic interval cleanup on unmount
- [ ] Add useEffect for elapsed time tracking
- [ ] Export hook with return type interface (no speed parameter)

**Validation**:
- Hook can be tested in isolation with renderHook
- All execution states work correctly (idle → running → paused → completed)
- Interval cleanup verified on unmount
- Fixed 20ms tick rate verified
- Unit tests cover all execution paths

### 1.4 Create Context Providers
- [ ] Create `src/runtime-test-bench/contexts/TestBenchContext.tsx`
- [ ] Define `HighlightingContextValue` interface
- [ ] Define `PreferencesContextValue` interface
- [ ] Create `HighlightingContext` with createContext
- [ ] Create `PreferencesContext` with createContext
- [ ] Implement `HighlightingProvider` component with useHighlighting hook
- [ ] Implement `PreferencesProvider` component with state management
- [ ] Implement `TestBenchProvider` wrapper combining both providers
- [ ] Export contexts and provider components

**Validation**:
- Contexts can be consumed with useContext hook
- Providers render children correctly
- Context updates trigger consumer re-renders
- Unit tests verify context behavior

### 1.5 Update Exports
- [ ] Export new services from `src/runtime-test-bench/index.ts` (if public API)
- [ ] Export selectors from index (if public API)
- [ ] Export hook from `src/runtime-test-bench/hooks/index.ts`
- [ ] Export contexts from index
- [ ] Update TypeScript types for new exports

**Validation**:
- All new modules export correctly
- No TypeScript errors introduced
- Build succeeds: `npx tsc --noEmit`

---

## Phase 2: Execution Hook Migration - 4-6 hours

### 2.1 Replace Execution Logic in RuntimeTestBench
- [ ] Import `useRuntimeExecution` hook in RuntimeTestBench.tsx
- [ ] Replace execution useState hooks with `const execution = useRuntimeExecution(runtime)`
- [ ] Update status references: `status` → `execution.status`
- [ ] Update elapsed time references: `elapsedTime` → `execution.elapsedTime`
- [ ] Remove `executionIntervalRef` and `executionStartTime` state
- [ ] Remove `parseTimerRef` if no longer needed (keep debounce logic)

**Validation**:
- RuntimeTestBench compiles without errors
- No console errors when rendering in Storybook
- Execution state accessible from hook

### 2.2 Update Handler Functions
- [ ] Remove `handleExecute` function
- [ ] Remove `handlePause` function
- [ ] Remove `handleResume` function
- [ ] Remove `handleStep` function
- [ ] Remove `handleStop` function
- [ ] Remove `handleReset` function
- [ ] Remove related useCallback hooks
- [ ] Remove execution-related useEffect hooks

**Validation**:
- ~200 lines removed from RuntimeTestBench.tsx
- No unused variables or imports
- Component LOC reduced significantly

### 2.3 Update ControlsPanel Integration
- [ ] Update ControlsPanel props to use hook return values
- [ ] Map `onPlay` to `execution.start()` (no speed parameter)
- [ ] Map `onPause` to `execution.pause()`
- [ ] Map `onStop` to `execution.stop()`
- [ ] Map `onReset` to `execution.reset()`
- [ ] Map `onStep` to `execution.step()`
- [ ] Pass `execution.status` and `execution.elapsedTime` as props
- [ ] **Remove speed control UI** (speed slider, onSpeedChange callback)
- [ ] **Remove speed state** from component

**Validation**:
- All control buttons function identically to before
- Play/pause toggle works correctly
- Step execution works
- Stop and reset work
- Speed control UI removed (no longer visible)

- [ ] Run Storybook: `npm run storybook`
- [ ] Test Default story execution controls
- [ ] Verify play, pause, stop, reset, step all work
- [ ] Verify execution runs at fixed 20ms tick rate
- [ ] Verify speed control UI is removed
- [ ] Check for console errors or warnings
- [ ] Run unit tests: `npm run test:unit`

**Validation**:
- All Storybook stories render correctly
- Execution controls work identically to before
- Fixed 20ms tick rate consistent
- Speed control UI no longer present
- No new test failures
- No console errors

---

## Phase 3: Selector Migration (Breaking) - 6-8 hours

### 3.1 Replace RuntimeAdapter with Selectors
- [ ] Import `runtimeSelectors` singleton in RuntimeTestBench.tsx
- [ ] Remove `const adapter = new RuntimeAdapter()` line
- [ ] Replace `adapter.createSnapshot(runtime)` calls with `runtimeSelectors.selectBlocks()`, `runtimeSelectors.selectMemory()` calls
- [ ] Update snapshot update logic to use selector methods directly
- [ ] Remove `updateSnapshot` function if no longer needed

**Validation**:
- No RuntimeAdapter instances created (verify in DevTools)
- RuntimeSelectors singleton used instead
- Component compiles without errors

### 3.2 Remove ExecutionSnapshot State
- [ ] Remove `const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null)`
- [ ] Create granular state slices if needed: `const [blocks, setBlocks] = useState<RuntimeStackBlock[]>([])`
- [ ] Or use derived values: `const blocks = runtime ? runtimeSelectors.selectBlocks(runtime) : []`
- [ ] Update all `snapshot?.` references to use direct state/selector methods
- [ ] Remove ExecutionSnapshot import

**Validation**:
- No ExecutionSnapshot references in RuntimeTestBench
- Blocks and memory data still accessible via selectors
- Component compiles

### 3.3 Update Panel Props - RuntimeStackPanel
- [ ] Update RuntimeStackPanel prop interface to remove snapshot-related props
- [ ] Change to: `{ blocks: RuntimeStackBlock[] }` (plus minimal other props)
- [ ] Remove `activeBlockIndex`, `highlightedBlockKey` (will use context later)
- [ ] Update RuntimeTestBench to pass only `blocks={blocks}` prop
- [ ] Verify panel still renders correctly

**Validation**:
- RuntimeStackPanel renders with simplified props
- Block data displays correctly
- No visual regressions

### 3.4 Update Panel Props - MemoryPanel
- [ ] Update MemoryPanel prop interface to remove snapshot-related props
- [ ] Change to: `{ entries: MemoryEntry[] }` (plus minimal other props)
- [ ] Remove `highlightedMemoryId` (will use context later)
- [ ] Update RuntimeTestBench to pass only `entries={memory}` prop
- [ ] Verify panel still renders correctly

**Validation**:
- MemoryPanel renders with simplified props
- Memory data displays correctly
- Filtering still works

### 3.5 Update Other Panels
- [ ] Review EditorPanel props - remove unused
- [ ] Review CompilationPanel props - remove unused
- [ ] Review StatusFooter props - remove unused
- [ ] Update all panel prop interfaces in interfaces.ts

**Validation**:
- All panels compile without errors
- All panels render in Storybook
- No visual changes

### 3.6 Remove Deprecated Code
- [ ] Delete `src/runtime-test-bench/adapters/RuntimeAdapter.ts` (301 lines)
- [ ] Delete `src/runtime-test-bench/hooks/useRuntimeSnapshot.ts` if deprecated
- [ ] Remove ExecutionSnapshot interface from interfaces.ts
- [ ] Remove IRuntimeAdapter interface
- [ ] Remove related imports across codebase
- [ ] Update exports in index files

**Validation**:
- Deleted files no longer imported anywhere
- No broken imports
- TypeScript compilation succeeds
- Bundle size reduced

### 3.7 Test Visualization Panels
- [ ] Run Storybook: `npm run storybook`
- [ ] Verify RuntimeStackPanel displays blocks correctly
- [ ] Verify MemoryPanel displays entries correctly
- [ ] Verify CompilationPanel shows parse results
- [ ] Compare visually to previous version (no regressions)
- [ ] Run unit tests: `npm run test:unit`

**Validation**:
- All panels show correct data
- Visual output identical to before refactoring
- No console errors
- Tests pass

---

## Phase 4: Context Migration (Breaking) - 6-8 hours

### 4.1 Wrap RuntimeTestBench in Providers
- [ ] Import TestBenchProvider in RuntimeTestBench.tsx
- [ ] Wrap panel components in `<TestBenchProvider>...</TestBenchProvider>`
- [ ] Verify provider renders children correctly
- [ ] Check React DevTools to confirm contexts available

**Validation**:
- Provider renders without errors
- Contexts visible in React DevTools
- Panels still render

### 4.2 Migrate RuntimeStackPanel to Context
- [ ] Import HighlightingContext and PreferencesContext in RuntimeStackPanel
- [ ] Add `const { highlightedBlock, setHighlight } = useContext(HighlightingContext)`
- [ ] Add `const { showMetrics, showIcons } = useContext(PreferencesContext)`
- [ ] Remove highlighting and preference props from interface
- [ ] Update hover handlers to call `setHighlight({ type: 'block', id: blockKey })`
- [ ] Update metric display to use context `showMetrics`

**Validation**:
- Panel accesses context successfully
- Highlighting works (hover triggers highlight)
- Preferences work (toggling showMetrics updates display)
- Props reduced significantly

### 4.3 Migrate MemoryPanel to Context
- [ ] Import contexts in MemoryPanel
- [ ] Add useContext hooks for highlighting and preferences
- [ ] Remove highlighting props from interface
- [ ] Update hover handlers to call context setHighlight
- [ ] Update preference-based rendering to use context

**Validation**:
- Panel accesses context successfully
- Memory entry highlighting works
- Preferences work

### 4.4 Migrate EditorPanel to Context
- [ ] Import HighlightingContext in EditorPanel (if needed)
- [ ] Add useContext for line highlighting
- [ ] Remove highlighting props
- [ ] Update line highlight rendering to use context

**Validation**:
- Line highlighting works via context
- Editor renders correctly

### 4.5 Remove Highlighting State from RuntimeTestBench
- [ ] Remove `useHighlighting` hook call in RuntimeTestBench
- [ ] Move useHighlighting logic to HighlightingProvider (if not already)
- [ ] Remove all highlighting prop passing
- [ ] Remove highlighting-related handler functions

**Validation**:
- No highlighting props passed from RuntimeTestBench
- Highlighting still works across panels
- Cross-panel coordination maintained

### 4.6 Remove Preference State from RuntimeTestBench
- [ ] Remove UI preference useState hooks (showMetrics, showIcons, etc.)
- [ ] Move preference state to PreferencesProvider (if not already)
- [ ] Remove preference prop passing
- [ ] Remove preference handler functions

**Validation**:
- No preference props passed from RuntimeTestBench
- Preferences still accessible to panels
- Preference toggles work

### 4.7 Update Panel Prop Interfaces
- [ ] Update RuntimeStackPanelProps to minimal interface
- [ ] Update MemoryPanelProps to minimal interface
- [ ] Update other panel props
- [ ] Remove unused props from interfaces.ts
- [ ] Document new prop interfaces with JSDoc

**Validation**:
- Panel interfaces have <5 props each (target)
- All TypeScript types correct
- No unused props

### 4.8 Test Cross-Panel Coordination
- [ ] Run Storybook: `npm run storybook`
- [ ] Test block highlighting - hover in stack panel
- [ ] Test memory highlighting - hover in memory panel
- [ ] Test line highlighting - verify editor updates
- [ ] Test preference toggles - verify all panels update
- [ ] Verify no prop drilling observable in React DevTools

**Validation**:
- Highlighting works across all panels
- Preferences work across all panels
- Context updates trigger correct re-renders
- No visual regressions

---

## Phase 5: Testing, Optimization & Documentation - 4-6 hours

### 5.1 Update Unit Tests
- [ ] Update RuntimeTestBench tests for new structure
- [ ] Add tests for useRuntimeExecution hook
- [ ] Add tests for selector functions
- [ ] Add tests for context providers
- [ ] Update panel tests to use context test helpers
- [ ] Ensure ≥90% coverage for new code

**Validation**:
- `npm run test:unit` passes with no new failures
- Coverage ≥90% for new hooks, selectors, contexts
- All existing tests updated

### 5.2 Update Integration Tests
- [ ] Review integration tests in `tests/` directory
- [ ] Update tests for new panel prop signatures
- [ ] Add context providers to test renders
- [ ] Update assertions for new state structure
- [ ] Run integration tests

**Validation**:
- Integration tests pass
- Tests accurately reflect new architecture

### 5.3 Update Storybook Stories
- [ ] Update RuntimeTestBench stories for new props
- [ ] Add stories demonstrating speed control
- [ ] Add stories demonstrating context usage
- [ ] Update play functions for new execution API
- [ ] Test all stories render correctly

**Validation**:
- `npm run storybook` shows all stories
- All stories render without errors
- Play functions execute correctly

### 5.4 Performance Benchmarking
- [ ] Run Chrome DevTools Profiler on existing implementation (baseline)
- [ ] Record: render count, object allocations, heap size
- [ ] Run profiler on new implementation
- [ ] Compare metrics - verify ≥50% render reduction, ≥65% allocation reduction
- [ ] Document results in performance report

**Validation**:
- Performance improvements meet targets
- No regressions in render performance

### 5.5 Build Validation
- [ ] Run `npm run build-storybook` (wait for completion ~30 seconds)
- [ ] Verify build succeeds without errors
- [ ] Check bundle size reduction (~15% target)
- [ ] Test built Storybook in browser
- [ ] Verify all features work in production build

**Validation**:
- Build succeeds
- Bundle size reduced
- Production build works identically

### 5.6 Type Checking
- [ ] Run `npx tsc --noEmit`
- [ ] Verify no NEW TypeScript errors introduced
- [ ] Accept existing 369 errors as baseline
- [ ] Fix any type errors in modified code
- [ ] Ensure all new code has proper types

**Validation**:
- TypeScript error count unchanged or reduced
- All new code properly typed

### 5.7 Update Documentation
- [ ] Update `docs/runtime-testbench-architecture-analysis.md` with "Post-Refactoring" section
- [ ] Document new architecture patterns (selectors, hooks, context)
- [ ] Add migration guide for future similar refactorings
- [ ] Update inline JSDoc comments in refactored code
- [ ] Add performance benchmark results to docs

**Validation**:
- Documentation accurate and complete
- Architecture analysis updated
- Migration guide helpful for future work

### 5.8 Final Validation Checklist
- [ ] All Storybook stories render correctly
- [ ] All 6 panels display correct data
- [ ] Highlighting coordination works
- [ ] Execution controls work (play, pause, step, reset)
- [ ] Speed control is functional
- [ ] Code editor parsing/compilation unchanged
- [ ] No visual regressions
- [ ] Component re-renders reduced ≥50%
- [ ] RuntimeAdapter instances = 0
- [ ] Main component <200 lines
- [ ] Unit tests pass (no new failures)
- [ ] Storybook tests pass
- [ ] TypeScript errors unchanged
- [ ] Build succeeds
- [ ] Performance targets met
- [ ] Documentation updated

---

## Rollback Plan

If critical issues are found during any phase:

1. **Identify problematic phase** - Determine which phase introduced the issue
2. **Revert phase commits** - Use git to revert commits for that phase only
3. **Restore previous implementation** - Verify previous code works
4. **Re-validate baseline** - Run tests and Storybook to confirm stability
5. **Analyze failure** - Determine root cause before retrying
6. **Document issue** - Add to proposal open questions or risks

---

## Dependencies Between Tasks

**Phase 1 → Phase 2**: Must complete foundation before using execution hook  
**Phase 2 → Phase 3**: Execute hook migration before removing adapter (independent paths)  
**Phase 3 → Phase 4**: Must simplify props before adding context dependencies  
**Phase 4 → Phase 5**: Must complete all refactoring before final testing  

**Parallelizable Work**:
- Phase 1.1, 1.2, 1.3, 1.4 can be done in parallel (separate files)
- Phase 3.3, 3.4, 3.5 can be done in parallel (separate panel files)
- Phase 4.2, 4.3, 4.4 can be done in parallel (separate panel files)

---

## Success Criteria Summary

**Functional**:
- ✅ All Storybook stories render identically
- ✅ All panels show correct data
- ✅ Highlighting and preferences work
- ✅ Execution controls work including speed

**Performance**:
- ✅ Re-renders reduced ≥50%
- ✅ Zero RuntimeAdapter allocations
- ✅ Object allocations reduced ≥65%
- ✅ Bundle size reduced ~15%

**Code Quality**:
- ✅ Main component <200 lines (from 550)
- ✅ No new TypeScript errors
- ✅ ≥90% test coverage for new code
- ✅ JSDoc on all public APIs

**Testing**:
- ✅ Unit tests pass
- ✅ Integration tests pass
- ✅ Storybook tests pass
- ✅ Manual testing checklist complete

**Documentation**:
- ✅ Architecture docs updated
- ✅ Migration guide created
- ✅ Inline comments explain decisions
- ✅ Performance results documented
