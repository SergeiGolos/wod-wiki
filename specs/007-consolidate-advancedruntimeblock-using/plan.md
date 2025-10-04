
# Implementation Plan: Consolidate AdvancedRuntimeBlock Using Stacked Behaviors

**Branch**: `007-consolidate-advancedruntimeblock-using` | **Date**: October 4, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `X:\wod-wiki\specs\007-consolidate-advancedruntimeblock-using\spec.md`

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
Remove the `AdvancedRuntimeBlock` inheritance hierarchy and reimagine its advanced functionality (sequential child execution, lazy JIT compilation, parent context awareness, and completion tracking) as composable behaviors using the existing `IRuntimeBehavior` interface. This consolidation will maintain 100% feature parity while providing enhanced composability, testability, and maintainability through a behavior-based architecture that eliminates inheritance coupling.

## Technical Context
**Language/Version**: TypeScript with strict mode enabled (React 18+ component library)  
**Primary Dependencies**: React, Chevrotain (parser), Monaco Editor, Vitest (testing), Storybook  
**Storage**: N/A (runtime execution engine, no persistence)  
**Testing**: Vitest for unit/integration tests, contract tests for behavior validation, performance benchmarks  
**Target Platform**: Browser-based runtime execution within React components  
**Project Type**: single (React component library with TypeScript)  
**Performance Goals**: next() < 5ms, push/pop < 1ms, dispose() < 50ms with full behavior stack  
**Constraints**: Zero behavioral regressions, 100% feature parity with AdvancedRuntimeBlock, immutable behaviors after construction  
**Scale/Scope**: 4 core behaviors (ChildAdvancement, LazyCompilation, ParentContext, CompletionTracking), migration of all AdvancedRuntimeBlock usage

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-First Architecture ✅
- Behaviors are reusable components of runtime functionality
- Self-contained, independently testable through unit tests
- Clear purpose: each behavior has single responsibility
- Well-defined interfaces through IRuntimeBehavior

### II. Storybook-Driven Development ✅
- Storybook stories will demonstrate behavior composition patterns
- Visual validation of runtime execution with different behavior combinations
- Interactive controls for testing behavior configurations
- Runtime stories updated to show behavior-based blocks

### III. Parser-First Domain Logic ✅ (Constitutional Exception Justified)
- **Exception Justification**: This feature is a pure runtime architecture refactoring that consolidates existing functionality without introducing new workout language features
- **No New Syntax**: AdvancedRuntimeBlock behaviors already exist; this feature only changes implementation approach from inheritance to composition
- **Parser System Unchanged**: All Chevrotain parser components, tokens, and visitor patterns remain exactly as they are
- **Constitutional Alignment**: This refactoring enhances maintainability of existing runtime system while preserving all current parsing behavior
- **Future Parser Features**: Any new syntax additions would still follow Parser-First Domain Logic principle as required

### IV. JIT Compiler Runtime ✅
- Behaviors integrate with existing JIT compiler
- LazyCompilationBehavior uses JIT for on-demand compilation
- Performance targets maintained (<5ms next(), <1ms push/pop, <50ms dispose)
- Explicit memory management through RuntimeBlock disposal patterns
- Constructor-based initialization preserved

### V. Monaco Editor Integration ✅ (N/A for this feature)
- No changes to Monaco Editor or syntax highlighting
- Editor integration unchanged (out of scope)

### Technology Standards ✅
- TypeScript mandatory for all behaviors
- React integration through Storybook demonstrations
- Vitest for unit and integration testing
- Performance requirements enforced through benchmarks
- Strict typing for all behavior interfaces and implementations

### Development Workflow ✅
- Storybook development for demonstrating behavior composition
- Unit testing for individual behaviors
- Integration testing for behavior combinations
- Performance testing to validate runtime targets
- Documentation updates in docs/ directory

**Initial Assessment**: ✅ PASS - No constitutional violations identified

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── runtime/
│   ├── RuntimeBlock.ts                      # Base block with behavior support (existing)
│   ├── AdvancedRuntimeBlock.ts              # To be deprecated and removed
│   ├── IAdvancedRuntimeBlock.ts             # To be removed
│   ├── IRuntimeBehavior.ts                  # Existing interface (no changes)
│   ├── behaviors/                           # NEW: Behavior implementations
│   │   ├── ChildAdvancementBehavior.ts      # Sequential child tracking
│   │   ├── LazyCompilationBehavior.ts       # On-demand JIT compilation
│   │   ├── ParentContextBehavior.ts         # Parent block awareness
│   │   └── CompletionTrackingBehavior.ts    # Execution completion tracking
│   ├── JitCompiler.ts                       # Existing JIT compiler (no changes)
│   └── ScriptRuntime.ts                     # Existing runtime (no changes)
├── fragments/                               # Existing parsed statement types
└── index.ts                                 # Library entry point (update exports)

