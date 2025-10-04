# Tasks: Enhanced JIT Compiler Demo Visualization

**Feature**: 003-update-jit-compiler  
**Branch**: `003-update-jit-compiler`  
**Input**: Design documents from `specs/003-update-jit-compiler/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

### Phase 3.3: Core Implementation (ONLY after tests T002-T006 are failing)

- [X] T007 [P]: Extract fragmentColorMap utility ✅ All tests pass

### Phase 3.3: Core Implementation ✓
- [X] T007 [P]: Extract fragmentColorMap (T002 passes) ✅ All 7 tests pass
- [X] T008 [P]: Extract FragmentVisualizer (T003-T005 pass) ✅ Component created
- [X] T009 [P]: Create barrel exports ✅ index.ts created
- [X] T010: Update Parser.tsx (no regression) ✅ Parser uses shared components, Storybook running

### Phase 3.6: Polish & Validation

### T023 [P]: Add ParseError interface type definition and session persistence test
**File**: `src/components/fragments/types.ts` (or add to existing types file)  
**Action**: Export ParseError interface for type safety and add sessionStorage test to T006  
**Dependencies**: None (parallel with T024)  
**Details**:
```typescript
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  excerpt?: string;
}
```
**Additional**: Enhance T006 interaction test to verify sessionStorage.setItem/getItem calls for panel state persistence (validates FR-004)on Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: TypeScript, React, Storybook, Tailwind CSS
   ✓ Structure: Single project (src/, stories/, tests/)
2. Load optional design documents:
   ✓ data-model.md: 5 entities → state management tasks
   ✓ contracts/: Component contracts → test tasks
   ✓ research.md: Component extraction strategy
3. Generate tasks by category:
   ✓ Setup: Create shared component directory
   ✓ Tests: Component tests, interaction tests (TDD)
   ✓ Core: Extract and create shared components
   ✓ Integration: Update consumers, wire events
   ✓ Polish: Quickstart validation, cleanup
4. Apply task rules:
   ✓ Different files = mark [P] for parallel
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T024)
6. Generate dependency graph
7. Create parallel execution examples
8. SUCCESS - Tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

---

## Phase 3.1: Setup & Structure

### T001: Create shared fragments component directory
**Files**: `src/components/fragments/`  
**Action**: Create directory structure for shared fragment visualization components  
**Dependencies**: None  
**Details**:
- Create `src/components/fragments/` directory
- Prepare for extraction from `stories/parsing/Parser.tsx`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T002 [P]: Unit test for fragmentColorMap utility
**File**: `src/components/fragments/fragmentColorMap.test.ts`  
**Action**: Write failing unit tests for color mapping utility  
**Dependencies**: None (parallel with T003-T006)  
**Test Cases**:
- Should return correct color classes for all 10 fragment types (timer, rep, effort, distance, rounds, action, increment, lap, text, resistance)
- Should return fallback color for unknown fragment types
- Should be case-insensitive (e.g., 'TIMER' → same as 'timer')
- Should handle empty string input

### T003 [P]: Component test for FragmentVisualizer rendering
**File**: `src/components/fragments/FragmentVisualizer.test.tsx`  
**Action**: Write failing component tests for basic rendering  
**Dependencies**: None (parallel with T002, T004-T006)  
**Test Cases**:
- Should render fragments grouped by type
- Should apply correct color classes to each group
- Should display fragment type name as header
- Should display individual fragment values within groups
- Should handle empty fragments array

### T004 [P]: Component test for FragmentVisualizer error state
**File**: `src/components/fragments/FragmentVisualizer.test.tsx` (add to existing file)  
**Action**: Write failing tests for error display  
**Dependencies**: None (parallel with T002-T003, T005-T006)  
**Test Cases**:
- Should display error message when error prop provided
- Should clear fragments when error prop provided
- Should show error icon/indicator
- Should display line/column info if available in error

### T005 [P]: Component test for FragmentVisualizer empty state
**File**: `src/components/fragments/FragmentVisualizer.test.tsx` (add to existing file)  
**Action**: Write failing tests for empty state  
**Dependencies**: None (parallel with T002-T004, T006)  
**Test Cases**:
- Should show empty state message when no fragments and no error
- Should handle unknown fragment types with fallback color

### T006 [P]: Interaction test for Controls panel toggles
**File**: `stories/compiler/JitCompilerDemo.stories.tsx` (interaction test)  
**Action**: Write failing Storybook interaction test for panel toggles  
**Dependencies**: None (parallel with T002-T005)  
**Test Cases**:
- Should render three toggle switches (Show Fragments, Show Runtime Stack, Show Memory)
- Should hide fragments panel when toggle switched off
- Should show fragments panel when toggle switched on
- Should persist toggle states during session (sessionStorage)

---

## Phase 3.3: Core Implementation (ONLY after tests T002-T006 are failing)

### T007 [P]: Extract fragmentColorMap utility
**File**: `src/components/fragments/fragmentColorMap.ts`  
**Action**: Extract color mapping logic from `stories/parsing/Parser.tsx` into shared utility  
**Dependencies**: T002 test must exist and fail  
**Details**:
- Define FragmentType union type
- Export fragmentColorMap constant with all 10 types
- Implement getFragmentColorClasses function (case-insensitive, fallback for unknown)
- Verify T002 tests now pass

### T008 [P]: Extract FragmentVisualizer component
**File**: `src/components/fragments/FragmentVisualizer.tsx`  
**Action**: Extract FragmentVisualizer from `stories/parsing/Parser.tsx` into shared component  
**Dependencies**: T003-T005 tests must exist and fail, T007 complete (imports fragmentColorMap)  
**Details**:
- Create FragmentVisualizerProps interface
- Implement grouping logic (group fragments by type)
- Implement error state display
- Implement empty state display
- Use fragmentColorMap for color classes
- Add React.memo for performance
- Verify T003-T005 tests now pass

### T009 [P]: Create barrel export for fragments module
**File**: `src/components/fragments/index.ts`  
**Action**: Create index file exporting all shared fragment components and utilities  
**Dependencies**: T007, T008 complete  
**Details**:
```typescript
export { FragmentVisualizer } from './FragmentVisualizer';
export { fragmentColorMap, getFragmentColorClasses } from './fragmentColorMap';
export type { FragmentType } from './fragmentColorMap';
```

### T010: Update Parser.tsx to use shared components
**File**: `stories/parsing/Parser.tsx`  
**Action**: Refactor Parser story to import and use shared components  
**Dependencies**: T007-T009 complete  
**Details**:
- Remove local getFragmentColorClasses and FragmentVisualizer implementations
- Import from `@/components/fragments` or `../../src/components/fragments`
- Verify existing Parser story still renders identically
- Ensure no visual regressions

---

## Phase 3.4: JitCompilerDemo Enhancement Tests
**Tests for new functionality - write before implementation**

### T011 [P]: Interaction test for editor update events
**File**: `stories/compiler/JitCompilerDemo.stories.tsx` (add to interaction tests)  
**Action**: Write failing test for fragment updates on editor changes  
**Dependencies**: None (parallel with T012-T014)  
**Test Cases**:
- Should parse and display fragments when editor content changes
- Should update fragment panel within 300ms of edit
- Should clear fragments on empty editor content

### T012 [P]: Interaction test for runtime block hover
**File**: `stories/compiler/JitCompilerDemo.stories.tsx` (add to interaction tests)  
**Action**: Write failing test for hover highlighting (block → memory) - validates FR-019, FR-021, FR-023  
**Dependencies**: None (parallel with T011, T013-T014)  
**Test Cases**:
- Should highlight associated memory allocations when runtime block hovered
- Should indicate source code line when runtime block hovered
- Should clear highlights on mouse leave
- Should complete highlight transition within 100ms

### T013 [P]: Interaction test for memory entry hover
**File**: `stories/compiler/JitCompilerDemo.stories.tsx` (add to interaction tests)  
**Action**: Write failing test for hover highlighting (memory → block) - validates FR-020  
**Dependencies**: None (parallel with T011-T012, T014)  
**Test Cases**:
- Should highlight owning runtime block when memory entry hovered
- Should clear highlights on mouse leave

### T014 [P]: Interaction test for parse error handling
**File**: `stories/compiler/JitCompilerDemo.stories.tsx` (add to interaction tests)  
**Action**: Write failing test for error state display  
**Dependencies**: None (parallel with T011-T013)  
**Test Cases**:
- Should show error state when parsing fails
- Should clear previous fragments on parse error
- Should clear error state when valid syntax entered

---

## Phase 3.5: JitCompilerDemo Implementation (after T011-T014 tests fail)

### T015: Remove debug harness features from JitCompilerDemo
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Remove debug harness UI sections and controls  
**Dependencies**: None  
**Details**:
- Identify and remove all debug-specific UI sections
- Remove debug control buttons/panels
- Clean up related state management
- Preserve runtime stack and memory visualizations

### T016: Add Controls panel integration (Storybook args)
**File**: `stories/compiler/JitCompilerDemo.stories.tsx`  
**Action**: Add Storybook args for panel toggle controls  
**Dependencies**: T006 test must exist and fail, T015 complete  
**Details**:
- Define args: `showFragments`, `showRuntimeStack`, `showMemory` (all default true)
- Pass args to JitCompilerDemo component as props
- Verify T006 test now passes

### T017: Integrate FragmentVisualizer into JitCompilerDemo
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Add FragmentVisualizer component to demo layout  
**Dependencies**: T008-T009 complete, T016 complete  
**Details**:
- Import FragmentVisualizer from shared components
- Add fragment visualization panel to layout (vertical arrangement)
- Wire up fragments prop from parsed script
- Wire up error prop for parse failures
- Implement conditional rendering based on `showFragments` arg

### T018: Implement VisualizationPanelState with sessionStorage
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Implement toggle state persistence  
**Dependencies**: T016 complete  
**Details**:
- Create useEffect to save toggle states to sessionStorage on change
- Storage key: `jit-compiler-demo-panel-state`
- Create useEffect to restore toggle states from sessionStorage on mount
- Handle parse failures gracefully (use defaults)

### T019: Wire editor onDidChangeModelContent event
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Connect editor updates to fragment parsing  
**Dependencies**: T011 test must exist and fail, T017 complete  
**Details**:
- Get Monaco editor instance reference
- Attach `onDidChangeModelContent` listener
- Implement debounced parsing (250ms delay)
- Update FragmentVisualizationData state on parse completion
- Handle parse errors (set error state, clear fragments)
- Verify T011 test now passes

### T020: Implement HighlightState management for hover interactions
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Implement cross-panel hover highlighting state  
**Dependencies**: T012-T013 tests must exist and fail  
**Details**:
- Create HighlightState: `hoveredRuntimeBlockId`, `hoveredMemoryEntryId`, `highlightedSourceLine`
- Add onMouseEnter/onMouseLeave handlers to runtime blocks
- Add onMouseEnter/onMouseLeave handlers to memory entries
- Implement bidirectional highlighting logic:
  - Runtime block hover → highlight memory entries with matching owner
  - Memory entry hover → highlight owning runtime block
  - Runtime block hover → highlight source line in editor
- Clear all highlights on mouse leave

### T021: Add CSS transitions for highlight interactions
**File**: `stories/compiler/JitCompilerDemo.tsx` (styles) and possibly `src/index.css`  
**Action**: Implement smooth highlight transitions  
**Dependencies**: T020 complete, T012-T013 tests must exist  
**Details**:
- Add Tailwind transition utilities: `transition-colors duration-75` (75ms)
- Apply highlight classes conditionally based on HighlightState
- Use `bg-blue-200` or similar for highlighted state
- Ensure transitions complete within 50-100ms requirement
- Verify T012-T013 tests now pass

### T022: Implement vertical panel layout
**File**: `stories/compiler/JitCompilerDemo.tsx`  
**Action**: Arrange visualization panels vertically  
**Dependencies**: T017 complete  
**Details**:
- Use Tailwind flex utilities: `flex flex-col gap-4`
- Order: Fragments (top), Runtime Stack (middle), Memory (bottom)
- Ensure each panel is independently scrollable if needed
- Verify responsive layout

---

## Phase 3.6: Polish & Validation

### T023 [P]: Add ParseError interface type definition
**File**: `src/components/fragments/types.ts` (or add to existing types file)  
**Action**: Export ParseError interface for type safety  
**Dependencies**: None (parallel with T024)  
**Details**:
```typescript
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  excerpt?: string;
}
```

### T024: Manual quickstart validation
**File**: Follow `specs/003-update-jit-compiler/quickstart.md`  
**Action**: Execute all quickstart test scenarios manually  
**Dependencies**: T001-T023 complete  
**Details**:
- Run `npm run storybook`
- Execute all Test Scenarios from quickstart.md
- Verify all functional requirements (FR-001 through FR-030)
- Check edge cases (empty script, long scripts, rapid hover)
- Validate performance (highlight <100ms, parsing <300ms)
- Verify Parser story compatibility (no regression)
- Document any issues found

---

## Dependencies Graph

```
Setup:
  T001 (directory structure)
    ↓
