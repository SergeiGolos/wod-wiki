
# Implementation Plan: Proper Script Advancement for JIT Runtime Block Creation

**Branch**: `006-proper-advancement-of` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-proper-advancement-of/spec.md`

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
Implement proper advancement behavior in the JIT compiler and runtime stack to ensure runtime blocks are created just-in-time when parent elements call next(). The system must maintain strict sequential execution of children, validate script structure at parse time, and handle push/pop operations with explicit memory management. Key requirements: lazy block creation on parent.next(), sequential child execution, parse-time validation, memory reference cleanup on pop, and immediate halt on stack operation failures.

## Technical Context
**Language/Version**: TypeScript (strict mode enabled)  
**Primary Dependencies**: React 18+, Chevrotain parser, Vitest, Tailwind CSS  
**Storage**: N/A (in-memory runtime execution)  
**Testing**: Vitest for unit/integration tests, Storybook for component testing  
**Target Platform**: Web browsers (modern ES2020+ support)  
**Project Type**: Single project (React component library)  
**Performance Goals**: 
- Push/pop operations < 1ms
- JIT compilation < 5ms per block
- Block disposal < 50ms
- Parse-time validation < 100ms for typical scripts
**Constraints**: 
- Memory management must be explicit (consumer-managed disposal)
- No automatic garbage collection assumptions
- Stack operations must maintain O(1) complexity
- Timer events handled by in-memory event handlers
**Scale/Scope**: 
- Typical workout scripts: 10-50 nested elements
- Maximum nesting depth: 10 levels
- Concurrent timers: Up to 20 active event handlers

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Phase 0) ✅
- ✅ **Component-First Architecture**: Runtime stack and JIT compiler are existing components; advancement logic enhances existing RuntimeStack/JitCompiler interfaces
- ✅ **Storybook-Driven Development**: Runtime behavior will be demonstrated in Storybook stories showing advancement scenarios
- ✅ **Parser-First Domain Logic**: Parse-time validation aligns with parser-first approach; script structure validation occurs during parsing phase
- ✅ **JIT Compiler Runtime**: Feature directly enhances JIT compilation with lazy block creation; maintains constructor-based initialization and consumer-managed disposal patterns
- ✅ **Monaco Editor Integration**: No editor changes required; advancement is runtime-only feature
- ✅ **TypeScript Standards**: Strict mode enabled, all interfaces properly typed
- ✅ **Performance Requirements**: Explicit targets defined (<1ms push/pop, <50ms disposal, <5ms JIT compilation)
- ✅ **Code Quality**: Following existing patterns in IRuntimeBlock, RuntimeStack, JitCompiler

**Status**: PASS - All constitutional principles aligned

### Post-Design Check (After Phase 1) ✅
- ✅ **No new violations introduced**
- ✅ **Design follows existing patterns**: IAdvancedRuntimeBlock extends IRuntimeBlock naturally
- ✅ **Contracts are TypeScript-first**: All contracts use strict TypeScript interfaces
- ✅ **Performance targets measurable**: Specific metrics defined (<1ms, <5ms, <50ms, <100ms)
- ✅ **Validation aligns with parser-first**: Parse-time validation rules in visitor pattern
- ✅ **Consumer-managed disposal preserved**: dispose() remains consumer responsibility
- ✅ **No architectural complexity added**: Enhances existing components, no new layers

**Status**: PASS - Design maintains constitutional compliance

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
│   ├── IRuntimeBlock.ts           # Interface defining push/next/pop/dispose
│   ├── IRuntimeAction.ts          # Actions returned by block methods
│   ├── RuntimeStack.ts            # Stack managing push/pop operations
│   ├── JitCompiler.ts             # Compiles statements to runtime blocks
│   ├── ScriptRuntime.ts           # Main runtime coordinating execution
│   ├── NextAction.ts              # Action for advancing to next block
│   ├── NextEvent.ts               # Event triggered on advancement
│   ├── NextEventHandler.ts        # Handles next events
│   └── strategies.ts              # Block compilation strategies
├── parser/
│   └── timer.visitor.ts           # Parser visitor (validation logic)
└── CodeStatement.ts               # Script item representation

tests/
├── runtime/
│   ├── RuntimeStack.unit.test.ts
│   ├── RuntimeStack.integration.test.ts
│   ├── RuntimeStack.perf.test.ts
│   └── RuntimeStack.edge-cases.test.ts
└── integration/
    └── advancement-scenarios.test.ts

stories/
└── runtime/
    ├── AdvancementBehavior.stories.tsx
    └── StackOperations.stories.tsx
```

**Structure Decision**: Single project structure. All runtime logic resides in `src/runtime/` with existing interfaces (IRuntimeBlock, RuntimeStack, JitCompiler). Tests follow existing patterns with unit, integration, performance, and edge case coverage. Storybook stories demonstrate runtime advancement behaviors visually.

