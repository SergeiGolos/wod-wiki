
# Implementation Plan: Runtime Test Bench UI

**Branch**: `main` | **Date**: October 16, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `X:\wod-wiki\specs\main\spec.md`

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

Create a production-ready Runtime Test Bench UI by combining the clean visual design from the prototype (code.html) with proven functionality from JitCompilerDemo. This component-first implementation uses React functional components with TypeScript strict mode, provides a modular 6-panel architecture (Toolbar, Editor, Compilation, Runtime Stack, Memory, Status Footer), and integrates with the existing ScriptRuntime via an adapter pattern. The implementation follows Storybook-driven development with comprehensive stories for each panel, maintains backward compatibility through non-breaking integration, and meets WCAG 2.1 AA accessibility standards while fitting all functionality on a single screen (1920x1080).

## Technical Context
**Language/Version**: TypeScript 5+ (strict mode)  
**Primary Dependencies**: React 18+, Tailwind CSS 3+, Monaco Editor, Storybook 9+, Vitest, Chevrotain (parser)  
**Storage**: N/A (client-side only)  
**Testing**: Vitest (unit), Playwright (E2E), Storybook interaction tests  
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: single (React component library)  
**Performance Goals**: UI updates <50ms per step, supports 1000+ line scripts, handles 100+ memory entries smoothly  
**Constraints**: No breaking changes to ScriptRuntime/IRuntimeBlock; adapter pattern required; must fit single screen (1920x1080); WCAG 2.1 AA compliance  
**Scale/Scope**: 6 modular panels, 20+ TypeScript interfaces, 5 React hooks, ~15 React components, comprehensive Storybook coverage

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-First Architecture ✅
- **Status**: PASS
- **Justification**: Entire feature is 6 reusable React components (Toolbar, EditorPanel, CompilationPanel, RuntimeStackPanel, MemoryPanel, StatusFooter). Each component is self-contained with clear TypeScript interfaces, independently testable, and documented via Storybook stories. Main RuntimeTestBench component orchestrates composition.

### II. Storybook-Driven Development ✅
- **Status**: PASS
- **Justification**: All 6 panels will be developed in Storybook first with comprehensive stories. Each panel gets Default, WithData, Loading, Error states. Interactive controls for all props. Visual regression testing before integration. Follows template requirement for Storybook-first workflow.

### III. Parser-First Domain Logic ✅
- **Status**: PASS (N/A for this feature)
- **Justification**: This feature does NOT add new workout syntax. It visualizes existing parser output. All workout syntax already implemented in existing Chevrotain parser (src/parser/). No parser changes needed.

### IV. JIT Compiler Runtime ✅
- **Status**: PASS
- **Justification**: Feature integrates with existing ScriptRuntime via adapter pattern. No modifications to runtime blocks, JitCompiler, or disposal patterns. RuntimeAdapter converts ScriptRuntime state to ExecutionSnapshot for UI display. Performance target met: UI updates <50ms (well within runtime push/pop <1ms requirement).

### V. Monaco Editor Integration ✅
- **Status**: PASS
- **Justification**: Uses existing WodWiki Monaco editor component with syntax highlighting and error diagnostics. EditorPanel wraps existing integration, adds highlighting for active execution line. No changes to editor core functionality.

### Overall Assessment
**PASS** - All constitutional principles satisfied. No violations or deviations requiring justification.

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
├── runtime-test-bench/          # NEW: Main feature folder
│   ├── RuntimeTestBench.tsx     # Main component wrapper
│   ├── components/              # Panel components
│   │   ├── Toolbar.tsx
│   │   ├── EditorPanel.tsx      # Wraps existing ScriptEditor
│   │   ├── CompilationPanel.tsx
│   │   ├── RuntimeStackPanel.tsx # Enhances CompactRuntimeStackVisualizer
│   │   ├── MemoryPanel.tsx      # Enhances MemoryVisualizationTable
│   │   ├── ControlsPanel.tsx
│   │   └── StatusFooter.tsx
│   ├── hooks/                   # State management hooks
│   │   ├── useRuntimeTestBench.ts
│   │   ├── useRuntimeAdapter.ts
│   │   ├── useRuntimeSnapshot.ts
│   │   ├── useMemoryVisualization.ts
│   │   └── useHighlighting.ts
│   ├── adapters/                # Runtime integration
│   │   └── RuntimeAdapter.ts
│   ├── types/                   # TypeScript definitions
│   │   ├── interfaces.ts        # 20+ component/data interfaces
│   │   └── types.ts             # Utility types
│   └── styles/                  # Tailwind components
│       └── tailwind-components.ts
├── editor/                      # EXISTING: Monaco integration
│   └── WodWiki.tsx              # Used by EditorPanel
├── runtime/                     # EXISTING: Runtime system
│   ├── ScriptRuntime.ts         # Integrated via adapter
│   ├── JitCompiler.ts
│   └── IRuntimeBlock.ts
└── index.ts                     # Export RuntimeTestBench

