
# Implementation Plan: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock

**Branch**: `011-runtime-block-implementation` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-runtime-block-implementation/spec.md`

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
Implement three specialized RuntimeBlock classes (TimerBlock, RoundsBlock, EffortBlock) and supporting behaviors (TimerBehavior, RoundsBehavior, CompletionBehavior) to enable execution of CrossFit workout types including AMRAP (countdown timers), For Time (count-up timers), and variable rep schemes (21-15-9). Design follows existing behavior-based composition architecture with event-driven completion and advancement. Supports hybrid rep tracking (incremental tap or bulk entry), pause/resume within session, timer precision at 0.1s display with sub-second internal tracking, and memory-only state management (no cross-session persistence).

## Technical Context
**Language/Version**: TypeScript (strict mode), React 18+  
**Primary Dependencies**: Chevrotain (parser), Monaco Editor, Tailwind CSS, Vitest, Storybook  
**Storage**: Memory-only (no persistence across sessions per FR-005c)  
**Testing**: Vitest for unit tests, Storybook for component tests, Playwright for E2E  
**Target Platform**: Web browsers (ES2020+)
**Project Type**: Single (component library)  
**Performance Goals**: Push/pop operations <1ms, dispose() <50ms, timer tick <16ms for smooth UI, JIT compilation <100ms for typical workout scripts  
**Constraints**: Sub-second timer precision internally with 0.1s display resolution, no cross-session persistence, <100ms UI response latency, proper memory disposal patterns  
**Scale/Scope**: Support 7+ named workout types (Fran, Cindy, Mary, Grace, Barbara, Nancy, Helen), 3 block types, 3+ behavior types, comprehensive Storybook stories per workout type

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-First Architecture ✅
- TimerBlock, RoundsBlock, EffortBlock are self-contained runtime components
- Each block follows behavior composition pattern (existing architecture)
- All blocks will have comprehensive Storybook stories showing state variations
- Clear purpose: execution of workout segments with specific timing/round/rep logic

### II. Storybook-Driven Development ✅
- Each block type will have dedicated Storybook stories
- State variations: countdown/count-up timers, different round counts, variable reps
- Interactive controls for testing pause/resume, rep completion modes
- Stories planned: Default timer, AMRAP countdown, For Time count-up, variable rep schemes

### III. Parser-First Domain Logic ✅
- Feature does NOT add new syntax (runtime execution only)
- Leverages existing parser output (workout AST already defined)
- No token/parser changes required - pure runtime implementation
- Blocks consume parsed workout structures from existing JIT compiler

### IV. JIT Compiler Runtime ✅
- Follows existing JIT compilation pattern in src/runtime/JitCompiler.ts
- Constructor-based initialization for all blocks (new TimerBlock(), etc.)
- Explicit disposal patterns required (dispose() method for timer cleanup)
- Performance targets aligned: push/pop <1ms, dispose() <50ms
- Memory management explicit: clear intervals, release references

### V. Monaco Editor Integration ⚠️
- Feature does NOT modify editor (runtime execution only)
- Existing syntax highlighting unchanged
- No semantic token changes required
- Future: Could add real-time execution state display in editor margin (deferred)

**Initial Assessment**: ✅ PASS - All constitutional principles satisfied for runtime-focused feature

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
│   ├── blocks/                 # NEW: Concrete block implementations
│   │   ├── TimerBlock.ts      # Time-based workout segments
│   │   ├── RoundsBlock.ts     # Multi-round workout segments
│   │   └── EffortBlock.ts     # Single exercise/movement blocks
│   ├── behaviors/              # NEW: Supporting behaviors
│   │   ├── TimerBehavior.ts   # Timer management (count up/down)
│   │   ├── RoundsBehavior.ts  # Round tracking + variable reps
│   │   └── CompletionBehavior.ts # Generic completion detection
│   ├── JitCompiler.ts          # MODIFY: Add block compilation logic
│   ├── ScriptRuntime.ts        # EXISTING: Runtime execution engine
│   └── RuntimeBlock.ts         # EXISTING: Base block interface

stories/
├── runtime/
│   ├── TimerBlock.stories.tsx      # NEW: Timer demonstrations
│   ├── RoundsBlock.stories.tsx     # NEW: Round tracking demos
│   └── EffortBlock.stories.tsx     # NEW: Rep tracking demos
└── workouts/
    ├── Fran.stories.tsx            # NEW: 21-15-9 For Time
    ├── Cindy.stories.tsx           # NEW: AMRAP countdown
    ├── Mary.stories.tsx            # NEW: AMRAP variant
    ├── Grace.stories.tsx           # NEW: Single effort For Time
    ├── Barbara.stories.tsx         # NEW: Fixed rounds
    ├── Nancy.stories.tsx           # NEW: Fixed rounds variant
    └── Helen.stories.tsx           # NEW: Fixed rounds variant

tests/
├── unit/
│   └── runtime/
│       ├── TimerBlock.test.ts      # NEW: Timer block tests
│       ├── RoundsBlock.test.ts     # NEW: Rounds block tests
│       ├── EffortBlock.test.ts     # NEW: Effort block tests
│       ├── TimerBehavior.test.ts   # NEW: Timer behavior tests
│       ├── RoundsBehavior.test.ts  # NEW: Rounds behavior tests
│       └── CompletionBehavior.test.ts # NEW: Completion tests
└── integration/
    └── runtime/
        └── workout-execution.test.ts # NEW: End-to-end workout tests
```