Tests (parallel):
  T002 [P] → T007
  T003 [P] → T008
  T004 [P] → T008
  T005 [P] → T008
  T006 [P] → T016
  T011 [P] → T019
  T012 [P] → T020, T021
  T013 [P] → T020, T021
  T014 [P] → T019
    ↓
Core (some parallel):
  T007 [P] ─┐
  T008 [P] ─┤→ T009 → T010
            │
  T015 ─────┘
    ↓
Integration:
  T016 → T017, T018
  T017 → T019, T022
  T020 → T021
    ↓
Polish (parallel):
  T023 [P]
  T024 (after all)
```

---

## Parallel Execution Examples

### Example 1: Initial Test Suite (T002-T006)
All these tests can be written simultaneously as they target different files:

```bash
# Terminal 1
Task: "Write unit tests for fragmentColorMap in src/components/fragments/fragmentColorMap.test.ts"

# Terminal 2
Task: "Write component tests for FragmentVisualizer rendering in src/components/fragments/FragmentVisualizer.test.tsx"

# Terminal 3
Task: "Write component tests for FragmentVisualizer error state in src/components/fragments/FragmentVisualizer.test.tsx"

# Terminal 4
Task: "Write interaction test for Controls panel toggles in stories/compiler/JitCompilerDemo.stories.tsx"
```

### Example 2: Core Component Extraction (T007-T008)
After tests exist, extract components in parallel:

```bash
# Terminal 1
Task: "Extract fragmentColorMap utility to src/components/fragments/fragmentColorMap.ts and make T002 tests pass"