tests/
├── unit/
│   └── behaviors/                           # NEW: Behavior unit tests
│       ├── ChildAdvancementBehavior.test.ts
│       ├── LazyCompilationBehavior.test.ts
│       ├── ParentContextBehavior.test.ts
│       └── CompletionTrackingBehavior.test.ts
├── integration/
│   └── runtime/
│       ├── behavior-composition.test.ts     # NEW: Multi-behavior integration
│       └── advanced-runtime-migration.test.ts # NEW: Migration validation
└── runtime/
    └── contract/
        └── behaviors/                       # NEW: Behavior contract tests
            └── behavior-stack.contract.ts

stories/
├── runtime/
│   ├── BehaviorComposition.stories.tsx      # NEW: Demonstrate behavior patterns
│   └── MigrationExamples.stories.tsx        # NEW: Before/after comparisons
└── workouts/                                # Update existing workout stories

docs/
└── behavior-based-architecture-consolidation.md  # Existing architecture doc
```

**Structure Decision**: Single project structure with new `src/runtime/behaviors/` directory for behavior implementations. Tests organized by type (unit/integration/contract) with dedicated behavior subdirectories. Storybook stories demonstrate behavior composition and migration patterns. Existing RuntimeBlock and IRuntimeBehavior infrastructure requires no changes.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each behavior (4 total) → behavior implementation task + unit test task
- Contract tests for each behavior lifecycle method → contract test tasks [P]
- Integration tests for behavior composition → integration test tasks
- Performance benchmarks → benchmark test tasks
- Storybook stories for demonstrations → story creation tasks
- Migration tasks for replacing AdvancedRuntimeBlock usage
- Cleanup tasks for deprecation and removal

**Ordering Strategy**:
- TDD order: Contract tests → Unit tests → Implementation → Integration tests
- Dependency order: Behaviors before composition, composition before migration
- Parallel tasks marked [P]:
  - Individual behavior implementations (independent)
  - Individual behavior unit tests (independent)
  - Contract test files (independent)
- Sequential tasks:
  - Integration tests (require all behaviors complete)
  - Migration (requires full validation)
  - Cleanup (requires migration complete)

**Task Categories**:
1. **Contract Tests** (Phase 0): 6 tasks [P] - All contract test files
2. **Behavior Implementation** (Phase 1): 8 tasks - 4 behaviors + 4 unit test suites
3. **Integration Testing** (Phase 2): 4 tasks - Composition, feature parity, performance
4. **Storybook Stories** (Phase 3): 3 tasks - Behavior demos, migration examples
5. **Migration** (Phase 4): 5 tasks - Replace usage, deprecation, cleanup
6. **Documentation** (Phase 5): 2 tasks - Update docs, validate links

**Estimated Output**: 28-32 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No constitutional violations identified** - This feature aligns with all constitutional principles:
- Component-first architecture through behavior components
- Storybook-driven development for demonstrations
- JIT compiler runtime integration maintained
- TypeScript strict mode with comprehensive typing
- Performance requirements enforced

**Complexity Justification**: N/A - No deviations from constitutional principles


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 32 tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All principles aligned
- [x] Post-Design Constitution Check: PASS - No violations in design
- [x] All NEEDS CLARIFICATION resolved - Clarifications documented in spec Session 2025-10-04
- [x] Complexity deviations documented - None required (N/A)

**Artifacts Generated**:
- ✅ `research.md` - 8 research areas with decisions and rationale
- ✅ `data-model.md` - 4 behavior entities with relationships and composition patterns
- ✅ `contracts/behavior-lifecycle.contract.md` - Complete lifecycle contract specifications
- ✅ `quickstart.md` - Step-by-step usage guide with 5 scenarios and troubleshooting
- ✅ `CLAUDE.md` - Updated with TypeScript, React, and runtime context
- ✅ `tasks.md` - 32 dependency-ordered tasks with 19 parallel execution opportunities

**Next Step**: Begin Phase 4 implementation starting with T001 (setup tasks)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
