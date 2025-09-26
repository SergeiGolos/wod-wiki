# Tasks: Runtime Stack Enhancement

**Input**: Design documents from `/specs/001-runtime-stack-needs/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript 5.x with React 18+, Vitest, Storybook, Chevrotain
   → Structure: Single project - React component library
2. Load design documents:
   → data-model.md: RuntimeStack and IRuntimeBlock entities
   → contracts/runtime-stack-api.md: RuntimeStack API contract
   → research.md: Constructor-based initialization, consumer-managed dispose
3. Generate tasks by category:
   → Setup: dependencies, TypeScript configuration
   → Tests: contract tests, integration tests 
   → Core: IRuntimeBlock interface updates, RuntimeStack implementation
   → Integration: Storybook stories, runtime integration
   → Polish: unit tests, documentation updates
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. SUCCESS: Tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Verify TypeScript configuration supports interface changes in tsconfig.json
- [ ] T002 [P] Install additional Vitest testing utilities if needed
- [ ] T003 [P] Configure Storybook for runtime stack demonstrations

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test RuntimeStack.push() behavior in src/runtime/RuntimeStack.contract.test.ts
- [ ] T005 [P] Contract test RuntimeStack.pop() lifecycle in src/runtime/RuntimeStack.contract.test.ts
- [ ] T006 [P] Contract test RuntimeStack.current() method in src/runtime/RuntimeStack.contract.test.ts
- [ ] T007 [P] Contract test RuntimeStack.graph() ordering in src/runtime/RuntimeStack.contract.test.ts
- [ ] T008 [P] Integration test constructor-based initialization in src/runtime/RuntimeStack.integration.test.ts
- [ ] T009 [P] Integration test consumer-managed dispose pattern in src/runtime/RuntimeStack.integration.test.ts
- [ ] T010 [P] Integration test stack lifecycle with nested blocks in src/runtime/RuntimeStack.integration.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T011 [P] Update IRuntimeBlock interface with dispose() method in src/runtime/IRuntimeBlock.ts
- [ ] T013 Update RuntimeStack.push() to remove initialization calls in src/runtime/RuntimeStack.ts
- [ ] T014 Update RuntimeStack.pop() to remove cleanup calls in src/runtime/RuntimeStack.ts
- [ ] T015 Maintain RuntimeStack.current() method compatibility in src/runtime/RuntimeStack.ts
- [ ] T016 Preserve RuntimeStack.graph() ordering behavior in src/runtime/RuntimeStack.ts
- [ ] T017 [P] Update existing IRuntimeBlock implementations with dispose method in src/runtime/RuntimeBlock.ts
- [ ] T018 [P] Add error handling for invalid blocks in RuntimeStack operations in src/runtime/RuntimeStack.ts

## Phase 3.4: Integration
- [ ] T019 [P] Create Storybook story for RuntimeStack lifecycle in stories/runtime/RuntimeStack.stories.tsx
- [ ] T020 [P] Update JitCompiler to use constructor-based initialization in src/runtime/JitCompiler.ts
- [ ] T021 Update ScriptRuntime to handle dispose() calls after pop operations in src/runtime/ScriptRuntime.ts
- [ ] T022 [P] Add console logging for lifecycle operations in RuntimeStack in src/runtime/RuntimeStack.ts
- [ ] T023 [P] Update FragmentCompilers to implement new IRuntimeBlock interface in src/runtime/FragmentCompilers.ts

## Phase 3.5: Polish
- [ ] T024 [P] Unit tests for dispose() method implementations in src/runtime/RuntimeStack.unit.test.ts
- [ ] T025 [P] Unit tests for error conditions and edge cases in src/runtime/RuntimeStack.unit.test.ts
- [ ] T026 [P] Performance tests for stack operations (<50ms requirement) in src/runtime/RuntimeStack.perf.test.ts
- [ ] T027 [P] Update TypeScript documentation comments in src/runtime/IRuntimeBlock.ts
- [ ] T028 [P] Update API documentation in docs/runtime-api.md
- [ ] T029 Verify no breaking changes to existing WodScript functionality
- [ ] T030 Run complete test suite to validate integration

## Dependencies
- Setup (T001-T003) before all other tasks
- Tests (T004-T010) before implementation (T011-T018)
- T011 (IRuntimeBlock interface) blocks T012, T017, T023
- T013-T016 (RuntimeStack core methods) must be sequential (same file)
- T021 depends on T013-T014 (RuntimeStack changes)
- Integration (T019-T023) before polish (T024-T030)
- T029-T030 must be last (validation tasks)

## Parallel Example
```bash
# Launch T004-T007 together (contract tests):
Task: "Contract test RuntimeStack.push() behavior in src/runtime/RuntimeStack.contract.test.ts"
Task: "Contract test RuntimeStack.pop() lifecycle in src/runtime/RuntimeStack.contract.test.ts" 
Task: "Contract test RuntimeStack.current() method in src/runtime/RuntimeStack.contract.test.ts"
Task: "Contract test RuntimeStack.graph() ordering in src/runtime/RuntimeStack.contract.test.ts"

# Launch T008-T010 together (integration tests):
Task: "Integration test constructor-based initialization in src/runtime/RuntimeStack.integration.test.ts"
Task: "Integration test consumer-managed dispose pattern in src/runtime/RuntimeStack.integration.test.ts"
Task: "Integration test stack lifecycle with nested blocks in src/runtime/RuntimeStack.integration.test.ts"

```

## Notes
- [P] tasks = different files, no dependencies
- Constructor-based initialization replaces pre-push lifecycle methods
- Consumer must call dispose() after pop operations
- Breaking changes allowed per plan.md requirements
- Verify tests fail before implementing (TDD approach)
- Commit after each task completion

## Critical Success Factors
- All IRuntimeBlock implementations must have dispose() method
- RuntimeStack operations simplified (no lifecycle method calls)
- Consumer code updated to handle dispose() responsibility
- Deterministic behavior maintained for workout execution timing
- Storybook demonstrations show proper lifecycle management usage