## Phase 0: Outline & Research ✅
1. **Extract unknowns from Technical Context**: All clarified in spec.md Session 2025-10-04
   - Error feedback mechanism: Combined logging + exceptions
   - Execution model: Strictly sequential children
   - Validation timing: Parse time
   - Resource cleanup: Memory references only
   - Failure handling: Immediate halt

2. **Research key architectural decisions**:
   - Lazy block creation strategy (on parent.next())
   - Advancement state tracking (cursor-based)
   - Parse-time validation rules (3-phase checks)
   - Stack failure handling (immediate halt with logging)
   - Memory cleanup patterns (consumer-managed disposal)
   - Timer event integration (event-driven with NextEventHandler)

3. **Consolidate findings**: See research.md

**Output**: ✅ research.md complete with 6 research questions answered and technology decisions documented

## Phase 1: Design & Contracts ✅
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`: ✅
   - CodeStatement (existing, enhanced with children tracking)
   - RuntimeBlock (enhanced with currentChildIndex, parentContext, isComplete)
   - RuntimeStack (existing, enhanced validation)
   - NextAction (existing, used for lazy compilation)
   - AdvancementState (conceptual state machine)

2. **Generate API contracts**: ✅
   - IAdvancedRuntimeBlock.contract.ts - Enhanced block interface
   - IValidationRule.contract.ts - Parse-time validation
   - IStackValidator.contract.ts - Runtime stack validation
   - contracts/README.md - Documentation

3. **Define test scenarios**: ✅
   - Contract test scenarios documented inline
   - Validation rules: circular refs, depth, timers
   - Stack operations: push/pop validation, overflow
   - Performance targets: <1ms push/pop, <5ms compile, <50ms dispose

4. **Extract test scenarios** from user stories: ✅
   - quickstart.md with 8 progressive test phases
   - Each phase validates one aspect of advancement
   - End-to-end scenario included
   - Success criteria and troubleshooting included

5. **Update agent file**: ✅
   - Updated .github/copilot-instructions.md
   - Added TypeScript, React, Chevrotain context
   - Preserved existing constitutional principles
   - Added feature-specific performance targets

**Output**: ✅ data-model.md, /contracts/* (3 contract files + README), quickstart.md, .github/copilot-instructions.md updated

## Phase 2: Task Planning Approach ✅
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Follow TDD: Write tests before implementation
- Group by component: Validation → Stack → JIT → Runtime → Integration

**Planned Task Groups**:
1. **Parse-Time Validation** (3-4 tasks)
   - Implement IValidationRule interface [P]
   - Create CircularReferenceValidator [P]
   - Create NestingDepthValidator [P]
   - Create TimerEventValidator [P]
   - Add validation to timer.visitor.ts

2. **Enhanced RuntimeBlock** (4-5 tasks)
   - Update IRuntimeBlock interface with new properties
   - Implement currentChildIndex tracking
   - Implement parentContext tracking
   - Implement lazy next() compilation
   - Implement dispose() cleanup

3. **Stack Operations** (3-4 tasks)
   - Implement IStackValidator interface
   - Add validation to RuntimeStack.push()
   - Add validation to RuntimeStack.pop()
   - Add error handling and logging

4. **JIT Compilation** (2-3 tasks)
   - Update strategies for lazy compilation
   - Implement on-demand compilation from next()
   - Update JitCompiler tests

5. **ScriptRuntime Integration** (2-3 tasks)
   - Add disposal logic after pop
   - Handle NextAction processing
   - Add error handling and logging

6. **Testing & Validation** (6-8 tasks)
   - Contract tests (3 files) [P]
   - Unit tests for validation [P]
   - Unit tests for stack operations [P]
   - Integration tests for advancement scenarios
   - Performance tests for targets
   - Edge case tests for error handling

7. **Storybook Stories** (2-3 tasks)
   - Create AdvancementBehavior.stories.tsx
   - Create StackOperations.stories.tsx
   - Demonstrate all scenarios visually

**Ordering Strategy**:
- Phase 1: Validation (independent, can run [P])
- Phase 2: Stack operations (depends on validation)
- Phase 3: Block enhancements (depends on stack)
- Phase 4: JIT updates (depends on blocks)
- Phase 5: Runtime integration (depends on all above)
- Phase 6: Testing (depends on implementation)
- Phase 7: Storybook (depends on working features)

**Estimated Output**: 25-30 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No constitutional violations** - This feature enhances existing components following established patterns. No additional complexity introduced.


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md created
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ 7 task groups defined, 25-30 tasks estimated
- [x] Phase 3: Tasks generated (/tasks command) - ✅ tasks.md with 29 ordered tasks created
- [ ] Phase 4: Implementation complete - **READY TO START**
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅ (5 clarifications in spec.md)
- [x] Complexity deviations documented ✅ (None - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
