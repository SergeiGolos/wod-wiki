# Tasks: JIT Compiler Strategy Implementation and Runtime Block Advancement

**Input**: Design documents from `X:\wod-wiki\specs\009-jit-compiler-strategy\`  
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript, React 18+, Vitest, Storybook
   → Structure: Single project (src/, tests/, stories/)
2. Load optional design documents ✅
   → data-model.md: 8 entities identified → 3 strategy implementations needed
   → contracts/: 3 contract files → 3 test tasks
   → research.md: Fragment-based matching decisions → setup tasks
   → quickstart.md: 6 validation scenarios → integration tests
3. Generate tasks by category:
   → Setup: N/A (existing project, dependencies installed)
   → Tests: 3 contract tests, 2 integration tests (TDD)
   → Core: 3 strategy implementations, 1 interface update, 2 behavior updates
   → Integration: 1 demo update, 1 UI component update
   → Polish: 6 quickstart validations, documentation
4. Apply task rules:
   → Test files different → mark [P] for parallel
   → Strategy implementations in same file → sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T023)
6. Dependencies: Tests → Core → Integration → Polish
7. Parallel execution: T001-T003 (tests), T011-T012 (validation)
8. Validate task completeness:
   → All 3 contracts have tests ✅
   → All 3 strategies implemented ✅
   → All quickstart scenarios validated ✅
9. Return: SUCCESS (23 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in task descriptions
- Single project structure: `src/`, `tests/`, `stories/` at repository root

---

## Phase 3.1: Setup
*No setup tasks required - existing project with dependencies installed*

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (3 contracts from contracts/ directory)

- [ ] **T001** [P] Create strategy matching contract test file  
  **File**: `tests/unit/runtime/strategies.test.ts`  
  **Contract**: `contracts/strategy-matching-contract.md` (SMC-001)  
  **Scenarios**: 9 test cases covering:
  - TSC-001: TimerStrategy matches statements with Timer fragments
  - TSC-002: TimerStrategy rejects statements without Timer fragments
  - TSC-003: RoundsStrategy matches statements with Rounds fragments (no Timer)
  - TSC-004: RoundsStrategy rejects statements with Timer fragments
  - TSC-005: EffortStrategy matches statements without Timer or Rounds
  - TSC-006: EffortStrategy rejects statements with Timer fragments
  - TSC-007: EffortStrategy rejects statements with Rounds fragments
  - TSC-008: Strategy handles empty statements array
  - TSC-009: Strategy handles missing fragments array
  
  **Dependencies**: None (creates new file)  
  **Expected Result**: All 9 tests FAIL (strategies not implemented correctly yet)  
  **Validation**: Run `npm run test:unit` - should show 9 failing tests

- [ ] **T002** [P] Create block compilation contract test file  
  **File**: `tests/unit/runtime/block-compilation.test.ts` (NEW FILE)  
  **Contract**: `contracts/block-compilation-contract.md` (BCC-001)  
  **Scenarios**: 9 test cases covering:
  - TBC-001: TimerStrategy compile() sets blockType to "Timer"
  - TBC-002: RoundsStrategy compile() sets blockType to "Rounds"
  - TBC-003: EffortStrategy compile() sets blockType to "Effort"
  - TBC-004: Strategies add behaviors when statement has children
  - TBC-005: Strategies omit behaviors for leaf blocks (no children)
  - TBC-006: ChildAdvancementBehavior initialized with correct children
  - TBC-007: Compiled block preserves source statement ID
  - TBC-008: Compiled block receives runtime reference
  - TBC-009: Multiple statements in array handled correctly
  
  **Dependencies**: None (creates new file)  
  **Expected Result**: All 9 tests FAIL (blockType not implemented, behaviors not propagated)  
  **Validation**: Run `npm run test:unit` - should show 18 failing tests total

- [ ] **T003** [P] Create strategy precedence integration test file  
  **File**: `tests/integration/jit-compiler-precedence.test.ts` (NEW FILE)  
  **Contract**: `contracts/strategy-precedence-contract.md` (SPC-001)  
  **Scenarios**: 9 test cases covering:
  - TSP-001: TimerStrategy evaluated before RoundsStrategy
  - TSP-002: RoundsStrategy evaluated before EffortStrategy
  - TSP-003: EffortStrategy acts as fallback
  - TSP-004: Timer + Rounds statement matches TimerStrategy (precedence)
  - TSP-005: Registration order determines precedence
  - TSP-006: No matching strategy returns undefined
  - TSP-007: Empty statements array returns undefined
  - TSP-008: First match wins (no double compilation - spy verification)
  - TSP-009: Multiple compile calls maintain consistent precedence
  
  **Dependencies**: None (creates new file)  
  **Expected Result**: All 9 tests FAIL (precedence not enforced, strategies not registered correctly)  
  **Validation**: Run `npm test` - should show 27 failing tests total

**Phase 3.2 Gate**: All 27 contract tests written and FAILING before proceeding to Phase 3.3

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Interface Updates

- [ ] **T004** Add blockType metadata to IRuntimeBlock interface  
  **File**: `src/runtime/IRuntimeBlock.ts`  
  **Change**: Add optional `readonly blockType?: string` property to interface  
  **Purpose**: Enable UI discrimination of block types  
  **Valid Values**: "Timer", "Rounds", "Effort", "Generic", "Error"  
  **Dependencies**: None  
  **Tests Affected**: TBC-001, TBC-002, TBC-003 (will start passing)  
  **Validation**: TypeScript compilation should succeed, no new errors

- [ ] **T005** Update RuntimeBlock constructor to accept blockType  
  **File**: `src/runtime/RuntimeBlock.ts`  
  **Change**: 
  - Add `blockType?: string` parameter to constructor signature
  - Store in readonly property: `readonly blockType?: string`
  - Pass through from strategies
  
  **Dependencies**: T004 (interface must exist first)  
  **Tests Affected**: TBC-001, TBC-002, TBC-003  
  **Validation**: TypeScript compilation succeeds

### Strategy Implementations

- [ ] **T006** Fix EffortStrategy.match() to check fragments  
  **File**: `src/runtime/strategies.ts` (line ~15)  
  **Current Code**:
  ```typescript
  match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
      return true;  // PROBLEM: Always matches
  }
  ```
  
  **New Code**:
  ```typescript
  match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
      if (!statements || statements.length === 0) return false;
      if (!statements[0].fragments) return false;
      
      const fragments = statements[0].fragments;
      const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
      const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
      
      // Only match if NO timer AND NO rounds (pure effort)
      return !hasTimer && !hasRounds;
  }
  ```
  
  **Dependencies**: None  
  **Tests Affected**: TSC-005, TSC-006, TSC-007 (will pass), TSP-003 (will pass)  
  **Validation**: Run `npm run test:unit` - 3 tests should now pass

- [ ] **T007** Update EffortStrategy.compile() to propagate behaviors and blockType  
  **File**: `src/runtime/strategies.ts` (line ~20)  
  **Current Code**:
  ```typescript
  compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
      return new RuntimeBlock(runtime, code[0]?.id ? [code[0].id] : [], []);
  }
  ```
  
  **New Code**:
  ```typescript
  compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
      const behaviors: IRuntimeBehavior[] = [];
      
      // Add behaviors if statement has children
      if (code[0].children && code[0].children.length > 0) {
          behaviors.push(new ChildAdvancementBehavior(code[0].children));
          behaviors.push(new LazyCompilationBehavior());
      }
      
      return new RuntimeBlock(
          runtime,
          code[0]?.id ? [code[0].id] : [],
          behaviors,
          "Effort"  // blockType metadata
      );
  }
  ```
  
  **Imports Needed**:
  ```typescript
  import { ChildAdvancementBehavior } from './behaviors/ChildAdvancementBehavior';
  import { LazyCompilationBehavior } from './behaviors/LazyCompilationBehavior';
  import { IRuntimeBehavior } from './IRuntimeBehavior';
  ```
  
  **Dependencies**: T005 (RuntimeBlock must accept blockType), T006  
  **Tests Affected**: TBC-003, TBC-004, TBC-005, TBC-006 (will pass)  
  **Validation**: Run `npm run test:unit` - 7 more tests should pass

- [ ] **T008** Implement TimerStrategy class  
  **File**: `src/runtime/strategies.ts` (add after EffortStrategy, before CountdownStrategy)  
  **Code**:
  ```typescript
  /**
   * Strategy that creates timer-based parent blocks for time-bound workouts.
   * Matches statements with Timer fragments (e.g., "20:00 AMRAP").
   */
  export class TimerStrategy implements IRuntimeBlockStrategy {
      match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
          if (!statements || statements.length === 0) {
              console.warn('TimerStrategy: No statements provided');
              return false;
          }
          
          if (!statements[0].fragments) {
              console.warn('TimerStrategy: Statement missing fragments array');
              return false;
          }
          
          const fragments = statements[0].fragments;
          return fragments.some(f => f.fragmentType === FragmentType.Timer);
      }
      
      compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
          console.log(\`  🧠 TimerStrategy compiling \${code.length} statement(s)\`);
          
          const behaviors: IRuntimeBehavior[] = [];
          
          // Add behaviors if statement has children
          if (code[0].children && code[0].children.length > 0) {
              behaviors.push(new ChildAdvancementBehavior(code[0].children));
              behaviors.push(new LazyCompilationBehavior());
          }
          
          return new RuntimeBlock(
              runtime,
              code[0]?.id ? [code[0].id] : [],
              behaviors,
              "Timer"  // blockType metadata
          );
      }
  }
  ```
  
  **Dependencies**: T005, T007 (pattern established)  
  **Tests Affected**: TSC-001, TSC-002, TBC-001, TSP-001, TSP-004, TSP-008 (will pass)  
  **Validation**: Run `npm run test:unit` - 6 more tests should pass

- [ ] **T009** Implement RoundsStrategy class  
  **File**: `src/runtime/strategies.ts` (add after TimerStrategy)  
  **Code**:
  ```typescript
  /**
   * Strategy that creates rounds-based parent blocks for multi-round workouts.
   * Matches statements with Rounds fragments but NOT Timer fragments.
   * Timer takes precedence over Rounds.
   */
  export class RoundsStrategy implements IRuntimeBlockStrategy {
      match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
          if (!statements || statements.length === 0) {
              console.warn('RoundsStrategy: No statements provided');
              return false;
          }
          
          if (!statements[0].fragments) {
              console.warn('RoundsStrategy: Statement missing fragments array');
              return false;
          }
          
          const fragments = statements[0].fragments;
          const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
          const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
          
          // Match rounds BUT NOT timer (timer takes precedence)
          return hasRounds && !hasTimer;
      }
      
      compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
          console.log(\`  🧠 RoundsStrategy compiling \${code.length} statement(s)\`);
          
          const behaviors: IRuntimeBehavior[] = [];
          
          // Add behaviors if statement has children
          if (code[0].children && code[0].children.length > 0) {
              behaviors.push(new ChildAdvancementBehavior(code[0].children));
              behaviors.push(new LazyCompilationBehavior());
          }
          
          return new RuntimeBlock(
              runtime,
              code[0]?.id ? [code[0].id] : [],
              behaviors,
              "Rounds"  // blockType metadata
          );
      }
  }
  ```
  
  **Dependencies**: T008 (pattern established)  
  **Tests Affected**: TSC-003, TSC-004, TBC-002, TSP-002 (will pass)  
  **Validation**: Run `npm run test:unit` - 4 more tests should pass

- [ ] **T010** Remove or fix non-functional strategies (CountdownStrategy, TimerStrategy duplicate)  
  **File**: `src/runtime/strategies.ts` (lines ~30-100)  
  **Issue**: Existing CountdownStrategy, RoundsStrategy (old), TimerStrategy (old) have incorrect signatures  
  **Action**: 
  - Comment out or delete CountdownStrategy (references undefined CountdownParentBlock)
  - Comment out or delete old RoundsStrategy (references undefined BoundedLoopingParentBlock)
  - Comment out or delete old TimerStrategy (references undefined TimerBlock)
  - Keep only: EffortStrategy (fixed), TimerStrategy (new), RoundsStrategy (new)
  
  **Rationale**: Old strategies have wrong parameter types (RuntimeMetric[] instead of ICodeStatement[])  
  **Dependencies**: T006-T009 (new implementations complete)  
  **Tests Affected**: All tests should continue passing  
  **Validation**: Run `npm run test:unit` - no new failures, 27 tests passing

---

## Phase 3.4: Integration

- [ ] **T011** Update JitCompilerDemo strategy registration order  
  **File**: `stories/compiler/JitCompilerDemo.tsx` (demo component, NOT the .stories.tsx file)  
  **Location**: Find where JitCompiler is initialized (likely in component state initialization)  
  **Note**: Strategy registration happens in the component implementation file (.tsx), not the Storybook story definition file (.stories.tsx)  
  **Current Code** (approximate):
  ```typescript
  const compiler = new JitCompiler();
  compiler.registerStrategy(new EffortStrategy());  // Wrong order!
  ```
  
  **New Code**:
  ```typescript
  const compiler = new JitCompiler();
  // Register in precedence order: most specific first
  compiler.registerStrategy(new TimerStrategy());      // Check Timer first
  compiler.registerStrategy(new RoundsStrategy());     // Then Rounds
  compiler.registerStrategy(new EffortStrategy());     // Effort is fallback
  ```
  
  **Imports Needed**:
  ```typescript
  import { TimerStrategy, RoundsStrategy, EffortStrategy } from '../../src/runtime/strategies';
  ```
  
  **Dependencies**: T006-T009 (strategies must exist)  
  **Tests Affected**: TSP-001, TSP-002, TSP-005, TSP-009 (will pass)  
  **Validation**: Start Storybook (`npm run storybook`), observe console logs show strategy order

- [ ] **T012** Update CompactRuntimeBlockDisplay to show blockType  
  **File**: `stories/compiler/CompactRuntimeBlockDisplay.tsx` (or similar UI component)  
  **Location**: Find where block name is displayed (currently shows "Runtime (Idle)")  
  **Current Code** (approximate):
  ```typescript
  const blockName = block.constructor.name;  // Shows "RuntimeBlock" for all
  ```
  
  **New Code**:
  ```typescript
  const blockName = block.blockType 
      ? \`\${block.blockType} Block\`
      : block.constructor.name;  // Fallback to constructor name
  ```
  
  **Dependencies**: T004, T005 (blockType property must exist)  
  **Tests Affected**: None (UI component, validated via Storybook)  
  **Validation**: Click "Next Block" in Storybook demo, observe type-specific names

---

## Phase 3.5: Polish & Validation

### Quickstart Validation Scenarios

- [ ] **T013** [P] Validate Scenario 1: AMRAP Workout (Timer Strategy)  
  **Reference**: `quickstart.md` Scenario 1  
  **Steps**:
  1. Start Storybook: `npm run storybook`
  2. Navigate to **Workouts > Amrap > Default** story
  3. Click "Next Block" button
  4. Observe stack display
  
  **Expected Result**:
  ```
  Runtime Stack (2 blocks):
  - Root Block (Executing)
  - Timer Block (Idle)    ← Success!
  ```
  
  **Success Criteria**:
  - ✅ Second block labeled "Timer Block" (not "Runtime")
  - ✅ Console shows: "🧠 TimerStrategy compiling 1 statement(s)"
  - ✅ No errors in browser console
  
  **Dependencies**: T011, T012  
  **Validation**: Manual observation in Storybook, screenshot for PR

- [ ] **T014** [P] Validate Scenario 2: For Time Workout (Rounds Strategy)  
  **Reference**: `quickstart.md` Scenario 2  
  **Steps**:
  1. Navigate to **Workouts > For Time** story (if exists) or any workout with rounds
  2. Click "Next Block" button
  3. Observe stack display
  
  **Expected Result**:
  ```
  Runtime Stack (2 blocks):
  - Root Block (Executing)
  - Rounds Block (Idle)   ← Success!
  ```
  
  **Success Criteria**:
  - ✅ Second block labeled "Rounds Block"
  - ✅ Console shows: "🧠 RoundsStrategy compiling 1 statement(s)"
  - ✅ Timer strategy did NOT match (precedence correct)
  
  **Dependencies**: T011, T012  
  **Validation**: Manual observation in Storybook

- [ ] **T015** [P] Validate Scenario 3: Simple Effort Statement  
  **Reference**: `quickstart.md` Scenario 3  
  **Steps**:
  1. Navigate to **Parser > Simple Effort** story or create simple effort workout
  2. Click "Next Block" button
  3. Observe stack display
  
  **Expected Result**:
  ```
  Runtime Stack (2 blocks):
  - Root Block (Executing)
  - Effort Block (Idle)   ← Success!
  ```
  
  **Success Criteria**:
  - ✅ Second block labeled "Effort Block"
  - ✅ Console shows: "🧠 EffortStrategy compiling 1 statement(s)"
  - ✅ No timer or rounds strategies attempted
  
  **Dependencies**: T011, T012  
  **Validation**: Manual observation in Storybook

- [ ] **T016** Validate Scenario 4: Nested Compilation (Behavior Cascade)  
  **Reference**: `quickstart.md` Scenario 4  
  **Steps**:
  1. Navigate to **Workouts > Amrap > Default** story
  2. Click "Next Block" once (compiles parent timer block)
  3. Click "Next Block" again (should compile first child)
  4. Observe stack growth
  
  **Expected Result**:
  ```
  Runtime Stack (3 blocks):
  - Root Block (Executing)
  - Timer Block (Executing)
  - Effort Block (Idle)   ← Child compiled!
  ```
  
  **Success Criteria**:
  - ✅ Stack grows to 3 blocks
  - ✅ Third block shows effort type (child exercise)
  - ✅ Console shows recursive compilation
  - ✅ ChildAdvancementBehavior incremented index
  
  **Dependencies**: T007-T009 (behavior propagation), T011, T012  
  **Validation**: Manual observation, verify multiple "Next Block" clicks work

- [ ] **T017** Validate Scenario 5: Strategy Precedence Order  
  **Reference**: `quickstart.md` Scenario 5  
  **Steps**:
  1. Open browser DevTools console
  2. Navigate to any workout story with timer
  3. Click "Next Block"
  4. Observe console log output
  
  **Expected Console Output**:
  ```
  🧠 TimerStrategy compiling 1 statement(s)
  ```
  
  **Success Criteria**:
  - ✅ TimerStrategy logs appear first
  - ✅ No Rounds or Effort strategy logs (early return)
  - ✅ Correct strategy matched based on fragments
  
  **Dependencies**: T011 (registration order)  
  **Validation**: Console log verification

- [ ] **T018** Validate Scenario 6: Block Type Display  
  **Reference**: `quickstart.md` Scenario 6  
  **Steps**:
  1. Navigate to any workout story
  2. Click "Next Block" multiple times
  3. Observe stack display panel
  4. Verify each block shows unique type
  
  **Expected Display**:
  ```
  Runtime Stack (4 blocks):
  - Root Block (Executing)
  - Timer Block (Executing)
  - Effort Block (Completed)
  - Effort Block (Idle)
  ```
  
  **Success Criteria**:
  - ✅ NO blocks labeled "Runtime (Idle)"
  - ✅ Timer blocks show "Timer"
  - ✅ Rounds blocks show "Rounds"
  - ✅ Effort blocks show "Effort"
  
  **Dependencies**: T012 (UI update)  
  **Validation**: Visual confirmation in Storybook

### Test Suite Validation

- [ ] **T019** Run unit tests and verify all 27 tests pass  
  **Command**: `npm run test:unit`  
  **Expected Output**:
  ```
  ✓ tests/unit/runtime/strategies.test.ts (9 tests passed)
  ✓ tests/unit/runtime/block-compilation.test.ts (9 tests passed)
  
  Test Files: 2 passed (2)
  Tests: 18 passed (18)
  Duration: ~2-3s
  ```
  
  **Success Criteria**:
  - ✅ All strategy matching tests pass (TSC-001 through TSC-009)
  - ✅ All block compilation tests pass (TBC-001 through TBC-009)
  - ✅ No new TypeScript errors introduced (baseline: 369 errors)
  - ✅ Test execution time < 5 seconds
  
  **Dependencies**: T001-T010 (all core implementation complete)  
  **Validation**: Green test output, no regressions

- [ ] **T020** Run integration tests and verify all 9 tests pass  
  **Command**: `npm run test:integration` or `npm test`  
  **Expected Output**:
  ```
  ✓ tests/integration/jit-compiler-precedence.test.ts (9 tests passed)
  
  Test Files: 1 passed (1)
  Tests: 9 passed (9)
  Duration: ~2s
  ```
  
  **Success Criteria**:
  - ✅ All precedence tests pass (TSP-001 through TSP-009)
  - ✅ Strategy evaluation order enforced
  - ✅ First match wins (spy verification)
  - ✅ Multiple compilations maintain precedence
  
  **Dependencies**: T001-T011 (integration complete)  
  **Validation**: Green test output

### Regression Testing

- [ ] **T021** Run all existing tests to verify no regressions  
  **Command**: `npm run test:unit` (check baseline)  
  **Expected**: Existing test results unchanged (baseline: 45 passed, 1 failed, 4 module errors)  
  **Success Criteria**:
  - ✅ No NEW test failures introduced
  - ✅ Existing failures remain at baseline
  - ✅ TypeScript error count unchanged (369 errors)
  
  **Dependencies**: T001-T020 (all changes complete)  
  **Validation**: Compare test output to baseline

- [ ] **T022** Validate all existing workout stories in Storybook  
  **Stories to Check**:
  - Workouts > Amrap (all variants)
  - Workouts > For Time (if exists)
  - Workouts > EMOM (if exists)
  - Workouts > Tabata (if exists)
  - Parser stories (simple efforts)
  
  **Success Criteria**:
  - ✅ All stories load without errors
  - ✅ "Next Block" advances stack correctly
  - ✅ No console errors or warnings (except expected)
  - ✅ UI remains responsive
  
  **Dependencies**: T011-T012 (integration complete)  
  **Validation**: Manual walkthrough of all stories

### Documentation

- [ ] **T023** Update documentation with feature completion notes  
  **Files to Update**:
  - `specs/009-jit-compiler-strategy/plan.md` - Mark Phase 4 complete
  - `docs/runtime-api.md` - Document new blockType property (if exists)
  - `README.md` - No changes needed (internal feature)
  
  **Changes**:
  - Update Progress Tracking: Phase 4 complete, Phase 5 complete
  - Add notes about strategy registration order importance
  - Document blockType metadata usage
  
  **Dependencies**: T001-T022 (all implementation and validation complete)  
  **Validation**: Documentation review

---

## Dependencies

### Critical Path (Sequential)
```
Phase 3.2 (Tests) → Phase 3.3 (Core) → Phase 3.4 (Integration) → Phase 3.5 (Validation)

Specifically:
T001-T003 (tests) → T004-T005 (interfaces) → T006-T010 (strategies) → T011-T012 (integration) → T013-T023 (validation)
```

### Detailed Dependencies
- **T004** (interface) blocks **T005** (constructor)
- **T005** (constructor) blocks **T006-T009** (strategies need constructor signature)
- **T006-T009** (strategies) block **T010** (cleanup)
- **T010** (cleanup) blocks **T011** (registration)
- **T004, T005** (blockType) block **T012** (UI display)
- **T011, T012** (integration) block **T013-T018** (validation scenarios)
- **T001-T011** (implementation) block **T019-T020** (test validation)
- **T001-T020** (everything) blocks **T021-T023** (regression & docs)

### Parallel Execution Groups
```
Group 1 (Tests - can run in parallel):
T001, T002, T003 [P]

Group 2 (Validation - can run in parallel after integration):
T013, T014, T015 [P]
```

---

## Parallel Execution Examples

### Creating Test Files (Group 1)
```bash
# Run these three tasks concurrently:
# Terminal 1:
Task: "Create strategy matching contract test in tests/unit/runtime/strategies.test.ts with 9 test scenarios from contracts/strategy-matching-contract.md"

# Terminal 2:
Task: "Create block compilation contract test in tests/unit/runtime/block-compilation.test.ts with 9 test scenarios from contracts/block-compilation-contract.md"

# Terminal 3:
Task: "Create strategy precedence integration test in tests/integration/jit-compiler-precedence.test.ts with 9 test scenarios from contracts/strategy-precedence-contract.md"
```

### Validation Scenarios (Group 2)
```bash
# Run validation scenarios concurrently (different stories):
# Browser 1:
Task: "Validate AMRAP workout compiles to Timer Block in Storybook Workouts > Amrap story"

# Browser 2:
Task: "Validate For Time workout compiles to Rounds Block in Storybook Workouts > For Time story"

# Browser 3:
Task: "Validate simple effort compiles to Effort Block in Storybook Parser > Simple Effort story"
```

---

## Task Execution Summary

### Task Count by Phase
- **Phase 3.1 Setup**: 0 tasks (existing project)
- **Phase 3.2 Tests**: 3 tasks (T001-T003) - ALL PARALLEL [P]
- **Phase 3.3 Core**: 7 tasks (T004-T010) - Sequential (same file)
- **Phase 3.4 Integration**: 2 tasks (T011-T012) - Sequential
- **Phase 3.5 Polish**: 11 tasks (T013-T023) - 3 parallel validation tasks

**Total**: 23 tasks

### File Impact Summary
- **New files**: 3 test files
  - `tests/unit/runtime/strategies.test.ts`
  - `tests/unit/runtime/block-compilation.test.ts`
  - `tests/integration/jit-compiler-precedence.test.ts`

- **Modified files**: 4 source files
  - `src/runtime/IRuntimeBlock.ts` (add blockType property)
  - `src/runtime/RuntimeBlock.ts` (update constructor)
  - `src/runtime/strategies.ts` (fix EffortStrategy, add TimerStrategy, RoundsStrategy)
  - `stories/compiler/JitCompilerDemo.tsx` (update registration order)
  - `stories/compiler/CompactRuntimeBlockDisplay.tsx` (display blockType)

- **No changes**: Parser, editor, other runtime components

### Estimated Time
- **Tests (T001-T003)**: 1-2 hours (parallel)
- **Core (T004-T010)**: 2-3 hours (sequential, careful implementation)
- **Integration (T011-T012)**: 30 minutes
- **Validation (T013-T023)**: 1-2 hours (manual testing + docs)

**Total**: 5-7 hours for full implementation and validation

---

## Notes

### TDD Approach
- Phase 3.2 tasks MUST be completed first
- All 27 tests MUST fail before implementing strategies
- Red-Green-Refactor cycle strictly enforced
- Verify tests fail: `npm run test:unit` after T001-T003

### Parallel Execution
- [P] tasks can run concurrently (different files)
- Strategy implementations sequential (same file: strategies.ts)
- Validation scenarios can be manual parallel (different browser tabs)

### Constitutional Compliance
- ✅ No parser changes (Parser-First principle maintained)
- ✅ Storybook validation (Storybook-Driven Development)
- ✅ Component-first (Strategy pattern)
- ✅ JIT Runtime (constructor-based initialization)
- ✅ No editor changes (Monaco Editor Integration preserved)

### Common Pitfalls to Avoid
- ❌ Implementing strategies before writing tests
- ❌ Registering strategies in wrong order (Effort first)
- ❌ Forgetting to propagate behaviors to child blocks
- ❌ Not handling edge cases (empty arrays, missing fragments)
- ❌ Using wrong parameter types (RuntimeMetric[] instead of ICodeStatement[])

### Commit Strategy
- Commit after each phase (3.2, 3.3, 3.4, 3.5)
- Commit message format: "feat(runtime): [task description]"
- Example: "feat(runtime): Add TimerStrategy with fragment-based matching (T008)"

---

## Validation Checklist
*GATE: Must verify before considering feature complete*

- [ ] All 3 contract files have corresponding test files
- [ ] All 3 strategies implemented (Timer, Rounds, Effort)
- [ ] All 27 tests passing (18 unit + 9 integration)
- [ ] blockType property added to IRuntimeBlock
- [ ] Behaviors propagated when children exist
- [ ] Strategy registration order correct (Timer → Rounds → Effort)
- [ ] UI displays type-specific block names
- [ ] All 6 quickstart scenarios validated
- [ ] No regressions in existing tests
- [ ] All workout stories still functional
- [ ] TypeScript error count unchanged (369 baseline)
- [ ] Documentation updated

**Feature Status**: ✅ Complete when all boxes checked

---

**Tasks generated**: 23 tasks across 5 phases  
**Ready for execution**: Follow TDD approach (tests first!)  
**Next step**: Begin Phase 3.2 with T001-T003 (test creation)