**Structure Decision**: Single project (component library). All new runtime blocks, behaviors, and stories fit within existing `src/` structure. Using established patterns: blocks in `src/runtime/blocks/`, behaviors in `src/runtime/behaviors/`, stories in `stories/runtime/` and `stories/workouts/`, tests mirror source structure.

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

### A. Foundation Tasks (Test Infrastructure)
1. Create test utilities for runtime blocks (mock runtime, mock behaviors)
2. Create test utilities for timer testing (mock performance.now, time control)
3. Create test utilities for event validation

### B. Behavior Implementation (TDD Approach)
For each behavior (TimerBehavior, RoundsBehavior, CompletionBehavior):
1. Write behavior contract tests (from contracts/runtime-blocks-api.md) [FAIL]
2. Implement behavior class (src/runtime/behaviors/) [PASS]
3. Write behavior unit tests [PASS]

**Ordering**: Behaviors can be developed in parallel [P]

### C. Block Implementation (TDD Approach)
For each block (TimerBlock, RoundsBlock, EffortBlock):
1. Write block contract tests (from contracts/runtime-blocks-api.md) [FAIL]
2. Implement block class (src/runtime/blocks/) [PASS]
3. Write block unit tests [PASS]
4. Create Storybook story (stories/runtime/)
5. Validate story in Storybook

**Ordering**: EffortBlock first (no dependencies), then RoundsBlock, then TimerBlock

### D. JitCompiler Integration
1. Write compiler integration tests for new blocks [FAIL]
2. Extend JitCompiler with block compilation methods [PASS]
3. Add compilation context handling for variable reps [PASS]
4. Test compilation of nested block structures [PASS]

**Dependencies**: Requires all blocks implemented

### E. Complete Workout Stories (Integration Validation)
For each workout (Fran, Cindy, Mary, Grace, Barbara, Nancy, Helen):
1. Create workout Storybook story (stories/workouts/)
2. Implement UI controls for workout (if needed)
3. Validate against quickstart.md acceptance criteria

**Ordering**: Can be done in parallel [P] after JitCompiler integration

### F. Integration Tests
1. Write end-to-end workout execution tests (tests/integration/runtime/)
2. Test timer accuracy over duration
3. Test pause/resume state management
4. Test abandon behavior
5. Test memory cleanup (no leaks)

### G. Performance Validation
1. Add performance benchmarks for push/pop operations
2. Add performance benchmarks for dispose()
3. Add performance benchmarks for timer ticks
4. Validate against requirements (<1ms, <50ms, <16ms)

### H. Documentation Updates
1. Update runtime API docs (docs/runtime-api.md)
2. Add architecture diagrams for block composition
3. Update README with new workout examples

**Task Grouping**:
- **Critical Path**: B → C (EffortBlock) → C (RoundsBlock) → C (TimerBlock) → D → E
- **Parallel Streams**: 
  - Behaviors (B) can all be done in parallel
  - Workout stories (E) can all be done in parallel
  - Integration tests (F) can start after D completes

**Estimated Tasks**: 
- Foundation: 3 tasks
- Behaviors: 9 tasks (3 behaviors × 3 tasks each)
- Blocks: 15 tasks (3 blocks × 5 tasks each)
- JitCompiler: 4 tasks
- Workouts: 7 tasks (7 workouts)
- Integration: 5 tasks
- Performance: 4 tasks
- Documentation: 3 tasks

**Total**: ~50 tasks

**Estimated Completion**: 3-5 days (with parallel execution)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via /clarify session)
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
