
# Implementation Plan: JIT Compiler Strategy Implementation and Runtime Block Advancement

**Branch**: `009-jit-compiler-strategy` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `X:\wod-wiki\specs\009-jit-compiler-strategy\spec.md`

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
The WOD Wiki JIT compiler currently fails to advance beyond the root block when executing workout scripts in the demo interface. The system displays only generic "Runtime (Idle)" blocks instead of specialized block types (timer blocks, rounds blocks, effort blocks). This implementation plan addresses three core deficiencies: (1) improper strategy matching logic where EffortStrategy unconditionally matches all statements, preventing type-specific compilation, (2) missing fragment-based pattern recognition to identify timer/rounds/effort workout structures, and (3) incomplete behavior propagation preventing recursive child compilation. The technical approach implements fragment-based strategy matching with proper precedence ordering (TimerStrategy → RoundsStrategy → EffortStrategy), adds block type metadata for UI discrimination, and ensures compiled child blocks receive advancement and lazy compilation behaviors to enable the full JIT execution cascade.

## Technical Context
**Language/Version**: TypeScript (strict mode enabled), React 18+ with functional components and hooks  
**Primary Dependencies**: Chevrotain (parser), Monaco Editor (syntax highlighting), Tailwind CSS (styling), Vitest (unit testing), Storybook (component development)  
**Storage**: N/A (in-memory runtime execution only)  
**Testing**: Vitest for unit tests (~2-3 seconds execution), Storybook for component validation, integration tests for end-to-end workflow  
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge) via Storybook development server on http://localhost:6006  
**Project Type**: Single project (React component library with TypeScript)  
**Performance Goals**: JIT compilation < 1ms for typical workout scripts, push/pop stack operations < 1ms, UI responsiveness < 100ms perceived latency (no specific targets required for demo validation)  
**Constraints**: Must follow Parser-First Domain Logic (constitution principle III), maintain existing 369 TypeScript errors baseline, no ESLint configuration present, strict constructor-based initialization patterns for runtime blocks  
**Scale/Scope**: Demo validation interface for ~10 workout example stories (AMRAP, For Time, EMOM, Tabata), strategy registry supporting 3-5 specialized strategies, runtime stack depth limited only by memory constraints

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Component-First Architecture ✅
- JIT compiler strategies are reusable components with clear single responsibility
- Strategy interface (IRuntimeBlockStrategy) provides well-defined contract
- No organizational-only components introduced
- Library-first approach maintained through strategy composition pattern

