
# Implementation Plan: Enhanced JIT Compiler Demo Visualization

**Branch**: `003-update-jit-compiler` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-update-jit-compiler/spec.md`

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
Enhance the JIT Compiler Demo story to provide a unified visualization of the WOD Wiki compilation pipeline. Remove debug harness features while retaining memory allocations and runtime stack visualizations. Add fragment visualization from parser stories, extracting shared components for reuse. Implement a Controls panel with toggles to enable/disable each visualization panel (fragments, runtime stack, memory), arranged vertically. Update visualizations in response to editor update events with highlight interactions completing within 50-100ms.

## Technical Context
**Language/Version**: TypeScript (React components)  
**Primary Dependencies**: React, Storybook, Tailwind CSS, Chevrotain parser, Monaco Editor  
**Storage**: N/A (in-memory state only, session persistence for toggle states)  
**Testing**: Vitest (unit tests), Storybook interaction tests  
**Target Platform**: Web browser (Storybook development environment)
**Project Type**: Single (React component library with Storybook stories)  
**Performance Goals**: Highlight transitions <100ms, editor update parsing <200ms, smooth scrolling for long fragment lists  
**Constraints**: Component reusability (extract shared fragment visualization), no debug harness features, vertical panel layout  
**Scale/Scope**: Single JIT Compiler Demo story, 3 visualization panels, ~10 fragment types, integration with existing Parser.tsx and JitCompilerDemo.tsx

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Tests-First and Continuous Verification
- ✅ **Status**: PASS - Will write Storybook interaction tests for Controls panel toggles, fragment visualization updates on editor events, and highlight interactions
- **Plan**: Create failing interaction tests before implementing toggle behavior, fragment parsing updates, and hover highlighting

### II. Language-as-Contract (WodScript Stability)
- ✅ **Status**: PASS - No changes to WodScript grammar, tokens, or semantics
- **Plan**: Feature is visualization-only, consuming existing parser output without modifying language contracts

### III. Deterministic Runtime and Time Control
- ✅ **Status**: PASS - Highlight timing (50-100ms) will use CSS transitions (deterministic), editor updates are event-driven (deterministic)
- **Plan**: No implicit time dependencies; all state changes triggered by explicit events (editor updates, hover interactions)

### IV. Observability and Debuggability
- ✅ **Status**: PASS - Feature enhances observability by adding fragment visualization to existing runtime/memory views
- **Plan**: Visualization itself is a developer tool for understanding compilation pipeline; error states clearly displayed on parse failures

### V. API Surface, SemVer, and Simplicity
- ✅ **Status**: PASS - Extracting shared fragment components is additive (Minor version), no breaking changes
- **Plan**: New shared components exported from `src/components/fragments/` (or similar), existing stories updated to import from shared location

**Initial Assessment**: All constitutional principles satisfied. Feature is additive visualization enhancement with no breaking changes.

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

**Structure Decision**: Option 1 (Single project) - React component library with Storybook stories. Components in `src/`, stories in `stories/`, tests in `tests/` or co-located with components.

## Phase 0: Outline & Research ✅ COMPLETE

**Research Areas Addressed**:
1. Component extraction strategy (FragmentVisualizer, color maps)
2. Controls panel implementation pattern (Storybook args + sessionStorage)
3. Editor update event handling (Monaco onDidChangeModelContent)
4. Highlight interaction performance (CSS transitions + React state)
5. Error state display strategy (structured errors, clear fragments)

**Key Findings**:
- No new dependencies required (React, Tailwind, Monaco, Storybook already available)
- Extract to `src/components/fragments/` for reusability
- Use Storybook native Controls panel with boolean args for toggles
- CSS transitions with 50-100ms duration meet performance requirements
- Monaco `onDidChangeModelContent` provides real-time editor updates

**Output**: ✅ research.md complete with all decisions documented

## Phase 1: Design & Contracts ✅ COMPLETE

**Entities Defined** (data-model.md):
1. VisualizationPanelState - Toggle visibility state management
2. FragmentVisualizationData - Parsed fragments for display
3. ParseError - Structured error information
4. HighlightState - Cross-panel hover interaction state
5. FragmentColorMap - Color coding configuration

**Component Contracts Created** (contracts/component-contracts.md):
1. FragmentVisualizer component interface and props
2. fragmentColorMap utility function and types
3. ParseError interface definition
4. Editor update event flow contracts
5. Hover interaction event flow contracts
6. Testing contracts (unit and integration)

**Integration Tests Defined**: Quickstart test scenarios covering all 29 functional requirements from spec

**Agent Context Updated**: ✅ GitHub Copilot instructions updated with TypeScript, React, Storybook context

**Output**: ✅ data-model.md, contracts/component-contracts.md, quickstart.md, .github/copilot-instructions.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Extraction tasks** (from Parser.tsx to shared components):
   - Extract fragmentColorMap → shared utility [P]
   - Extract FragmentVisualizer → shared component [P]
   - Create barrel exports in src/components/fragments/index.ts [P]

2. **Test tasks** (TDD - tests before implementation):
   - Unit test: fragmentColorMap utility (all types + fallback) [P]
   - Component test: FragmentVisualizer rendering [P]
   - Component test: FragmentVisualizer error state [P]
   - Interaction test: Controls panel toggles
   - Interaction test: Editor update triggers fragment parse
   - Interaction test: Hover highlighting (runtime → memory)
   - Interaction test: Hover highlighting (memory → runtime)

3. **Refactoring tasks** (update consumers):
   - Update Parser.tsx to import shared components
   - Verify Parser story still works (no regression)

4. **Implementation tasks** (JitCompilerDemo enhancements):
   - Remove debug harness UI sections
   - Add Controls panel integration (Storybook args)
   - Integrate FragmentVisualizer component
   - Wire editor onDidChangeModelContent event
   - Implement VisualizationPanelState with sessionStorage
   - Implement HighlightState management
   - Add CSS transitions for highlight interactions (50-100ms)
   - Implement parse error handling and display

5. **Integration tasks**:
   - Manual quickstart validation (all 11 scenarios)
   - Performance validation (highlight timing, parse speed)

**Ordering Strategy**:
1. Extraction + tests (parallel, independent files)
2. Parser.tsx refactoring (depends on extraction)
3. JitCompilerDemo tests (can start after extraction)
4. JitCompilerDemo implementation (depends on tests existing)
5. Integration validation (depends on all implementation)

**Estimated Output**: ~20-25 numbered, ordered tasks in tasks.md

**TDD Emphasis**: All tests written before implementation (tests fail → implement → tests pass)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations identified.** All constitutional principles satisfied:
- Tests-first approach planned (Vitest + Storybook interaction tests)
- No language contract changes (visualization-only feature)
- Deterministic behavior (event-driven, CSS transitions)
- Enhanced observability (fragment visualization addition)
- Additive API surface (new shared components, no breaking changes)


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md created
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning approach described (/plan command) - ✅ Strategy outlined, ready for /tasks

**Execution Flow Progress**:
- [x] Step 1: Feature spec loaded from `specs/003-update-jit-compiler/spec.md`
- [x] Step 2: Technical Context filled (TypeScript, React, Storybook)
- [x] Step 3: Constitution Check completed (all principles satisfied)
- [x] Step 4: Initial Constitution Check passed (no violations)
- [x] Step 5: Phase 0 executed → research.md created
- [x] Step 6: Phase 1 executed → data-model.md, contracts/, quickstart.md, .github/copilot-instructions.md updated
- [x] Step 7: Post-Design Constitution Check passed (no new violations)
- [x] Step 8: Phase 2 approach described (task generation strategy defined)
- [x] Step 9: STOP - Ready for /tasks command ✅

**Next Command**: `/tasks` to generate tasks.md from this plan
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
