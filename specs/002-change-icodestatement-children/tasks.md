# Tasks: Children Groups for Workout Statement Hierarchy

**Input**: Design documents from `/specs/002-change-icodestatement-children/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, React, Chevrotain parser, Vitest
   → Structure: Single project (React component library)
2. Load design documents:
   → data-model.md: ICodeStatement interface modification
   → contracts/: Parser interface and visitor grouping contracts
   → research.md: Grouping algorithm decisions
3. Generate tasks by category:
   → Setup: TypeScript compilation, test baseline
   → Tests: Contract tests, integration tests (TDD)
   → Core: Interface update, parser modification
   → Integration: Consumer updates
   → Polish: Storybook stories, performance validation
4. Apply task rules:
   → Different files marked [P] for parallel execution
   → Tests before implementation (constitutional requirement)
   → Interface changes before consumer updates
5. Tasks numbered T001-T020
6. TDD ordering ensures failing tests before implementation
7. Parallel execution optimizes independent file changes
8. All contract requirements covered with tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Single project structure: `src/`, `tests/`, `stories/` at repository root

## Phase 3.1: Setup
- [ ] T001 Verify baseline: Run `npm run test:unit` to confirm existing tests pass (45 passed, 1 failed, 4 module errors expected)
- [ ] T002 Validate TypeScript compilation: Run `npx tsc --noEmit` to establish baseline (369 errors expected)
- [ ] T003 [P] Create test data file `src/parser/timer.visitor.grouping.test.ts` for grouping algorithm tests

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Interface Contract Tests
- [ ] T004 [P] Interface contract test in `src/CodeStatement.test.ts` - validate `children: number[][]` type and structure
- [ ] T005 [P] Parser interface contract test in `src/parser/timer.visitor.interface.test.ts` - test consecutive compose grouping behavior from contracts/parser-interface.md

### Visitor Grouping Tests  
- [ ] T006 [P] Grouping algorithm unit tests in `src/parser/timer.visitor.grouping.test.ts` - test `groupChildrenByLapFragments()` method per contracts/visitor-grouping.md
- [ ] T007 [P] Integration test for mixed lap fragments in `src/parser/timer.visitor.integration.test.ts` - end-to-end parsing with grouping validation

### Consumer Compatibility Tests
- [ ] T008 [P] Consumer update tests in `src/runtime/consumer-compatibility.test.ts` - validate existing consumers work with `number[][]` structure

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Interface Updates
- [ ] T009 Update ICodeStatement interface in `src/CodeStatement.ts` - change `children: number[]` to `children: number[][]`
- [ ] T010 [P] Add grouping method signature in `src/parser/timer.visitor.ts` - add `groupChildrenByLapFragments()` method declaration

### Parser Implementation  
- [ ] T011 Implement grouping algorithm in `src/parser/timer.visitor.ts` - implement `groupChildrenByLapFragments()` method with consecutive compose logic
- [ ] T012 Modify wodMarkdown() method in `src/parser/timer.visitor.ts` - integrate grouping logic after parent-child relationship establishment

### Consumer Updates
- [ ] T013 Update runtime consumers in `src/runtime/` - modify all `.children` access to handle `number[][]` (use semantic search to find all usages)
- [ ] T014 Update clock components in `src/clock/` - modify any `.children` access to handle `number[][]` structure
- [ ] T015 Update fragment consumers - scan and update any other `.children` usage across codebase

## Phase 3.4: Integration
- [ ] T016 Validate TypeScript compilation: Run `npx tsc --noEmit` and ensure no NEW errors introduced beyond baseline
- [ ] T017 Run full test suite: Execute `npm run test:unit` and verify all tests pass with new grouping behavior
- [ ] T018 Storybook integration test: Run `npm run storybook` and verify parser stories demonstrate correct grouping

## Phase 3.5: Polish
- [ ] T019 [P] Create Storybook demonstration story in `stories/parser/children-grouping.stories.tsx` - showcase consecutive compose grouping behavior
- [ ] T020 [P] Update quickstart validation in `specs/002-change-icodestatement-children/quickstart.md` - verify all quickstart scenarios pass with implementation

## Dependencies
- Setup (T001-T003) before tests (T004-T008)
- Tests (T004-T008) before implementation (T009-T015) - **TDD REQUIREMENT**
- Interface update (T009) before consumer updates (T013-T015)
- Parser method declaration (T010) before implementation (T011-T012)
- Core implementation (T009-T015) before integration (T016-T018)
- Integration (T016-T018) before polish (T019-T020)

## Parallel Example
```bash
# Launch T004-T008 together (Tests First - TDD):
Task: "Interface contract test in src/CodeStatement.test.ts"
Task: "Parser interface contract test in src/parser/timer.visitor.interface.test.ts"  
Task: "Grouping algorithm unit tests in src/parser/timer.visitor.grouping.test.ts"
Task: "Integration test in src/parser/timer.visitor.integration.test.ts"
Task: "Consumer compatibility tests in src/runtime/consumer-compatibility.test.ts"

# After tests fail, launch T010 and T013-T015 in parallel:
Task: "Add grouping method signature in src/parser/timer.visitor.ts"
Task: "Update runtime consumers in src/runtime/"
Task: "Update clock components in src/clock/" 
Task: "Update fragment consumers across codebase"
```

## Notes
- [P] tasks target different files with no dependencies
- **Constitutional compliance**: Tests MUST fail before implementation (TDD requirement)
- Preserve existing functionality while adding grouping behavior
- Minimal changes approach: only `children: number[]` → `children: number[][]`
- Maintain sequential order and parent-child integrity per functional requirements

## Task Generation Rules
*Applied during main() execution*

1. **From Parser Interface Contract** (contracts/parser-interface.md):
   - Interface contract test → T004 [P]
   - Consecutive compose grouping test → T005 [P]
   - Interface update → T009
   
2. **From Visitor Grouping Contract** (contracts/visitor-grouping.md):
   - Grouping algorithm unit test → T006 [P]  
   - Method signature → T010 [P]
   - Implementation → T011, T012

3. **From Data Model** (data-model.md):
   - ICodeStatement interface → T009
   - Consumer migration → T013-T015
   
4. **From Quickstart Scenarios** (quickstart.md):
   - Integration test → T007 [P]
   - Validation updates → T020 [P]

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T004-T008)
- [x] Interface modification has implementation tasks (T009, T010-T012)
- [x] All tests come before implementation (T004-T008 → T009-T015)
- [x] Parallel tasks target independent files
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD compliance: failing tests required before implementation
- [x] Constitutional requirements satisfied: Tests-first approach