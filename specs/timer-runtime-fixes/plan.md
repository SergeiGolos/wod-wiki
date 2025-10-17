
# Implementation Plan: Timer Runtime Coordination Fixes

**Branch**: `timer-runtime-fixes` | **Date**: October 16, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `x:\wod-wiki\specs\timer-runtime-fixes\spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Fix 7 critical coordination gaps in the WOD Wiki runtime system that prevent timer-based and multi-round workouts from executing correctly. The runtime architecture has solid interfaces and individual behaviors, but lacks coordination mechanisms between timers, rounds, and child blocks. Implementation adds missing behaviors (LoopCoordinatorBehavior), strategies (TimeBoundRoundsStrategy), and coordination logic to enable: (1) Multi-round workouts with rep schemes (21-15-9), (2) AMRAP countdown timers with round looping, (3) For Time count-up timers with child coordination, and (4) Metric inheritance from parent blocks to children. All changes maintain backward compatibility with existing interfaces.

## Technical Context
**Language/Version**: TypeScript 5+ (strict mode)  
**Primary Dependencies**: React 18+, Vitest, Chevrotain (parser)  
**Storage**: In-memory runtime state (IRuntimeMemory system)  
**Testing**: Vitest (unit, integration, contract tests)  
**Target Platform**: Web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Single project (React component library with runtime engine)  
**Performance Goals**: Push/pop < 1ms, lifecycle methods < 50ms, round transitions < 10ms, metric inheritance < 5ms overhead  
**Constraints**: No breaking changes to IRuntimeBlock/IScriptRuntime/IRuntimeBehavior interfaces; backward compatibility required; existing 45+ tests must continue passing  
**Scale/Scope**: 7 new/enhanced components (behaviors, strategies, blocks), ~1500 new LOC, 20+ new integration tests, 4-week implementation timeline

**User-Provided Context from Arguments**:
Analysis document at `docs/timer-runtime-alignment-analysis.md` identifies 7 missing coordination mechanisms preventing timer and multi-round workouts from functioning. Root causes documented in `docs/runtime-execution-problems-analysis.md` with specific code locations and expected behaviors.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-First Architecture ✅ PASS
- New behaviors (LoopCoordinatorBehavior) are self-contained, reusable components
- All behaviors follow IRuntimeBehavior interface contract
- Clear single-responsibility: coordination, not business logic
- No organizational-only components

### II. Storybook-Driven Development ✅ PASS
- Integration tests will be created as Storybook stories (workout examples)
- Existing Runtime stories (Fran, AMRAP) will demonstrate fixes
- Component state variations captured in test scenarios
- Interactive testing via existing JitCompilerDemo

### III. Parser-First Domain Logic ✅ PASS (N/A for this feature)
- No new workout syntax being added
- No parser changes required
- All changes are runtime/compiler layer only
- Existing parser grammar remains unchanged

### IV. JIT Compiler Runtime ✅ PASS
- All changes follow constructor-based initialization pattern
- New behaviors follow consumer-managed disposal pattern  
- Performance targets explicitly defined and must be met
- Memory management patterns preserved
- Stack operations remain optimized (<1ms requirement)

### V. Monaco Editor Integration ✅ PASS (N/A for this feature)
- No editor changes required
- No syntax highlighting changes
- No autocomplete changes
- Editor experience unchanged

**Initial Assessment**: ✅ **PASS** - All constitutional requirements met. No violations. This is a pure runtime enhancement maintaining all architectural principles.

## Project Structure

### Documentation (this feature)
```
specs/timer-runtime-fixes/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── LoopCoordinatorBehavior.contract.md
│   ├── TimeBoundRoundsStrategy.contract.md
│   ├── TimerBlock.contract.md
│   └── CompilationContext.contract.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── runtime/
│   ├── behaviors/
│   │   ├── LoopCoordinatorBehavior.ts          # NEW: Child looping coordination
│   │   ├── ChildAdvancementBehavior.ts         # ENHANCE: Add looping support
│   │   ├── LazyCompilationBehavior.ts          # FIX: Timing issue
│   │   ├── RoundsBehavior.ts                   # ENHANCE: Auto-start
│   │   └── TimerBehavior.ts                    # EXISTING: No changes
│   ├── blocks/
│   │   └── TimerBlock.ts                       # ENHANCE: Child management
│   ├── strategies.ts                           # ENHANCE: Add TimeBoundRoundsStrategy
│   ├── CompilationContext.ts                   # ENHANCE: Add inheritedMetrics
│   ├── JitCompiler.ts                          # ENHANCE: Register new strategy
│   └── IRuntimeBehavior.ts                     # EXISTING: No interface changes
├── docs/
│   ├── timer-runtime-alignment-analysis.md     # EXISTING: Analysis document
│   └── runtime-execution-problems-analysis.md  # EXISTING: Problem documentation
└── tests/
    ├── unit/
    │   └── runtime/
    │       ├── LoopCoordinatorBehavior.test.ts # NEW: Unit tests
    │       ├── TimeBoundRoundsStrategy.test.ts # NEW: Unit tests
    │       └── MetricInheritance.test.ts       # NEW: Integration tests
    └── integration/
        └── runtime/
            ├── FranWorkout.test.ts             # NEW: Multi-round test
            ├── AMRAPWorkout.test.ts            # NEW: AMRAP test
            ├── ForTimeWorkout.test.ts          # NEW: For Time test
            └── PerformanceBenchmarks.test.ts   # NEW: Performance tests

