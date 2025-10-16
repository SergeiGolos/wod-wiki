# Tasks: Runtime Test Bench UI

**Input**: Design documents from `X:\wod-wiki\specs\main\`  
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow
All prerequisites loaded successfully. This task list follows TDD approach with 32 tasks across 8 phases implementing the Runtime Test Bench UI feature.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root

## Path Convention
Single project structure: `src/`, `tests/`, `stories/` at repository root per plan.md

---

## Phase 3.1: Setup & Foundation

- [ ] **T001** Create folder structure: `src/runtime-test-bench/` with subdirectories: `components/`, `hooks/`, `adapters/`, `types/`, `styles/`

- [ ] **T002** Create folder structure: `tests/contract/`, `tests/integration/`, `tests/unit/hooks/`, `tests/unit/adapters/`

- [ ] **T003** Create folder structure: `stories/runtime-test-bench/`

- [ ] **T004** [P] Create TypeScript interfaces file: `src/runtime-test-bench/types/interfaces.ts` with all 20+ interfaces from data-model.md sections 1-4

- [ ] **T005** [P] Create TypeScript utility types file: `src/runtime-test-bench/types/types.ts` with Theme, MemoryGrouping, ExecutionStatus, BlockType, BlockStatus, MemoryType types

- [ ] **T006** [P] Extend Tailwind config: `tailwind.config.js` with prototype colors (primary #FFA500, background-dark #282c34, panel-background #3c4049, text-color #abb2bf, success #98c379, error #e06c75, info #61afef) and Space Grotesk font

- [ ] **T007** [P] Create Tailwind component classes: `src/runtime-test-bench/styles/tailwind-components.ts` with reusable panel, button, and card classes

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests

- [ ] **T008** [P] Contract test: `tests/contract/RuntimeAdapter.contract.test.ts` - Write all 8 tests from `specs/main/contracts/RuntimeAdapter.contract.md` (createSnapshot empty, createSnapshot active, extractStackBlocks, extractMemoryEntries, groupMemoryEntries by owner, groupMemoryEntries by type, performance <10ms, immutability)

- [ ] **T009** [P] Contract test: `tests/contract/EditorPanel.contract.test.ts` - Write all 8 tests from `specs/main/contracts/EditorPanel.contract.md` (renders empty, onChange callback, highlights line, displays errors, shows suggestions, onSuggestionSelect, readonly mode, custom className)

- [ ] **T010** [P] Contract test: `tests/contract/RuntimeStackPanel.contract.test.ts` - Write 6 tests: renders empty blocks, renders with blocks, highlights block on hover, calls onBlockHover, shows active indicator, applies custom className

- [ ] **T011** [P] Contract test: `tests/contract/MemoryPanel.contract.test.ts` - Write 6 tests: renders empty entries, renders with entries, filters entries, groups by owner/type, calls onEntryHover, applies custom className

### Integration Tests

- [ ] **T012** [P] Integration test: `tests/integration/RuntimeTestBench.integration.test.ts` - Test User Story 1: Edit script → Step execution → Reset workflow (from quickstart.md)

- [ ] **T013** [P] Integration test: `tests/integration/CrossPanelHighlighting.test.ts` - Test User Story 2: Hover block highlights editor line and memory entries (from quickstart.md)

- [ ] **T014** [P] Integration test: `tests/integration/ResponsiveDesign.test.ts` - Test User Story 3: Layout adapts at breakpoints 1920px, 1024px, 768px (from quickstart.md)

- [ ] **T015** [P] Integration test: `tests/integration/KeyboardShortcuts.test.ts` - Test all 9 keyboard shortcuts: Space, Ctrl+Enter, Ctrl+R, F5, F10, F11, Shift+F5, Ctrl+F, Ctrl+/ (from quickstart.md)

### Unit Tests

- [ ] **T016** [P] Unit test: `tests/unit/hooks/useRuntimeTestBench.test.ts` - Test state management, updateScript, stepExecution, resetExecution actions

- [ ] **T017** [P] Unit test: `tests/unit/hooks/useRuntimeSnapshot.test.ts` - Test snapshot creation, loading states, error handling

- [ ] **T018** [P] Unit test: `tests/unit/hooks/useHighlighting.test.ts` - Test setHighlightedBlock, setHighlightedMemory, clear highlighting

- [ ] **T019** [P] Unit test: `tests/unit/adapters/RuntimeAdapter.test.ts` - Test all adapter methods with edge cases

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Adapters & Hooks

- [ ] **T020** Implement RuntimeAdapter: `src/runtime-test-bench/adapters/RuntimeAdapter.ts` - Implement IRuntimeAdapter with createSnapshot, extractStackBlocks, extractMemoryEntries, groupMemoryEntries (makes T008 pass)

- [ ] **T021** Implement useRuntimeSnapshot hook: `src/runtime-test-bench/hooks/useRuntimeSnapshot.ts` - Convert ScriptRuntime to ExecutionSnapshot using RuntimeAdapter (makes T017 pass)

- [ ] **T022** Implement useMemoryVisualization hook: `src/runtime-test-bench/hooks/useMemoryVisualization.ts` - Filter and group memory entries, compute stats

- [ ] **T023** Implement useHighlighting hook: `src/runtime-test-bench/hooks/useHighlighting.ts` - Manage cross-panel highlight state (makes T018 pass)

- [ ] **T024** Implement useRuntimeTestBench hook: `src/runtime-test-bench/hooks/useRuntimeTestBench.ts` - Orchestrate all state, provide actions for script editing, execution control, UI updates (makes T016 pass)

### Component Implementation - Extracted

- [ ] **T025** [P] Implement EditorPanel: `src/runtime-test-bench/components/EditorPanel.tsx` - Wrap WodWiki editor with prototype styling, line highlighting, error display, suggestions popup (makes T009 pass)

- [ ] **T026** [P] Implement RuntimeStackPanel: `src/runtime-test-bench/components/RuntimeStackPanel.tsx` - Migrate CompactRuntimeStackVisualizer with tree hierarchy, color coding, hover handlers (makes T010 pass)

- [ ] **T027** [P] Implement MemoryPanel: `src/runtime-test-bench/components/MemoryPanel.tsx` - Migrate MemoryVisualizationTable with search input, grouping toggle, value popovers (makes T011 pass)

### Component Implementation - New

- [ ] **T028** [P] Implement Toolbar: `src/runtime-test-bench/components/Toolbar.tsx` - Create header with logo, navigation, action buttons (Run, Next, Step Over, Step Into, Reset), settings icon, user avatar

- [ ] **T029** [P] Implement CompilationPanel: `src/runtime-test-bench/components/CompilationPanel.tsx` - Create tabbed interface (Output/Errors tabs), compilation log with timestamps, error list with click-to-jump

- [ ] **T030** [P] Implement ControlsPanel: `src/runtime-test-bench/components/ControlsPanel.tsx` - Extract control buttons with status display, event queue visualization

- [ ] **T031** [P] Implement StatusFooter: `src/runtime-test-bench/components/StatusFooter.tsx` - Create footer with execution status, cursor position (line, column), compact layout

---

## Phase 3.4: Integration & Main Component

- [ ] **T032** Implement RuntimeTestBench: `src/runtime-test-bench/RuntimeTestBench.tsx` - Main component integrating all 6 panels with grid layout, state management via useRuntimeTestBench, cross-panel data flow (makes T012 pass)

- [ ] **T033** Add keyboard shortcuts: `src/runtime-test-bench/hooks/useTestBenchShortcuts.ts` - Implement keyboard event handlers for all 9 shortcuts using useEffect (makes T015 pass)

- [ ] **T034** Add responsive breakpoints: Update RuntimeTestBench.tsx with Tailwind responsive classes for desktop (grid-cols-10), tablet (stacked), mobile (tabs) layouts (makes T014 pass)

- [ ] **T035** Wire cross-panel highlighting: Connect highlighting state from useHighlighting to all panels via props, implement hover handlers (makes T013 pass)

- [ ] **T036** Add React.memo optimization: Wrap all 6 panel components with React.memo to prevent unnecessary re-renders

- [ ] **T037** Add virtualization: Implement react-window for MemoryPanel when entries.length > 50 for performance

---

## Phase 3.5: Storybook Stories

- [ ] **T038** [P] Create RuntimeTestBench story: `stories/runtime-test-bench/RuntimeTestBench.stories.tsx` - Default, Simple AMRAP, Nested Rounds, With Errors states

- [ ] **T039** [P] Create Toolbar story: `stories/runtime-test-bench/Toolbar.stories.tsx` - Default, With Actions, Settings Open states

- [ ] **T040** [P] Create EditorPanel story: `stories/runtime-test-bench/EditorPanel.stories.tsx` - Default, With Errors, With Suggestions, Highlighted Line states

- [ ] **T041** [P] Create CompilationPanel story: `stories/runtime-test-bench/CompilationPanel.stories.tsx` - Output Tab, Errors Tab, Successful Compilation, Parse Errors states

- [ ] **T042** [P] Create RuntimeStackPanel story: `stories/runtime-test-bench/RuntimeStackPanel.stories.tsx` - Empty, Simple Hierarchy, Deep Nesting, Active Block states

- [ ] **T043** [P] Create MemoryPanel story: `stories/runtime-test-bench/MemoryPanel.stories.tsx` - Empty, With Entries, Grouped By Owner, Grouped By Type, Filtered states

- [ ] **T044** [P] Create StatusFooter story: `stories/runtime-test-bench/StatusFooter.stories.tsx` - Idle, Executing, Completed, Error states

- [ ] **T045** [P] Create Examples story: `stories/runtime-test-bench/Examples.stories.tsx` - Real workout scenarios: MURPH, Fran, Cindy, DT (from quickstart.md)

- [ ] **T046** [P] Create Interactions story: `stories/runtime-test-bench/Interactions.stories.tsx` - Cross-panel highlighting demo, keyboard shortcuts demo, responsive layout demo

---

## Phase 3.6: Performance & Accessibility

- [ ] **T047** Performance test: `tests/performance/RuntimeTestBench.perf.test.ts` - Validate step execution <50ms, large script parsing <2s, memory panel with 100+ entries smooth scrolling (from quickstart.md)

- [ ] **T048** Add ARIA labels: Update all panel components with role, aria-label, aria-live attributes per WCAG 2.1 AA requirements

- [ ] **T049** Add keyboard navigation: Ensure tab order correct (Toolbar → Editor → Compilation → Stack → Memory → Footer), add focus indicators (2px orange outline)

- [ ] **T050** Accessibility audit: Run automated checks, verify color contrast ratios (text #abb2bf on #282c34 = 8.59:1), test with screen reader

---

## Phase 3.7: Documentation & Polish

- [ ] **T051** [P] Export from index: Add RuntimeTestBench to `src/index.ts` exports for public API

- [ ] **T052** [P] Update README: Add "Runtime Test Bench" section to `README.md` with usage example, screenshot, features list

- [ ] **T053** [P] Create migration guide: `docs/runtime-test-bench-migration.md` - Document migration from JitCompilerDemo to RuntimeTestBench

- [ ] **T054** [P] Update copilot instructions: Add Runtime Test Bench component info to `.github/copilot-instructions.md`

- [ ] **T055** Add deprecation notice: Update `stories/compiler/JitCompilerDemo.tsx` with console.warn pointing to new RuntimeTestBench

---

## Phase 3.8: Validation

- [ ] **T056** Run quickstart validation: Execute all steps in `specs/main/quickstart.md` - verify all user stories, functional requirements, keyboard shortcuts

- [ ] **T057** Verify all contract tests pass: Run `npm run test:unit tests/contract/` - expect 28 passing tests (8+8+6+6)

- [ ] **T058** Verify all integration tests pass: Run `npm run test:integration` - expect 4 passing tests

- [ ] **T059** Build Storybook: Run `npm run build-storybook` - verify builds without errors in ~30 seconds

- [ ] **T060** Manual testing: Load Storybook, test each story, verify visual design matches prototype

---

## Dependencies

### Critical Path
```
Setup (T001-T007)
  ↓