### Storybook-Driven Development ✅
- Changes validated in existing JitCompilerDemo stories before integration
- Component state variations already captured in compiler/*.stories.tsx
- Interactive controls available for testing strategy behavior
- Visual regression validation through "Next Block" button interactions

### Parser-First Domain Logic ✅ (NON-NEGOTIABLE)
- NO parser changes required - fragment types already defined in CodeFragment.ts
- FragmentType enum exists with Timer, Rounds, Effort values
- This feature works with existing parsed statements (ICodeStatement with fragments)
- Strategy matching uses existing fragment properties without modifying parser

### JIT Compiler Runtime ✅
- Follows constructor-based initialization pattern for runtime blocks
- Strategy.compile() returns IRuntimeBlock instances with explicit behaviors
- Performance targets met (<1ms compilation, <1ms stack operations)
- Memory management through explicit behavior composition (no implicit disposal needed for strategies)

### Monaco Editor Integration ✅
- NO editor changes required - feature focuses on runtime compilation only
- Existing syntax highlighting unaffected
- Parser errors already properly propagated
- No impact on auto-completion or diagnostics

**Constitution Compliance**: PASS - All five core principles satisfied. No violations to document.

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
│   ├── JitCompiler.ts              # Strategy registry and compilation orchestration
│   ├── IRuntimeBlockStrategy.ts    # Strategy interface contract
│   ├── strategies.ts               # Strategy implementations (EffortStrategy, TimerStrategy, RoundsStrategy)
│   ├── RuntimeBlock.ts             # Base runtime block implementation
│   ├── IRuntimeBlock.ts            # Runtime block interface with type metadata
│   └── behaviors/
│       ├── ChildAdvancementBehavior.ts   # Child index tracking
│       └── LazyCompilationBehavior.ts    # JIT child compilation
├── CodeFragment.ts                 # ICodeFragment interface and FragmentType enum
├── CodeStatement.ts                # ICodeStatement interface with fragments array
└── index.ts                        # Public API exports

stories/
├── compiler/
│   ├── JitCompilerDemo.tsx         # Demo interface with "Next Block" button
│   ├── JitCompilerDemo.stories.tsx # Storybook story definitions
│   └── CompactRuntimeBlockDisplay.tsx  # Stack visualization component
└── workouts/                       # Example workout stories for validation
    ├── Amrap.stories.tsx           # AMRAP examples
    ├── ForTime.stories.tsx         # For Time examples
    ├── Emom.stories.tsx            # EMOM examples
    └── Tabata.stories.tsx          # Tabata examples

tests/
├── unit/
│   └── runtime/
│       ├── JitCompiler.test.ts     # Strategy matching and precedence tests
│       ├── strategies.test.ts      # Individual strategy behavior tests
│       └── behaviors.test.ts       # Behavior composition tests
├── integration/
│   └── jit-compilation-flow.test.ts # End-to-end compilation cascade tests
└── stories/
    └── JitCompilerDemo.test.tsx    # Demo interface interaction tests
```

**Structure Decision**: Single project structure (Option 1). This is a React component library feature focused on runtime compilation logic. All changes confined to existing `src/runtime/` directory for strategy implementations, `stories/compiler/` for demo validation, and corresponding test files in `tests/`. No new top-level directories required. Follows established component-first architecture with TypeScript strict mode.

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
- Three contract specifications generate six test files (3 contracts × 2 test suites each)
- Strategy implementations follow TDD: test first, then implementation
- UI updates for block type display after core logic complete

**Contract-to-Task Mapping**:
1. **Strategy Matching Contract** (SMC-001) → Create `tests/unit/runtime/strategies.test.ts` with 9 test scenarios [P]
2. **Block Compilation Contract** (BCC-001) → Create `tests/unit/runtime/block-compilation.test.ts` with 9 test scenarios [P]
3. **Strategy Precedence Contract** (SPC-001) → Create `tests/integration/jit-compiler-precedence.test.ts` with 9 test scenarios [P]

**Implementation Task Sequence**:
1. Fix `EffortStrategy.match()` to check fragments (makes TSC-005, TSC-006, TSC-007 pass)
2. Implement `TimerStrategy` class with fragment-based matching (makes TSC-001, TSC-002 pass)
3. Implement `RoundsStrategy` class with fragment-based matching (makes TSC-003, TSC-004 pass)
4. Add behavior propagation to all strategies (makes TBC-004, TBC-005, TBC-006 pass)
5. Add `blockType` metadata to `IRuntimeBlock` interface (makes TBC-001, TBC-002, TBC-003 pass)
6. Update strategy `compile()` methods to pass blockType (makes all TBC tests pass)
7. Update `JitCompilerDemo` strategy registration order (makes TSP-001, TSP-002, TSP-003 pass)
8. Add console logging for strategy matching diagnostics (supports troubleshooting)
9. Update `CompactRuntimeBlockDisplay` to show block.blockType (makes AS-007 pass)
10. Validate with quickstart scenarios in Storybook (final integration check)

**Ordering Strategy**:
- **TDD order**: All test files created before implementation (tasks 1-3 before 4-10)
- **Dependency order**: Core strategy fixes → new strategies → behaviors → metadata → UI
- **Parallel execution**: Test files marked [P] (independent, can run concurrently)
- **Sequential execution**: Implementation tasks run in order (each depends on previous)

**Estimated Output**: 
- **Test tasks**: 3 contract test files (27 total test scenarios)
- **Implementation tasks**: 10 ordered tasks following TDD cycle
- **Validation tasks**: 6 quickstart scenarios + 2 test suite runs
- **Total**: ~21 tasks in tasks.md

**File Impact Summary**:
- **New files**: 3 test files, 0 source files (TimerStrategy, RoundsStrategy added to existing strategies.ts)
- **Modified files**: 4 source files (strategies.ts, IRuntimeBlock.ts, JitCompilerDemo.tsx, CompactRuntimeBlockDisplay.tsx)
- **Contracts**: 3 specification files in contracts/ directory (already created)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**N/A** - No constitutional violations detected. All design decisions align with core principles:
- Component-First Architecture: Strategy pattern with reusable interfaces ✅
- Storybook-Driven Development: Validation through existing JitCompilerDemo ✅
- Parser-First Domain Logic: No parser changes required (uses existing fragments) ✅
- JIT Compiler Runtime: Constructor-based initialization, performance targets met ✅
- Monaco Editor Integration: No editor changes required ✅


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - Strategy documented above
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md with 23 ordered tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All five core principles satisfied
- [x] Post-Design Constitution Check: PASS - No new violations after design phase
- [x] All NEEDS CLARIFICATION resolved - Feature spec clarifications section complete
- [x] Complexity deviations documented - N/A (no constitutional violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
