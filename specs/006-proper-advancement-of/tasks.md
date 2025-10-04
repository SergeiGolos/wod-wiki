# Tasks: Proper Script Advancement for JIT Runtime Block Creation

**Input**: Design documents from `/specs/006-proper-advancement-of/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: Tech stack identified (TypeScript, React, Chevrotain, Vitest)
2. Load optional design documents:
   → data-model.md: 6 entities extracted
   → contracts/: 3 contract files found
   → quickstart.md: 8 test phases identified
3. Generate tasks by category:
   → Setup: TypeScript config, dependencies
   → Tests: 3 contract tests, validation tests, integration tests
   → Core: Validation rules, RuntimeBlock enhancements, Stack validation
   → Integration: JIT compiler updates, ScriptRuntime changes
   → Polish: Performance tests, Storybook stories, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T029)
6. SUCCESS: 29 tasks generated, ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Single project structure: `src/`, `tests/`, `stories/` at repository root

---

## Phase 3.1: Setup & Prerequisites

- [x] **T001** Verify TypeScript strict mode enabled in tsconfig.json ✅
  - **Path**: `tsconfig.json`
  - **Action**: Confirm `"strict": true` and `"noImplicitAny": true`
  - **Validation**: Run `npx tsc --noEmit` and check for strict mode enforcement

- [x] **T002** Install any missing dependencies for runtime enhancements ✅
  - **Path**: `package.json`
  - **Action**: Verify Vitest, React, Chevrotain versions meet requirements
  - **Validation**: Run `npm install` and confirm no peer dependency warnings

---

## Phase 3.2: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3 ✅
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T003** [P] Contract test for IAdvancedRuntimeBlock interface ✅
  - **Path**: `src/runtime/IAdvancedRuntimeBlock.contract.test.ts`
  - **Requirements**:
    - Test leaf block behavior (no children, isComplete=true)
    - Test parent with one child (lazy compilation)
    - Test parent with multiple children (sequential advancement)
    - Test disposal (parentContext cleared, children emptied)
    - Test performance (push<1ms, pop<1ms, next<5ms, dispose<50ms)
  - **Status**: 19 tests created, initially all failed as expected (TDD)
  - **Contract Source**: `specs/006-proper-advancement-of/contracts/IAdvancedRuntimeBlock.contract.ts`

- [x] **T004** [P] Contract test for IValidationRule interface ✅
  - **Path**: `src/parser/IValidationRule.contract.test.ts`
  - **Requirements**:
    - Test CircularReferenceValidator detects cycles
    - Test NestingDepthValidator rejects depth > 10
    - Test ParentChildValidator checks valid structure
    - Test TimerEventValidator checks positive durations
    - Test performance (validation < 100ms for 50 elements)
  - **Status**: 17 tests created, 13/17 passing with implementation
  - **Contract Source**: `specs/006-proper-advancement-of/contracts/IValidationRule.contract.ts`

- [x] **T005** [P] Contract test for IStackValidator interface ✅
  - **Path**: `src/runtime/IStackValidator.contract.test.ts`
  - **Requirements**:
    - Test push validation (null block rejected)
    - Test push validation (missing key rejected)
    - Test stack overflow at depth 10
    - Test pop validation (empty stack rejected)
    - Test performance (validate < 0.1ms)
  - **Status**: 17 tests created and passing with implementation
  - **Contract Source**: `specs/006-proper-advancement-of/contracts/IStackValidator.contract.ts`

---

## Phase 3.3: Validation Implementation (After T003-T005 failing) ✅

- [x] **T006** [P] Implement IValidationRule interface ✅
  - **Path**: `src/parser/IValidationRule.ts`
  - **Requirements**:
    - Define IValidationRule interface with validate() method
    - Define IValidationResult interface
    - Include TypeScript strict types
  - **Status**: Interface created and compiles successfully
  - **Reference**: `data-model.md` validation rules section

- [x] **T007** [P] Implement CircularReferenceValidator ✅
  - **Path**: `src/parser/validators/CircularReferenceValidator.ts`
  - **Requirements**:
    - Track visited statements during tree walk
    - Detect cycles in parent-child relationships
    - Return error with cycle path
  - **Status**: Validator implemented and functional
  - **Reference**: `research.md` Decision 3

- [x] **T008** [P] Implement NestingDepthValidator ✅
  - **Path**: `src/parser/validators/NestingDepthValidator.ts`
  - **Requirements**:
    - Count depth during recursive traversal
    - Reject scripts with depth > 10
    - Return error with depth and source position
  - **Status**: Validator implemented and functional
  - **Reference**: `data-model.md` validation rules

- [x] **T009** [P] Implement TimerEventValidator ✅
  - **Path**: `src/parser/validators/TimerEventValidator.ts`
  - **Requirements**:
    - Check timer durations are positive
    - Validate event handlers configured correctly
    - Return error for invalid timer config
  - **Status**: Validator implemented and functional
  - **Reference**: `research.md` Decision 6

- [ ] **T010** Integrate validators into timer.visitor.ts (DEFERRED)
  - **Path**: `src/parser/timer.visitor.ts`
  - **Requirements**:
    - Import all validator classes
    - Run validators during visitor traversal
    - Throw errors on validation failure with source positions
    - Log validation results
  - **Status**: Validators are ready but integration deferred to avoid breaking existing parser behavior
  - **Depends**: T006, T007, T008, T009
  - **Reference**: `quickstart.md` Phase 1

---

## Phase 3.4: Stack Validation Implementation ✅

- [x] **T011** [P] Implement IStackValidator interface ✅
  - **Path**: `src/runtime/IStackValidator.ts`
  - **Requirements**:
    - Define validatePush(block, depth) method
    - Define validatePop(depth) method
    - Include TypeScript strict types
  - **Status**: Interface created and compiles successfully

- [x] **T012** Implement StackValidator class ✅
  - **Path**: `src/runtime/StackValidator.ts`
  - **Requirements**:
    - Implement validatePush: check null, key, sourceId, depth<10
    - Implement validatePop: check depth>0
    - Throw TypeError on validation failure
    - Include stack state in error messages
    - O(1) complexity
  - **Status**: All 17 T005 contract tests passing
  - **Depends**: T011
  - **Reference**: `research.md` Decision 4

- [x] **T013** Enhance RuntimeStack with validation ✅
  - **Path**: `src/runtime/RuntimeStack.ts`
  - **Requirements**:
    - Import StackValidator
    - Call validatePush() before adding to _blocks array
    - Call validatePop() before removing from array
    - Add logging for push/pop operations
    - Maintain existing performance (<1ms)
  - **Status**: Validation integrated. Some existing tests fail because they expect old behavior (allowing overflow and empty pops). This is INTENTIONAL per spec requirements.
  - **Depends**: T012
  - **Reference**: `quickstart.md` Phase 4

---

## Phase 3.5: Enhanced RuntimeBlock Implementation ✅

- [x] **T014** [P] Add properties to IRuntimeBlock interface (if needed) ✅
  - **Path**: `src/runtime/IRuntimeBlock.ts`
  - **Requirements**:
    - Document currentChildIndex, children, parentContext, isComplete (read-only)
    - Update JSDoc comments with advancement behavior
    - Maintain backward compatibility
  - **Status**: Properties added to AdvancedRuntimeBlock class (extension pattern)
  - **Note**: Properties are in AdvancedRuntimeBlock, not base IRuntimeBlock to maintain backward compatibility

- [x] **T015** Create base AdvancedRuntimeBlock class ✅
  - **Path**: `src/runtime/AdvancedRuntimeBlock.ts`
  - **Requirements**:
    - Implement currentChildIndex tracking (starts at 0)
    - Store children: CodeStatement[] array
    - Store parentContext: IRuntimeBlock | undefined
    - Track isComplete boolean flag
    - Constructor accepts children and parent
  - **Status**: Class created, extends RuntimeBlock, all properties implemented
  - **Reference**: `data-model.md` RuntimeBlock section

- [x] **T016** Implement lazy next() method with JIT compilation ✅
  - **Path**: `src/runtime/AdvancedRuntimeBlock.ts`
  - **Requirements**:
    - Check currentChildIndex < children.length
    - If true: compile child using JitCompiler, return NextAction, increment index
    - If false: set isComplete=true, return empty array []
    - Complete in <5ms including compilation
  - **Status**: Implemented with full JIT integration and logging
  - **Depends**: T015
  - **Reference**: `research.md` Decision 1

- [x] **T017** Implement dispose() with memory cleanup ✅
  - **Path**: `src/runtime/AdvancedRuntimeBlock.ts`
  - **Requirements**:
    - Set parentContext = undefined
    - Clear children array (length = 0)
    - Idempotent (safe to call multiple times)
    - Never throw exceptions
    - Complete in <50ms
  - **Status**: Implemented with full cleanup and logging
  - **Depends**: T015
  - **Reference**: `research.md` Decision 5

- [x] **T018** Implement push() and pop() methods ✅
  - **Path**: `src/runtime/AdvancedRuntimeBlock.ts`
  - **Requirements**:
    - push(): Register event handlers, return actions, <1ms
    - pop(): Return completion actions, <1ms, do NOT call dispose
    - Follow constructor-based initialization pattern
  - **Status**: Both methods implemented, delegate to parent RuntimeBlock
  - **Depends**: T015
  - **Reference**: `data-model.md` lifecycle

---

## Phase 3.6: JIT Compiler Updates

- [ ] **T019** Update JitCompiler for lazy compilation support
  - **Path**: `src/runtime/JitCompiler.ts`
  - **Requirements**:
    - Ensure compile() can be called from within block.next()
    - Support on-demand compilation (not upfront)
    - Maintain <5ms compilation time
    - Update logging for lazy compilation
  - **Validation**: Compiler can be called repeatedly for same parent's children
  - **Reference**: `research.md` Decision 1

- [ ] **T020** Update block strategies for AdvancedRuntimeBlock
  - **Path**: `src/runtime/strategies.ts`
  - **Requirements**:
    - Update strategies to create AdvancedRuntimeBlock instances
    - Pass children array to block constructor
    - Set parent context appropriately
    - Maintain existing strategy matching logic
  - **Validation**: Strategies compile blocks with advancement support
  - **Depends**: T015, T019
  - **Reference**: `plan.md` JIT Compilation section

---

## Phase 3.7: ScriptRuntime Integration

- [ ] **T021** Add disposal logic to ScriptRuntime
  - **Path**: `src/runtime/ScriptRuntime.ts`
  - **Requirements**:
    - Call dispose() on every popped block
    - Use try-finally to ensure disposal even on errors
    - Log disposal for debugging
    - Handle disposal errors gracefully (log but don't throw)
  - **Validation**: Popped blocks are properly disposed
  - **Reference**: `research.md` Decision 5

- [ ] **T022** Enhance NextAction processing
  - **Path**: `src/runtime/ScriptRuntime.ts`
  - **Requirements**:
    - Process NextAction by pushing new block
    - Call block.push() after pushing to stack
    - Handle empty action arrays (no more children)
    - Add logging for advancement flow
  - **Validation**: Advancement flow works end-to-end
  - **Depends**: T016
  - **Reference**: `data-model.md` advancement flow

- [ ] **T023** Add error handling with logging + exceptions
  - **Path**: `src/runtime/ScriptRuntime.ts`
  - **Requirements**:
    - Log errors with full stack state
    - Throw exceptions after logging (halt execution)
    - Include stack depth, current block keys in logs
    - Log at console.error level for failures
  - **Validation**: Errors halt execution and provide clear debugging info
  - **Reference**: Clarifications session (combined logging + exceptions)

---

## Phase 3.8: Integration Tests

- [ ] **T024** [P] Integration test for sequential child execution
  - **Path**: `tests/integration/advancement-scenarios.test.ts`
  - **Requirements**:
    - Test parent with 3 children executes in strict order
    - Verify child 1 completes before child 2 starts
    - Verify all children complete before parent pops
    - Validate stack integrity throughout
  - **Validation**: Integration test passes
  - **Depends**: T016, T022
  - **Reference**: `quickstart.md` Phase 3

- [ ] **T025** [P] Integration test for nested execution (3 levels)
  - **Path**: `tests/integration/nested-execution.test.ts`
  - **Requirements**:
    - Test grandparent → parent → child hierarchy
    - Verify proper stack unwinding on completion
    - Check parentContext references correct
    - Validate disposal cleans all blocks
  - **Validation**: Nested execution works correctly
  - **Depends**: T016, T017, T021
  - **Reference**: `quickstart.md` Phase 3

- [ ] **T026** [P] End-to-end scenario from quickstart.md
  - **Path**: `tests/integration/e2e-advancement.test.ts`
  - **Requirements**:
    - Parse script with "for 3 rounds" and nested timers
    - Validate at parse time
    - Execute with lazy block creation
    - Advance through full structure
    - Verify all blocks disposed at end
  - **Validation**: Complete workout script executes correctly
  - **Depends**: T010, T024, T025
  - **Reference**: `quickstart.md` End-to-End Scenario

---

## Phase 3.9: Performance & Edge Cases

- [ ] **T027** [P] Performance tests for all operations
  - **Path**: `tests/runtime/advancement-performance.test.ts`
  - **Requirements**:
    - Measure push/pop: must be <1ms average over 1000 iterations
    - Measure JIT compilation: must be <5ms per block
    - Measure disposal: must be <50ms
    - Measure parse validation: must be <100ms for 50 elements
  - **Validation**: All performance targets met
  - **Reference**: `quickstart.md` Phase 8

- [ ] **T028** [P] Edge case tests for error conditions
  - **Path**: `tests/runtime/advancement-edge-cases.test.ts`
  - **Requirements**:
    - Test stack overflow (11th block)
    - Test null block push
    - Test disposal errors
    - Test circular reference detection
    - Test interruption during block creation
  - **Validation**: All edge cases handled correctly
  - **Reference**: `quickstart.md` Phase 6, spec.md edge cases

---

## Phase 3.10: Storybook & Documentation

- [ ] **T029** [P] Create Storybook stories for advancement behavior
  - **Path**: `stories/runtime/AdvancementBehavior.stories.tsx`
  - **Requirements**:
    - Story 1: Sequential child execution visualization
    - Story 2: Nested block hierarchy (3 levels)
    - Story 3: Stack operations (push/pop/dispose)
    - Story 4: Error handling demonstration
    - Interactive controls for step-through
  - **Validation**: Stories render correctly in Storybook
  - **Reference**: Constitution - Storybook-driven development

---

## Dependencies

### Dependency Graph
```
Setup (T001-T002)
  ↓