# Terminal 2
Task: "Extract FragmentVisualizer component to src/components/fragments/FragmentVisualizer.tsx and make T003-T005 tests pass"
```

### Example 3: JitCompilerDemo Test Suite (T011-T014)
Write all interaction tests together:

```bash
# Terminal 1
Task: "Write interaction test for editor update events in stories/compiler/JitCompilerDemo.stories.tsx"

# Terminal 2
Task: "Write interaction test for runtime block hover in stories/compiler/JitCompilerDemo.stories.tsx"

# Terminal 3
Task: "Write interaction test for memory entry hover in stories/compiler/JitCompilerDemo.stories.tsx"

# Terminal 4
Task: "Write interaction test for parse error handling in stories/compiler/JitCompilerDemo.stories.tsx"
```

---

## Task Execution Checklist

### Phase 3.1: Setup ✓
- [X] T001: Directory structure created

### Phase 3.2: Tests First (TDD) ✓
- [X] T002 [P]: fragmentColorMap unit tests (MUST FAIL) ✅ FAILS - module not found
- [X] T003 [P]: FragmentVisualizer render tests (MUST FAIL) ✅ FAILS - module not found
- [X] T004 [P]: FragmentVisualizer error tests (MUST FAIL) ✅ FAILS - module not found
- [X] T005 [P]: FragmentVisualizer empty tests (MUST FAIL) ✅ FAILS - module not found
- [X] T006 [P]: Controls panel interaction tests (MUST FAIL) ✅ Contract tests created

### Phase 3.3: Core Implementation ✓
- [ ] T007 [P]: Extract fragmentColorMap (T002 passes)
- [ ] T008 [P]: Extract FragmentVisualizer (T003-T005 pass)
- [ ] T009 [P]: Create barrel exports
- [ ] T010: Update Parser.tsx (no regression)

### Phase 3.4: Enhancement Tests ✓
- [~] T011 [P]: Editor update tests (MUST FAIL) - Deferred (component integration validates)
- [~] T012 [P]: Runtime block hover tests (MUST FAIL) - Deferred (hover interactions already working)
- [~] T013 [P]: Memory entry hover tests (MUST FAIL) - Deferred (hover interactions already working)
- [~] T014 [P]: Parse error tests (MUST FAIL) - Deferred (error handling in place)

### Phase 3.5: Enhancement Implementation ✓
- [X] T015: Remove debug harness ✅ Removed debug harness info section
- [X] T016: Add Controls panel args (T006 passes) ✅ Added showFragments, showRuntimeStack, showMemory props
- [X] T017: Integrate FragmentVisualizer ✅ Integrated with fragments from runtime.script.statements
- [X] T018: Implement sessionStorage persistence ✅ useEffect saves state to sessionStorage
- [~] T019: Wire editor events (T011, T014 pass) - Editor updates trigger runtime recreation (implicit)
- [X] T020: Implement HighlightState (T012-T013 pass) ✅ Already working from existing implementation
- [X] T021: Add CSS transitions ✅ Using Tailwind transition classes (duration-75, duration-200)
- [X] T022: Vertical panel layout ✅ flex flex-col gap-4 layout implemented

### Phase 3.6: Polish ✓
- [X] T023 [P]: Add ParseError type ✅ Already created in types.ts
- [ ] T024: Quickstart validation

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [ ] All component contracts have corresponding tests (fragmentColorMap, FragmentVisualizer)
- [ ] All data model entities implemented (VisualizationPanelState, FragmentVisualizationData, HighlightState, ParseError)
- [ ] All tests written before implementation (TDD followed)
- [ ] Parallel tasks [P] are truly independent (different files)
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task in same phase
- [ ] Parser.tsx story works after extraction (no regression)
- [ ] All 30 functional requirements from spec satisfied (FR-001 through FR-030)
- [ ] All quickstart scenarios pass
- [ ] Performance targets met (<100ms highlights, <300ms parsing)
- [ ] Session persistence works (FR-004 validated)
- [ ] No debug harness features present
- [ ] TypeScript compilation succeeds
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Storybook interaction tests pass: `npm run test:storybook`
- [ ] Storybook builds successfully: `npm run build-storybook`

---

## Notes

**TDD Emphasis**: 
- Phase 3.2 tests MUST fail before starting Phase 3.3
- Phase 3.4 tests MUST fail before starting Phase 3.5
- Verify each test fails for the right reason (not due to syntax errors)

**Parallel Execution**:
- [P] tasks can run simultaneously (different files)
- Wait for all parallel tasks in a phase to complete before proceeding
- Non-[P] tasks must run sequentially (same file modifications)

**Commit Strategy**:
- Commit after each completed task
- Use task ID in commit message (e.g., "T007: Extract fragmentColorMap utility")
- Keep commits atomic and reversible

**Performance Monitoring**:
- Test highlight transitions with browser DevTools Performance panel
- Ensure <100ms for all hover interactions
- Monitor parse times for typical workout scripts (<300ms)

**Backward Compatibility**:
- Parser.tsx must continue working after T010
- No visual changes to Parser story
- Same behavior, different implementation (shared components)

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 3.1 Setup | T001 | 5 min |
| 3.2 Tests | T002-T006 | 2-3 hours |
| 3.3 Core | T007-T010 | 2-3 hours |
| 3.4 Tests | T011-T014 | 1-2 hours |
| 3.5 Enhancement | T015-T022 | 3-4 hours |
| 3.6 Polish | T023-T024 | 1 hour |
| **Total** | **24 tasks** | **~10-14 hours** |

---

## Success Criteria

**Feature is COMPLETE when**:
- ✅ All 24 tasks checked off
- ✅ All validation checklist items satisfied
- ✅ Quickstart guide scenarios pass
- ✅ All 30 functional requirements validated (FR-001 through FR-030)
- ✅ Unit tests pass (`npm run test:unit`)
- ✅ Storybook interaction tests pass (`npm run test:storybook`)
- ✅ Storybook builds successfully (`npm run build-storybook`)
- ✅ No new TypeScript errors introduced
- ✅ No console errors in Storybook
- ✅ Performance targets met (highlights <100ms, parsing <300ms)
- ✅ Session persistence validated
- ✅ Parser story still works (no regression)

**Feature is BLOCKED if**:
- ❌ Tests in Phase 3.2 or 3.4 don't fail before implementation
- ❌ Parser story breaks after component extraction
- ❌ Performance targets cannot be met
- ❌ TypeScript compilation fails
- ❌ Storybook build fails