stories/
└── runtime/
    ├── CrossFit.stories.tsx                    # ENHANCE: Fran story
    └── TimerWorkouts.stories.tsx               # NEW: Timer workout demos
```

**Structure Decision**: Single project structure. This is a React component library with runtime engine. All changes are in `src/runtime/` (behaviors, blocks, strategies) with corresponding tests in `tests/`. No frontend/backend split needed. Component library pattern with Storybook for development and testing.

## Phase 0: Outline & Research ✅ COMPLETE

**Status**: Complete - See `research.md`

**Key Research Findings**:

1. **Behavior Coordination Pattern** → Duck-typing behavior discovery
   - Avoids tight coupling, maintains interface compatibility
   - Proven pattern in existing codebase

2. **Strategy Precedence** → Precise matching + first-match-wins registration
   - TimeBoundRoundsStrategy requires Timer + Rounds + AMRAP (3 fragments)
   - Registered first for precedence over general strategies

3. **Metric Inheritance Depth** → Shallow (one level only)
   - Parent passes to immediate children only
   - Reduces complexity, sufficient for current workout patterns

4. **Timer-Child Completion** → First-completes-wins pattern
   - AMRAP: Timer expires OR all children done (whichever first)
   - For Time: Children complete OR time cap reached (whichever first)

5. **Auto-Start Implementation** → Behavior.onPush() returns PushBlockAction
   - Follows constructor-based initialization pattern
   - Keeps constructors pure (no side effects)

6. **Performance Impact** → ~5ms additional overhead (acceptable)
   - Well within 50ms lifecycle budget
   - 3x performance margin remains

7. **LazyCompilation Fix** → Calculate next index (nextIndex = current + 1)
   - Surgical fix, minimal risk
   - No behavior execution order changes needed

8. **Test Strategy** → Three-layer pyramid
   - Contract tests (interface compliance)
   - Integration tests (behavior coordination)
   - E2E tests (full scenarios in Storybook)

**All NEEDS CLARIFICATION Resolved**: ✅

**Output**: `research.md` with 8 research questions answered, all decisions documented

## Phase 1: Design & Contracts ✅ COMPLETE

**Status**: Complete - See `data-model.md`, `contracts/`, and `quickstart.md`

### Entities Defined (data-model.md)

1. **CompilationContext** (enhanced value object)
   - Fields: parentBlock, inheritedMetrics, roundState
   - Purpose: Carry metrics from parent to child during compilation
   - Relationships: Created by JIT, consumed by strategies

2. **TimerBlockConfig** (enhanced configuration)
   - Added field: `children?: ICodeStatement[]`
   - Backward compatible (field optional)
   - Enables TimerBlock to wrap child blocks

3. **LoopCoordinatorState** (behavior state)
   - Fields: mode, isComplete
   - State transitions: Initial → Looping → Complete
   - Guards: Round/timer completion conditions

4. **BehaviorCoordinationKey** (string constants)
   - Duck-typing patterns for behavior discovery
   - Used throughout for sibling behavior lookups

### Contracts Generated (contracts/)

1. **LoopCoordinatorBehavior.contract.md**
   - Full IRuntimeBehavior implementation spec
   - 3 coordination modes: rounds, timed-rounds, intervals
   - 4 test scenarios defined
   - Performance targets specified (<10ms onNext)

2. **TimeBoundRoundsStrategy.contract.md**
   - match() and compile() specifications
   - Pattern: Timer + Rounds + AMRAP
   - Composite structure: TimerBlock(RoundsBlock(children))
   - 3 test scenarios defined

3. **CompilationContext.contract.md**
   - Interface enhancement (add fields)
   - Usage patterns (parent creating, child consuming)
   - 2 test scenarios defined
   - Backward compatibility verified

4. **TimerBlock.contract.md**
   - Constructor enhancement (child management)
   - Completion logic (first-completes-wins)
   - 3 test scenarios defined
   - Backward compatibility verified

### Quickstart Created (quickstart.md)

**5 Test Scenarios**:
1. Fran Workout (multi-round looping)
2. AMRAP Workout (timed rounds)
3. For Time Workout (timer+children)
4. Auto-Start (no manual click)
5. Performance Benchmarks (lifecycle timing)

**Each scenario includes**:
- Step-by-step validation instructions
- Expected outcomes checklist
- Troubleshooting guidance
- Success criteria

### Agent Context Update

Running update script to add new implementations to agent context...

**Output**: 
- ✅ data-model.md (4 entities documented)
- ✅ contracts/ (4 contract specifications)
- ✅ quickstart.md (5 validation scenarios)
- ⏳ Agent context update (next step)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Contract Tests First** (TDD Red-Green-Refactor):
   - Each contract → failing contract test file
   - LoopCoordinatorBehavior.contract.test.ts [P]
   - TimeBoundRoundsStrategy.contract.test.ts [P]
   - CompilationContext.contract.test.ts [P]
   - TimerBlock.contract.test.ts [P]

2. **Interface Enhancements**:
   - CompilationContext.ts - Add inheritedMetrics fields [P]
   - TimerBlockConfig.ts - Add children field [P]

3. **Behavior Implementations** (Sequential - depends on interfaces):
   - LoopCoordinatorBehavior.ts implementation
   - Enhanced ChildAdvancementBehavior.ts (looping support)
   - Fixed LazyCompilationBehavior.ts (timing fix)
   - Enhanced RoundsBehavior.ts (auto-start)

4. **Strategy Implementation**:
   - TimeBoundRoundsStrategy.ts implementation
   - Register strategy in JitCompiler.ts (precedence order)

5. **Block Enhancement**:
   - Enhanced TimerBlock.ts (child management)

6. **Integration Tests** (Sequential - depends on implementations):
   - FranWorkout.test.ts (multi-round)
   - AMRAPWorkout.test.ts (timed rounds)
   - ForTimeWorkout.test.ts (timer+children)
   - MetricInheritance.test.ts (context passing)

7. **Performance Tests**:
   - PerformanceBenchmarks.test.ts (lifecycle timing)

8. **Storybook Stories**:
   - Enhanced CrossFit.stories.tsx (Fran demo)
   - New TimerWorkouts.stories.tsx (AMRAP, For Time)

**Ordering Strategy**:
- Phase 1 (Tasks 1-4): Contract tests + interfaces [P = parallel]
- Phase 2 (Tasks 5-11): Implementations (sequential per dependency)
- Phase 3 (Tasks 12-15): Integration tests (sequential)
- Phase 4 (Tasks 16-17): Performance + stories (parallel)

**Estimated Output**: 17-20 numbered, ordered tasks in tasks.md

**Dependencies**:
- Contract tests can run in parallel (no dependencies)
- Implementations depend on interfaces
- Integration tests depend on implementations
- Stories depend on everything working

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

### Implementation Timeline

**Week 1: Basic Timer-Child Coordination**
- Tasks 1-11: Interfaces, LoopCoordinatorBehavior, enhanced behaviors
- Milestone: `20:00 For Time: 100 Squats` executes correctly

**Week 2: Round Looping**  
- Tasks 12-15: Metric inheritance, round coordination, integration tests
- Milestone: `(21-15-9) Thrusters, Pullups` completes all 3 rounds

**Week 3: AMRAP and Intervals**
- Tasks 16-18: TimeBoundRoundsStrategy, timer-controlled looping
- Milestone: `(21-15-9) 20:00 AMRAP` loops until timer expires

**Week 4: Polish and Validation**
- Tasks 19-20: Performance optimization, documentation, quickstart validation
- Milestone: All tests pass, documentation complete, ready for release

---

**Next Command**: Run `/tasks` to generate tasks.md with 17-20 numbered, ordered implementation tasks

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: ✅ **NO VIOLATIONS** - No complexity deviations to track

All implementation follows constitutional principles:
- Component-First: New behaviors are self-contained components
- JIT Compiler: Constructor-based init, consumer-managed disposal maintained
- Performance: All targets explicitly defined and validated
- No new projects, no architectural deviations


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md created
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Approach documented
- [x] Phase 3: Tasks generated (/tasks command) - ✅ tasks.md created with 25 tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - No violations
- [x] Post-Design Constitution Check: PASS - No new violations
- [x] All NEEDS CLARIFICATION resolved - All technical context complete
- [x] Complexity deviations documented - None (no violations)

**Artifacts Generated**:
- ✅ specs/timer-runtime-fixes/research.md
- ✅ specs/timer-runtime-fixes/data-model.md
- ✅ specs/timer-runtime-fixes/quickstart.md
- ✅ specs/timer-runtime-fixes/contracts/LoopCoordinatorBehavior.contract.md
- ✅ specs/timer-runtime-fixes/contracts/TimeBoundRoundsStrategy.contract.md
- ✅ specs/timer-runtime-fixes/contracts/CompilationContext.contract.md
- ✅ specs/timer-runtime-fixes/contracts/TimerBlock.contract.md
- ✅ specs/timer-runtime-fixes/tasks.md (25 tasks, 12 parallel)

**Ready for**: Phase 4 implementation - Execute tasks T001-T025

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
