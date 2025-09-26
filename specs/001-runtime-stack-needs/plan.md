
# Implementation Plan: Runtime Stack Enhancement

**Branch**: `001-runtime-stack-needs` | **Date**: September 26, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-runtime-stack-needs/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
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
Enhance the RuntimeStack class to support proper lifecycle management of IRuntimeBlock objects with initialization before push operations and cleanup after pop operations. The implementation must preserve the existing interface while adding the required initialization/cleanup hooks and maintaining the graph() method for ordered stack visualization.

## Technical Context
**Language/Version**: TypeScript 5.x with React 18+  
**Primary Dependencies**: React, Vitest (testing), Storybook (component development), Chevrotain (parser)  
**Storage**: In-memory runtime state management, no persistent storage  
**Testing**: Vitest for unit tests, Storybook interaction tests for component validation  
**Target Platform**: Web browsers (ES2020+), Node.js development environment  
**Project Type**: Single project - React component library  
**Performance Goals**: Deterministic runtime execution, <50ms stack operations for workout timing accuracy  
**Constraints**: Breaking changes allowed, preserve deterministic behavior for workout execution  
**Scale/Scope**: Stack depth typically 5-20 levels for nested workout blocks, sub-millisecond operation timing

**User Implementation Details**: No backward compatibility required. Initialize happens in constructor. Cleanup is now `dispose()` method that consumers must call after pop operations.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Tests-First and Continuous Verification**: ✅ PASS
- Plan includes unit tests for RuntimeStack lifecycle methods
- Storybook interaction tests for runtime behavior validation
- TDD approach: tests written before implementation

**II. Language-as-Contract (WodScript Stability)**: ✅ PASS  
- Changes are internal to runtime implementation
- No breaking changes to WodScript grammar or semantics
- Existing RuntimeStack interface preserved for backward compatibility

**III. Deterministic Runtime and Time Control**: ✅ PASS
- Stack operations maintain deterministic behavior
- No system time dependencies in stack management
- State transitions remain explicit and observable

**IV. Observability and Debuggability**: ✅ PASS
- Existing console logging preserved and enhanced
- Clear error messages for initialization/cleanup failures
- Stack state remains inspectable through existing methods

**V. API Surface, SemVer, and Simplicity**: ✅ PASS
- Breaking changes allowed for this enhancement
- Major version increment required (breaking API changes)
- Maintains small, composable API surface with clearer responsibilities

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
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - React component library with existing src/ structure

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
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
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
- IRuntimeBlock interface enhancement → interface update task [P]
- RuntimeStack lifecycle methods → implementation task
- Each contract test scenario → unit test task [P] 
- Integration scenarios → integration test task [P]
- Storybook demonstration → story creation task [P]
- Performance validation → benchmark test task [P]

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependencies: Interface updates → Tests → Implementation → Stories
- Parallel execution: Independent test files marked [P]
- Sequential: Core implementation depends on interface updates

**RuntimeStack-Specific Tasks**:
1. **Interface Tasks**: Update IRuntimeBlock with required dispose() method
2. **Test Tasks**: Unit tests for simplified push/pop operations, dispose patterns, performance
3. **Implementation Tasks**: Simplify RuntimeStack push/pop methods (remove lifecycle calls)  
4. **Consumer Update Tasks**: Update all existing IRuntimeBlock implementations with dispose()
5. **Integration Tasks**: Consumer-managed lifecycle validation tests
6. **Documentation Tasks**: Update examples, Storybook stories, migration guide

**Estimated Output**: 18-22 numbered, ordered tasks in tasks.md (includes migration tasks)

**Key Dependencies**:
- IRuntimeBlock interface must be updated before any implementation changes
- All existing IRuntimeBlock implementations must be updated with dispose()
- Unit tests must exist before implementation (TDD)
- Consumer code must be updated to call dispose() after pop operations
- Migration testing required to ensure all usage patterns work correctly

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
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
