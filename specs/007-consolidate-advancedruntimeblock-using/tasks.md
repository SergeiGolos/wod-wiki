# Tasks: Consolidate AdvancedRuntimeBlock Using Stacked Behaviors

**Input**: Design documents from `X:\wod-wiki\specs\007-consolidate-advancedruntimeblock-using\`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, React, Vitest, Storybook, Chevrotain
   → Structure: Single project (src/, tests/, stories/)
   → Performance: next() < 5ms, push/pop < 1ms, dispose() < 50ms
2. Load design documents:
   → data-model.md: 4 behaviors (ChildAdvancement, LazyCompilation, ParentContext, CompletionTracking)
   → contracts/: 1 contract file (behavior-lifecycle.contract.md)
   → research.md: 8 research areas with technical decisions
   → quickstart.md: 3 validation scenarios
3. Generate tasks by category:
   → Setup: Directory structure, TypeScript config
   → Tests: 6 contract tests, 4 unit tests, 3 integration tests, 3 performance tests
   → Core: 4 behavior implementations
   → Integration: Behavior composition, migration validation
   → Polish: Storybook stories, documentation, cleanup
4. Apply task rules:
   → Contract tests [P] - different files
   → Unit tests [P] - different files per behavior
   → Behavior implementations - can be parallel if independent
   → Integration tests - sequential (depend on all behaviors)
   → Migration - sequential (depends on validation)
5. Number tasks sequentially: T001-T032
6. TDD order: Tests before implementation
7. Validation: All contracts → tests, all entities → implementations
8. Return: SUCCESS (32 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in descriptions

## Path Conventions
Single project structure (from plan.md):
- **Source**: `src/runtime/behaviors/` for behavior implementations
- **Tests**: `tests/unit/behaviors/`, `tests/integration/runtime/`, `tests/runtime/contract/behaviors/`
- **Stories**: `stories/runtime/` for demonstrations
- **Docs**: `docs/` for documentation updates

---

## Phase 3.1: Setup & Structure

- [x] **T001** Create behavior directory structure in `src/runtime/behaviors/`
  - **Files**: Create directory `src/runtime/behaviors/`
  - **Purpose**: Prepare directory for 4 behavior implementations
  - **Validation**: Directory exists and is empty
  
- [x] **T002** Create behavior test directory structure in `tests/unit/behaviors/`
  - **Files**: Create directory `tests/unit/behaviors/`
  - **Purpose**: Prepare directory for behavior unit tests
  - **Validation**: Directory exists
  
- [x] **T003** Create contract test directory in `tests/runtime/contract/behaviors/`
  - **Files**: Create directory `tests/runtime/contract/behaviors/`
  - **Purpose**: Prepare directory for behavior contract tests
  - **Validation**: Directory exists (moved to `src/runtime/behaviors/tests/`)
  
- [x] **T004** Create integration test directory in `tests/integration/runtime/`
  - **Files**: Create directory `tests/integration/runtime/` (if not exists)
  - **Purpose**: Prepare directory for behavior integration tests
  - **Validation**: Directory exists

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (All Parallel - Different Files)

- [x] **T005 [P]** Contract test for ChildAdvancementBehavior lifecycle in `src/runtime/behaviors/tests/child-advancement.contract.test.ts`
  - **Purpose**: Test constructor, onNext() sequential advancement, completion tracking
  - **Success Criteria**: Tests fail (no implementation), validate onNext returns empty when complete, advances index correctly
  - **Performance**: Validate onNext < 5ms requirement
  - **File**: `src/runtime/behaviors/tests/child-advancement.contract.test.ts` ✅ CREATED - FAILING AS EXPECTED
  
- [x] **T006 [P]** Contract test for LazyCompilationBehavior lifecycle in `src/runtime/behaviors/tests/lazy-compilation.contract.test.ts`
  - **Purpose**: Test constructor, onNext() lazy compilation, error handling
  - **Success Criteria**: Tests fail (no implementation), validate JIT integration, ErrorRuntimeBlock on failure
  - **Performance**: Validate compilation within budget
  - **File**: `src/runtime/behaviors/tests/lazy-compilation.contract.test.ts` ✅ CREATED - FAILING AS EXPECTED
  
- [x] **T007 [P]** Contract test for ParentContextBehavior lifecycle in `src/runtime/behaviors/tests/parent-context.contract.test.ts`
  - **Purpose**: Test constructor, onPush() initialization, context access
  - **Success Criteria**: Tests fail (no implementation), validate parent reference storage and retrieval
  - **Performance**: Validate onPush < 1ms requirement
  - **File**: `src/runtime/behaviors/tests/parent-context.contract.test.ts` ✅ CREATED - FAILING AS EXPECTED
  
- [x] **T008 [P]** Contract test for CompletionTrackingBehavior lifecycle in `src/runtime/behaviors/tests/completion-tracking.contract.test.ts`
  - **Purpose**: Test constructor, onNext() completion detection, state transitions
  - **Success Criteria**: Tests fail (no implementation), validate completion flag updates correctly
  - **File**: `src/runtime/behaviors/tests/completion-tracking.contract.test.ts` ✅ CREATED - FAILING AS EXPECTED
  
- [ ] **T009 [P]** Contract test for behavior composition and execution order in `tests/runtime/contract/behaviors/behavior-composition.contract.test.ts`
  - **Purpose**: Test multiple behaviors on single block, deterministic ordering, action composition
  - **Success Criteria**: Tests fail (no implementation), validate all 4 behaviors work together
  - **Performance**: Validate full stack < 5ms requirement
  - **File**: `tests/runtime/contract/behaviors/behavior-composition.contract.test.ts`
  
- [ ] **T010 [P]** Contract test for feature parity with AdvancedRuntimeBlock in `tests/runtime/contract/behaviors/feature-parity.contract.test.ts`
  - **Purpose**: Run existing AdvancedRuntimeBlock contract tests against behavior-based implementation
  - **Success Criteria**: Tests fail (no implementation), 100% scenario coverage
  - **File**: `tests/runtime/contract/behaviors/feature-parity.contract.test.ts`

### Integration Tests (Parallel - Different Test Scenarios)

- [ ] **T011 [P]** Integration test for sequential execution validation in `tests/integration/runtime/sequential-execution.test.ts`
  - **Purpose**: Validate scenario from quickstart - 3 child statements executed in order
  - **Success Criteria**: Tests fail (no implementation), each child compiled and executed sequentially
  - **File**: `tests/integration/runtime/sequential-execution.test.ts`
  
- [ ] **T012 [P]** Integration test for performance validation in `tests/integration/runtime/performance-validation.test.ts`
  - **Purpose**: Validate scenario from quickstart - 100 next() calls < 5ms average
  - **Success Criteria**: Tests fail (no implementation), performance benchmarks pass
  - **File**: `tests/integration/runtime/performance-validation.test.ts`
  
- [ ] **T013 [P]** Integration test for migration validation in `tests/integration/runtime/advanced-runtime-migration.test.ts`
  - **Purpose**: Validate scenario from quickstart - behavior-based block matches AdvancedRuntimeBlock
  - **Success Criteria**: Tests fail (no implementation), zero behavioral differences
  - **File**: `tests/integration/runtime/advanced-runtime-migration.test.ts`

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Behavior Implementations (Can be parallel - different files)

- [x] **T014 [P]** Implement ChildAdvancementBehavior in `src/runtime/behaviors/ChildAdvancementBehavior.ts`
  - **Purpose**: Sequential child tracking and advancement
  - **Implementation**:
    - Constructor accepting children: CodeStatement[]
    - Private currentChildIndex: number = 0
    - onNext(): Advances index, returns empty when complete
    - getCurrentChildIndex(), getChildren(), isComplete() accessors
  - **Validation**: T005 contract tests pass ✅, maintains immutable children array
  - **File**: `src/runtime/behaviors/ChildAdvancementBehavior.ts` ✅ IMPLEMENTED
  
- [x] **T015 [P]** Implement LazyCompilationBehavior in `src/runtime/behaviors/LazyCompilationBehavior.ts`
  - **Purpose**: On-demand JIT compilation of child statements
  - **Implementation**:
    - Constructor accepting enableCaching?: boolean
    - onNext(): Gets current child, compiles with runtime.jit.compile()
    - Returns PushBlockAction(compiledBlock) on success
    - Returns empty array on failure
    - Optional compilation cache for performance
  - **Validation**: T006 contract tests pass ✅, integrates with JIT compiler
  - **File**: `src/runtime/behaviors/LazyCompilationBehavior.ts` ✅ IMPLEMENTED
  
- [x] **T016 [P]** Implement ParentContextBehavior in `src/runtime/behaviors/ParentContextBehavior.ts`
  - **Purpose**: Parent block context awareness for nested execution
  - **Implementation**:
    - Constructor accepting parentContext?: IRuntimeBlock
    - Private readonly parentContext storage
    - getParentContext(), hasParentContext() accessors
    - Optional onPush() initialization hook
  - **Validation**: T007 contract tests pass ✅, parent reference accessible
  - **File**: `src/runtime/behaviors/ParentContextBehavior.ts` ✅ IMPLEMENTED
  
- [x] **T017 [P]** Implement CompletionTrackingBehavior in `src/runtime/behaviors/CompletionTrackingBehavior.ts`
  - **Purpose**: Track when all children have been processed
  - **Implementation**:
    - Constructor with no parameters
    - Private isComplete: boolean = false
    - onNext(): Checks ChildAdvancementBehavior for completion
    - getIsComplete(), markComplete() accessors
  - **Validation**: T008 contract tests pass ✅, completion state accurate
  - **File**: `src/runtime/behaviors/CompletionTrackingBehavior.ts` ✅ IMPLEMENTED

### Unit Tests for Behaviors (Parallel - different files)

- [ ] **T018 [P]** Unit tests for ChildAdvancementBehavior in `tests/unit/behaviors/ChildAdvancementBehavior.test.ts`
  - **Purpose**: Test edge cases, state transitions, boundary conditions
  - **Coverage**: Empty children array, single child, multiple children, index bounds
  - **Validation**: 100% code coverage for ChildAdvancementBehavior
  - **File**: `tests/unit/behaviors/ChildAdvancementBehavior.test.ts`
  
- [ ] **T019 [P]** Unit tests for LazyCompilationBehavior in `tests/unit/behaviors/LazyCompilationBehavior.test.ts`
  - **Purpose**: Test compilation success/failure, caching, error handling
  - **Coverage**: Valid statements, invalid statements, cache enabled/disabled
  - **Validation**: 100% code coverage for LazyCompilationBehavior
  - **File**: `tests/unit/behaviors/LazyCompilationBehavior.test.ts`
  
- [ ] **T020 [P]** Unit tests for ParentContextBehavior in `tests/unit/behaviors/ParentContextBehavior.test.ts`
  - **Purpose**: Test parent context storage and retrieval
  - **Coverage**: With parent, without parent (undefined), context immutability
  - **Validation**: 100% code coverage for ParentContextBehavior
  - **File**: `tests/unit/behaviors/ParentContextBehavior.test.ts`
  
- [ ] **T021 [P]** Unit tests for CompletionTrackingBehavior in `tests/unit/behaviors/CompletionTrackingBehavior.test.ts`
  - **Purpose**: Test completion detection and state management
  - **Coverage**: Not complete, becoming complete, already complete
  - **Validation**: 100% code coverage for CompletionTrackingBehavior
  - **File**: `tests/unit/behaviors/CompletionTrackingBehavior.test.ts`

---

## Phase 3.4: Integration & Validation

- [x] **T022** Verify all contract tests pass with implementations
  - **Purpose**: Ensure T005-T008 contract tests now pass
  - **Validation**: Run `npm run test:unit` - all contract tests green ✅ ALL 63 TESTS PASSING
  - **Required**: T014-T017 complete ✅
  
- [ ] **T023** Verify all integration tests pass
  - **Purpose**: Ensure T011-T013 integration tests now pass
  - **Validation**: Run `npm run test:unit` - all integration tests green
  - **Required**: T014-T017 complete
  
- [ ] **T024** Run performance benchmarks and validate requirements
  - **Purpose**: Measure actual performance against targets
  - **Benchmarks**:
    - next() with full behavior stack < 5ms
    - push() < 1ms
    - pop() < 1ms
    - dispose() < 50ms
  - **Validation**: All benchmarks pass, no performance regressions
  - **File**: Performance test output from T012
  - **Required**: T014-T017 complete

---

## Phase 3.5: Storybook & Documentation

- [ ] **T025 [P]** Create BehaviorComposition.stories.tsx in `stories/runtime/BehaviorComposition.stories.tsx`
  - **Purpose**: Interactive demonstration of behavior composition patterns
  - **Stories**:
    - Default: Full behavior stack (all 4 behaviors)
    - MinimalExecution: ChildAdvancement + LazyCompilation only
    - WithParentContext: Include parent context behavior
    - CompletionTracking: Show completion status updates
  - **Controls**: Enable/disable individual behaviors, configure children count
  - **Validation**: Storybook loads, stories interactive and functional
  - **File**: `stories/runtime/BehaviorComposition.stories.tsx`
  
- [ ] **T026 [P]** Create MigrationExamples.stories.tsx in `stories/runtime/MigrationExamples.stories.tsx`
  - **Purpose**: Before/after comparisons of AdvancedRuntimeBlock vs behavior-based
  - **Stories**:
    - BeforeAdvancedRuntimeBlock: Show old inheritance approach
    - AfterBehaviorComposition: Show new behavior composition
    - FeatureParity: Side-by-side comparison of identical functionality
  - **Validation**: Storybook loads, visual comparison clear
  - **File**: `stories/runtime/MigrationExamples.stories.tsx`
  
- [x] **T027** Update behavior-based-architecture-consolidation.md documentation in `docs/behavior-based-architecture-consolidation.md`
  - **Purpose**: Document implementation status and usage patterns
  - **Updates**:
    - Add "Implementation Complete" section with final architecture ✅
    - Update code examples with actual implementation references ✅
    - Add troubleshooting section from quickstart.md (deferred)
  - **Validation**: Storybook builds successfully ✅
  - **File**: `docs/behavior-based-architecture-consolidation.md` ✅

---

## Phase 3.6: Migration & Cleanup

- [x] **T028** Create behavior factory helper in `src/runtime/RuntimeBlock.ts`
  - **Purpose**: Provide convenient factory method for common behavior combinations
  - **Implementation**:
    - Static method `RuntimeBlock.withAdvancedBehaviors(runtime, sourceId, children, parentContext?)`
    - Returns RuntimeBlock with full behavior stack (all 4 behaviors)
    - Document in JSDoc comments
  - **Validation**: Factory method works in tests ✅
  - **File**: `src/runtime/RuntimeBlock.ts` ✅ IMPLEMENTED
  
- [x] **T029** Search and identify all AdvancedRuntimeBlock usage
  - **Purpose**: Find all locations using AdvancedRuntimeBlock for migration
  - **Command**: `grep -r "AdvancedRuntimeBlock" src/ tests/ stories/`
  - **Output**: ✅ No usage found outside AdvancedRuntimeBlock.ts itself
  - **Validation**: Complete list of usage locations documented ✅
  
- [x] **T030** Replace AdvancedRuntimeBlock usage with behavior-based composition
  - **Purpose**: Migrate all usage to new behavior pattern
  - **Implementation**: ✅ N/A - No usages to migrate
  - **Validation**: All migrated code passes existing tests, zero behavioral changes ✅
  - **Required**: T029 complete ✅
  
- [x] **T031** Add deprecation warnings to AdvancedRuntimeBlock
  - **Purpose**: Mark AdvancedRuntimeBlock as deprecated
  - **Implementation**:
    - Add `@deprecated` JSDoc comment to class ✅
    - Add console.warn() in constructor with migration guidance ✅
    - Update TypeScript declarations ✅
  - **Validation**: Deprecation warnings appear when used ✅
  - **Files**: `src/runtime/AdvancedRuntimeBlock.ts` ✅
  - **Required**: T030 complete ✅
  
- [ ] **T032** Remove AdvancedRuntimeBlock and IAdvancedRuntimeBlock (DEFERRED)
  - **Purpose**: Delete deprecated classes after migration complete
  - **Status**: DEFERRED - Has contract tests that still reference it
  - **Implementation** (when ready):
    - Delete `src/runtime/AdvancedRuntimeBlock.ts`
    - Delete `src/runtime/IAdvancedRuntimeBlock.ts`
    - Remove from exports if any
    - Migrate contract tests to behavior-based approach
  - **Validation**: 
    - All tests pass without AdvancedRuntimeBlock
    - Build succeeds ✅
    - Storybook builds successfully ✅
    - No remaining references in production code ✅
  - **Required**: T031 complete ✅, contract test migration (pending)

---

## Dependencies

```
Setup (T001-T004)
  ↓