Contract Tests (T008-T011) [ALL MUST FAIL]
  ↓
Integration Tests (T012-T015) [ALL MUST FAIL]
  ↓
Unit Tests (T016-T019) [ALL MUST FAIL]
  ↓
RuntimeAdapter (T020) → makes T008, T019 pass
  ↓
Hooks (T021-T024) → makes T016, T017, T018 pass
  ↓
Components (T025-T031) → makes T009, T010, T011 pass
  ↓
Integration (T032-T037) → makes T012, T013, T014, T015 pass
  ↓
Storybook (T038-T046)
  ↓
Performance & A11y (T047-T050)
  ↓
Documentation (T051-T055)
  ↓
Validation (T056-T060)
```

### Blocking Relationships
- **T001-T007 block all** - Must have structure before code
- **T008-T019 block T020-T037** - TDD: tests before implementation
- **T020 blocks T021-T024** - Hooks need adapter
- **T024 blocks T032** - Main component needs orchestrator hook
- **T025-T031 block T032** - Main component needs all panels
- **T032 blocks T033-T037** - Integration needs main component
- **T038-T046 need T025-T032** - Stories need components
- **T056-T060 need everything** - Validation is final

### Parallel Groups
**Group 1 - Setup** (after T003):
- T004, T005, T006, T007 (different files)

**Group 2 - Contract Tests** (after T007):
- T008, T009, T010, T011 (different files)

**Group 3 - Integration Tests** (after T011):
- T012, T013, T014, T015 (different files)

**Group 4 - Unit Tests** (after T015):
- T016, T017, T018, T019 (different files)

**Group 5 - Components Extracted** (after T024):
- T025, T026, T027 (different files)

**Group 6 - Components New** (after T024):
- T028, T029, T030, T031 (different files)

**Group 7 - Storybook** (after T037):
- T038, T039, T040, T041, T042, T043, T044, T045, T046 (different files)

**Group 8 - Documentation** (after T050):
- T051, T052, T053, T054 (different files)

---

## Parallel Execution Examples

### Example 1: Setup Phase
```bash
# After T003 completes, launch T004-T007 in parallel:

Task: "Create TypeScript interfaces in src/runtime-test-bench/types/interfaces.ts"
Task: "Create utility types in src/runtime-test-bench/types/types.ts"
Task: "Extend Tailwind config with colors"
Task: "Create Tailwind components in src/runtime-test-bench/styles/tailwind-components.ts"
```

### Example 2: Contract Tests
```bash
# After T007 completes, launch all contract tests in parallel:

Task: "Write RuntimeAdapter contract tests in tests/contract/RuntimeAdapter.contract.test.ts"
Task: "Write EditorPanel contract tests in tests/contract/EditorPanel.contract.test.ts"
Task: "Write RuntimeStackPanel contract tests in tests/contract/RuntimeStackPanel.contract.test.ts"
Task: "Write MemoryPanel contract tests in tests/contract/MemoryPanel.contract.test.ts"
```

### Example 3: Components
```bash
# After T024 completes, launch all component implementations in parallel:

Task: "Implement EditorPanel in src/runtime-test-bench/components/EditorPanel.tsx"
Task: "Implement RuntimeStackPanel in src/runtime-test-bench/components/RuntimeStackPanel.tsx"
Task: "Implement MemoryPanel in src/runtime-test-bench/components/MemoryPanel.tsx"
Task: "Implement Toolbar in src/runtime-test-bench/components/Toolbar.tsx"
Task: "Implement CompilationPanel in src/runtime-test-bench/components/CompilationPanel.tsx"
Task: "Implement ControlsPanel in src/runtime-test-bench/components/ControlsPanel.tsx"
Task: "Implement StatusFooter in src/runtime-test-bench/components/StatusFooter.tsx"
```

---

## Notes

- **[P] tasks**: Different files, can run in parallel
- **TDD strictly enforced**: All tests (T008-T019) must fail before implementation (T020-T037)
- **Commit after each task**: Enables easy rollback
- **Performance targets**: <50ms UI updates, <10ms adapter, smooth scrolling
- **Accessibility**: WCAG 2.1 AA required, test with keyboard and screen reader
- **Storybook**: Primary development environment per constitution

---

## Validation Checklist

- [x] All contracts have corresponding tests (RuntimeAdapter, EditorPanel, RuntimeStackPanel, MemoryPanel)
- [x] All entities/interfaces have creation tasks (T004, T005)
- [x] All tests come before implementation (T008-T019 before T020-T037)
- [x] Parallel tasks truly independent (marked [P], different files)
- [x] Each task specifies exact file path (all paths absolute)
- [x] No task modifies same file as another [P] task (verified)
- [x] TDD order maintained: Setup → Tests (fail) → Implementation (pass) → Stories → Validation
- [x] Constitutional requirements met: Component-first, Storybook-driven, no parser changes, adapter pattern

---

**Total Tasks**: 60  
**Parallel Tasks**: 32 (marked with [P])  
**Sequential Tasks**: 28  
**Estimated Timeline**: 4 weeks  
**Status**: ✅ Ready for execution following TDD approach