stories/
├── runtime-test-bench/          # NEW: Storybook stories
│   ├── RuntimeTestBench.stories.tsx
│   ├── Toolbar.stories.tsx
│   ├── EditorPanel.stories.tsx
│   ├── CompilationPanel.stories.tsx
│   ├── RuntimeStackPanel.stories.tsx
│   ├── MemoryPanel.stories.tsx
│   ├── StatusFooter.stories.tsx
│   ├── Examples.stories.tsx     # Real workout examples
│   └── Interactions.stories.tsx # Cross-panel interactions
└── compiler/                    # EXISTING: Keep for reference
    └── JitCompilerDemo.tsx      # Deprecated after migration

tests/
├── contract/                    # NEW: Contract tests
│   ├── RuntimeAdapter.contract.test.ts
│   ├── EditorPanel.contract.test.ts
│   ├── RuntimeStackPanel.contract.test.ts
│   └── MemoryPanel.contract.test.ts
├── integration/                 # NEW: Integration tests
│   ├── RuntimeTestBench.integration.test.ts
│   ├── CrossPanelHighlighting.test.ts
│   └── KeyboardShortcuts.test.ts
└── unit/                        # NEW: Unit tests
    ├── hooks/
    │   ├── useRuntimeTestBench.test.ts
    │   ├── useRuntimeSnapshot.test.ts
    │   └── useHighlighting.test.ts
    └── adapters/
        └── RuntimeAdapter.test.ts
```

**Structure Decision**: Single project structure selected. This is a React component library feature that integrates with existing runtime system. No backend or mobile components. All code under src/runtime-test-bench/ follows modular organization with components/, hooks/, adapters/, types/, and styles/ subdirectories. Storybook stories mirror component structure. Tests organized by type (contract, integration, unit).

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

1. **From Contracts** (specs/main/contracts/*.contract.md):
   - RuntimeAdapter.contract.md → 8 contract test tasks [P]
   - EditorPanel.contract.md → 8 contract test tasks [P]
   - Additional contracts → corresponding test tasks [P]
   
2. **From Data Model** (specs/main/data-model.md):
   - Section 1-3 → Create TypeScript interfaces in types/interfaces.ts [P]
   - Section 4 → Create component prop interfaces [P]
   - Section 5 → Create hook return type interfaces [P]
   
3. **From Research** (specs/main/research.md):
   - Decision 1 → Extend tailwind.config.js with colors [P]
   - Decision 2 → Extract ScriptEditor → EditorPanel wrapper
   - Decision 3 → Implement RuntimeAdapter class
   - Decision 4 → Implement useRuntimeTestBench hook
   - Decision 5 → Implement cross-panel highlighting
   - Decision 7 → Implement responsive breakpoints
   - Decision 8 → Add ARIA labels and keyboard nav
   - Decision 9 → Add React.memo and virtualization
   
4. **From Quickstart** (specs/main/quickstart.md):
   - User Story 1 → Integration test: Edit → Step → Reset workflow
   - User Story 2 → Integration test: Cross-panel highlighting
   - User Story 3 → Integration test: Responsive design
   - Keyboard shortcuts → Integration test: All 9 shortcuts
   - Performance validation → Performance test: <50ms updates

**Ordering Strategy** (TDD + Dependency Order):

**Phase 1 - Foundation** [Week 1] - All Parallel [P]:
1. Create folder structure (src/runtime-test-bench/*)
2. Create TypeScript interfaces (types/interfaces.ts, types/types.ts)
3. Extend Tailwind config with prototype colors
4. Create component skeletons (all 7 components)
5. Write contract tests (fail initially)

**Phase 2 - Adapter & Hooks** [Week 2] - Sequential:
6. Implement RuntimeAdapter (makes RuntimeAdapter.contract tests pass)
7. Implement useRuntimeSnapshot hook
8. Implement useMemoryVisualization hook
9. Implement useHighlighting hook
10. Implement useRuntimeTestBench hook (orchestrator)

**Phase 3 - Extract Components** [Week 2] - Parallel [P]:
11. Implement EditorPanel (wrap ScriptEditor, make EditorPanel.contract pass)
12. Implement RuntimeStackPanel (migrate CompactRuntimeStackVisualizer)
13. Implement MemoryPanel (migrate MemoryVisualizationTable + search)

**Phase 4 - New Components** [Week 3] - Parallel [P]:
14. Implement Toolbar component
15. Implement CompilationPanel component
16. Implement ControlsPanel component
17. Implement StatusFooter component

**Phase 5 - Integration** [Week 3] - Sequential:
18. Implement RuntimeTestBench main component
19. Wire all data flow between panels
20. Add keyboard shortcuts handler
21. Add responsive breakpoints

**Phase 6 - Storybook** [Week 4] - Parallel [P]:
22. Create RuntimeTestBench.stories.tsx
23. Create panel stories (7 files)
24. Create Examples.stories.tsx (real workouts)
25. Create Interactions.stories.tsx

**Phase 7 - Testing** [Week 4] - Sequential:
26. Write integration tests (4 scenarios from quickstart)
27. Write performance tests (3 benchmarks)
28. Run accessibility audit (WCAG 2.1 AA)
29. Verify all contract tests passing

**Phase 8 - Documentation** [Week 4] - Parallel [P]:
30. Update README with usage examples
31. Add migration guide from JitCompilerDemo
32. Update .github/copilot-instructions.md

**Estimated Output**: 30-35 numbered tasks in tasks.md

**Parallel Execution Indicators**:
- [P] = Can run in parallel (independent files)
- Sequential tasks must wait for dependencies

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
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