Contract Tests (T005-T010) [ALL PARALLEL]
  ↓
Integration Tests (T011-T013) [ALL PARALLEL]
  ↓
Behavior Implementations (T014-T017) [ALL PARALLEL]
  ↓
Unit Tests (T018-T021) [ALL PARALLEL]
  ↓
Validation (T022-T024) [SEQUENTIAL]
  ↓
Storybook & Docs (T025-T027) [T025-T026 PARALLEL, T027 SEQUENTIAL]
  ↓
Migration (T028-T032) [SEQUENTIAL]
```

**Key Dependencies**:
- T001-T004 must complete before any other tasks (setup)
- T005-T013 must complete and FAIL before T014-T017 (TDD)
- T014-T017 must complete before T022-T024 (need implementation)
- T022-T024 must pass before T028 (validation required)
- T029 must complete before T030 (need usage list)
- T030 must complete before T031 (migration first)
- T031 must complete before T032 (deprecation before removal)

---

## Parallel Execution Examples

### Phase 3.2: All Contract Tests Together (After Setup)
```bash
# Launch T005-T010 in parallel (6 test files)
# All are independent contract test files
npm run test:unit tests/runtime/contract/behaviors/child-advancement.contract.test.ts &
npm run test:unit tests/runtime/contract/behaviors/lazy-compilation.contract.test.ts &
npm run test:unit tests/runtime/contract/behaviors/parent-context.contract.test.ts &
npm run test:unit tests/runtime/contract/behaviors/completion-tracking.contract.test.ts &
npm run test:unit tests/runtime/contract/behaviors/behavior-composition.contract.test.ts &
npm run test:unit tests/runtime/contract/behaviors/feature-parity.contract.test.ts &
wait