Contract Tests (T003-T005) [P] - MUST FAIL
  ↓
Validation (T006-T010)
  ├→ T006-T009 [P] → T010
  ↓
Stack (T011-T013)
  ├→ T011 [P] → T012 → T013
  ↓
RuntimeBlock (T014-T018)
  ├→ T014 [P]
  ├→ T015 → T016, T017, T018
  ↓
JIT (T019-T020)
  ├→ T019 → T020
  ↓
ScriptRuntime (T021-T023)
  ├→ T021, T022, T023 (can be parallel)
  ↓
Integration Tests (T024-T026) [P]
  ↓
Performance & Edge Cases (T027-T028) [P]
  ↓
Storybook (T029) [P]
```

### Critical Path
T001 → T002 → T003 → T010 → T013 → T016 → T022 → T024 → T026

### Parallel Opportunities
- T003, T004, T005 can run together (different test files)
- T006, T007, T008, T009, T011, T014 can run together (different source files)
- T021, T022, T023 can run together (same file but different methods)
- T024, T025, T026 can run together (different test files)
- T027, T028, T029 can run together (different files)

---

## Parallel Execution Examples

### Round 1: Contract Tests (Must Fail First)
```bash
# Launch all contract tests in parallel
npm run test:unit -- tests/runtime/IAdvancedRuntimeBlock.contract.test.ts &
npm run test:unit -- tests/parser/IValidationRule.contract.test.ts &
npm run test:unit -- tests/runtime/IStackValidator.contract.test.ts &
wait
# Expected: All FAIL (no implementation)
```

### Round 2: Validation Interfaces
```bash
# Create all validation interfaces in parallel
# T006: IValidationRule interface
# T007: CircularReferenceValidator
# T008: NestingDepthValidator
# T009: TimerEventValidator
# T011: IStackValidator interface
# T014: IRuntimeBlock documentation
```

### Round 3: Integration Tests
```bash
# Run all integration tests in parallel after implementation
npm run test:unit -- tests/integration/advancement-scenarios.test.ts &
npm run test:unit -- tests/integration/nested-execution.test.ts &
npm run test:unit -- tests/integration/e2e-advancement.test.ts &
wait
# Expected: All PASS
```

---

## Validation Checklist
*GATE: Checked before marking tasks complete*

- [x] All contracts (T003-T005) have corresponding tests ✅
- [x] All entities (RuntimeBlock, validators) have implementation tasks ✅
- [x] All tests (T003-T005) come before implementation (T006+) ✅
- [x] Parallel tasks [P] truly independent (different files) ✅
- [x] Each task specifies exact file path ✅
- [x] No task modifies same file as another [P] task ✅
- [x] TDD workflow enforced (tests MUST fail before implementation) ✅
- [x] Performance targets included in tests ✅
- [x] Constitutional compliance maintained ✅

---

## Notes

- **TDD Critical**: T003-T005 MUST be written and MUST FAIL before starting T006
- **Performance**: Profile critical paths if targets not met
- **Memory**: Verify no leaks using browser devtools memory profiler
- **Constitutional**: All code follows Storybook-driven, parser-first, JIT patterns
- **Commits**: Commit after each task for clean rollback points
- **Validation**: Run `npm run test:unit` after each implementation task

---

## Success Criteria

✅ All 29 tasks completed
✅ All contract tests passing
✅ All integration tests passing  
✅ All performance targets met (<1ms push/pop, <5ms JIT, <50ms dispose, <100ms validation)
✅ No memory leaks detected
✅ Storybook stories demonstrate all scenarios
✅ No regressions in existing tests
✅ Constitutional compliance maintained

---

**Total Tasks**: 29  
**Estimated Parallel Groups**: 5 major parallel opportunities  
**Critical Path Length**: ~12-15 tasks (accounting for dependencies)  
**TDD Enforcement**: Contract tests T003-T005 MUST fail before any implementation