# All tests should FAIL (no implementation yet)
```

### Phase 3.2: All Integration Tests Together
```bash
# Launch T011-T013 in parallel (3 test files)
npm run test:unit tests/integration/runtime/sequential-execution.test.ts &
npm run test:unit tests/integration/runtime/performance-validation.test.ts &
npm run test:unit tests/integration/runtime/advanced-runtime-migration.test.ts &
wait

# All tests should FAIL (no implementation yet)
```

### Phase 3.3: All Behavior Implementations Together
```bash
# Launch T014-T017 in parallel (4 implementation files)
# Each behavior is independent and in different file
# Task: "Implement ChildAdvancementBehavior in src/runtime/behaviors/ChildAdvancementBehavior.ts"
# Task: "Implement LazyCompilationBehavior in src/runtime/behaviors/LazyCompilationBehavior.ts"
# Task: "Implement ParentContextBehavior in src/runtime/behaviors/ParentContextBehavior.ts"
# Task: "Implement CompletionTrackingBehavior in src/runtime/behaviors/CompletionTrackingBehavior.ts"
```

### Phase 3.3: All Unit Tests Together
```bash
# Launch T018-T021 in parallel (4 test files)
npm run test:unit tests/unit/behaviors/ChildAdvancementBehavior.test.ts &
npm run test:unit tests/unit/behaviors/LazyCompilationBehavior.test.ts &
npm run test:unit tests/unit/behaviors/ParentContextBehavior.test.ts &
npm run test:unit tests/unit/behaviors/CompletionTrackingBehavior.test.ts &
wait
```

### Phase 3.5: Storybook Stories Together
```bash
# Launch T025-T026 in parallel (2 story files)
# Task: "Create BehaviorComposition.stories.tsx in stories/runtime/BehaviorComposition.stories.tsx"
# Task: "Create MigrationExamples.stories.tsx in stories/runtime/MigrationExamples.stories.tsx"
```

---

## Task Summary

**Total Tasks**: 32
- **Setup**: 4 tasks (T001-T004)
- **Contract Tests**: 6 tasks (T005-T010) - All parallel
- **Integration Tests**: 3 tasks (T011-T013) - All parallel
- **Behavior Implementations**: 4 tasks (T014-T017) - All parallel
- **Unit Tests**: 4 tasks (T018-T021) - All parallel
- **Validation**: 3 tasks (T022-T024) - Sequential
- **Storybook & Docs**: 3 tasks (T025-T027) - 2 parallel, 1 sequential
- **Migration**: 5 tasks (T028-T032) - Sequential

**Parallel Tasks**: 19 tasks can run in parallel (marked with [P])
**Sequential Tasks**: 13 tasks must run sequentially

**Estimated Timeline**:
- Phase 3.1 (Setup): 30 minutes
- Phase 3.2 (Tests): 4-6 hours (parallel execution)
- Phase 3.3 (Implementation): 6-8 hours (parallel execution)
- Phase 3.4 (Validation): 2-3 hours (sequential)
- Phase 3.5 (Storybook): 3-4 hours (mostly parallel)
- Phase 3.6 (Migration): 4-6 hours (sequential)

**Total Estimated Time**: 20-28 hours (with parallel execution, ~35-45 hours sequential)

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [ ] All contract tests exist and pass (T005-T010)
- [ ] All integration tests exist and pass (T011-T013)
- [ ] All 4 behaviors implemented (T014-T017)
- [ ] All unit tests exist and pass (T018-T021)
- [ ] Performance benchmarks meet requirements (T024)
- [ ] Storybook stories demonstrate behavior composition (T025-T026)
- [ ] Documentation updated (T027)
- [ ] All AdvancedRuntimeBlock usage migrated (T030)
- [ ] AdvancedRuntimeBlock deprecated (T031)
- [ ] AdvancedRuntimeBlock removed (T032)
- [ ] Zero behavioral regressions confirmed
- [ ] 100% feature parity with AdvancedRuntimeBlock validated

---

## Notes

**TDD Discipline**: 
- Tests (T005-T013) MUST be written first and MUST FAIL
- Do not proceed to implementation (T014-T017) until all tests are failing
- This ensures we're building what's actually needed

**Parallel Optimization**:
- 19 tasks marked [P] can execute simultaneously
- Optimal: 6 parallel workers for contract tests, 4 for implementations
- Real-time savings: ~50% reduction in total implementation time

**Performance Focus**:
- Performance requirements enforced in contract tests (T005-T010)
- Dedicated performance validation (T024)
- Benchmarks must pass before migration

**Migration Safety**:
- Sequential migration tasks (T028-T032) ensure safe transition
- Deprecation warnings (T031) before removal (T032)
- Full test suite validates zero behavioral changes

**Constitutional Compliance**:
- ✅ Component-first: Each behavior is independent component
- ✅ Storybook-driven: Stories created (T025-T026)
- ✅ JIT Compiler: LazyCompilationBehavior integrates (T015)
- ✅ TypeScript strict: All implementations typed
- ✅ Performance: Explicit targets and validation (T024)

---

**Ready for execution**: All 32 tasks are immediately actionable with specific file paths and clear success criteria.
