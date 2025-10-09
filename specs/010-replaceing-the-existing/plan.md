
# Implementation Plan: Clock & Memory Visualization Stories

**Branch**: `010-replaceing-the-existing` | **Date**: October 6, 2025 | **Spec**: `X:\wod-wiki\specs\010-replaceing-the-existing\spec.md`
**Input**: Feature specification from `X:\wod-wiki\specs\010-replaceing-the-existing\spec.md`

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

Replace standalone clock stories with integrated clock + memory visualization stories following the Runtime Stack & Memory pattern. Each story displays:
1. **Clock Display** (left panel) - Formatted elapsed time using existing `ClockAnchor` and `TimeDisplay` components
2. **Timer Memory Visualization** (right panel) - New component showing time spans array, running state boolean, and block key

**Technical Approach**:
- Create `TimerMemoryVisualization` component with memory subscriptions
- Create `ClockMemoryStory` wrapper with side-by-side layout and hover highlighting
- Enhance `TimerTestHarness` to expose memory references (`timeSpansRef`, `isRunningRef`)
- Use hover interactions consistent with Runtime visualization (Option A from research)
- Timer-specific memory only (not all runtime memory) for focused scope
- 10-15 stories covering running timers, completed timers, and edge cases

## Technical Context
**Language/Version**: TypeScript 5.x with strict mode enabled  
**Primary Dependencies**: React 18+, Storybook 9.1.10, Chevrotain parser, Tailwind CSS  
**Storage**: In-memory runtime state (no persistence)  
**Testing**: Vitest (unit + integration), Storybook play functions, contract tests  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Single (TypeScript component library with Storybook)  
**Performance Goals**: Story load <1s, component render <10ms, memory updates <16ms, hover response <100ms  
**Constraints**: Must follow Runtime visualization patterns, maintain existing TimerTestHarness race condition fix  
**Scale/Scope**: 10-15 stories, 2 new components (TimerMemoryVisualization, ClockMemoryStory), enhance 1 test harness

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I: Component-First Architecture** ✅ PASS
- Creating `TimerMemoryVisualization` component (new, self-contained)
- Creating `ClockMemoryStory` wrapper component (story integration)
- Reusing `ClockAnchor`, `TimeDisplay` (no modifications)
- All components independently testable via contract tests
- Clear purpose: memory visualization for debugging timer behavior

**Principle II: Storybook-Driven Development** ✅ PASS
- 10-15 stories planned covering all scenarios (running, completed, edge cases)
- Each story demonstrates specific timer state with memory visualization
- Interactive controls via Storybook args (durationMs, isRunning, etc.)
- Visual validation through Storybook interface
- Stories created BEFORE implementation (design phase)

**Principle III: Parser-First Domain Logic** ✅ N/A
- No workout syntax changes in this feature
- No parser modifications required
- This is visualization/UI only feature

**Principle IV: JIT Compiler Runtime** ✅ PASS
- Using existing runtime infrastructure (ScriptRuntime, RuntimeBlock)
- Memory management via TypedMemoryReference subscriptions
- Proper disposal patterns in story cleanup
- Performance targets defined: <1s story load, <16ms memory updates
- Follows established memory patterns (learned from Runtime visualization)

**Principle V: Monaco Editor Integration** ✅ N/A
- No editor changes in this feature
- This is clock/memory visualization only

**Technology Standards** ✅ PASS
- TypeScript strict mode enabled
- React 18+ functional components with hooks
- Tailwind CSS for styling (no custom CSS)
- Vitest for contract tests
- npm package manager

**Performance Requirements** ✅ PASS
- Story load: <1s to interactive
- Component render: <10ms
- Memory updates: <16ms (within 60fps budget)
- Hover response: <100ms perceived latency
- All targets defined in contracts/component-contracts.md

**Code Quality** ✅ PASS
- TypeScript strict mode in all files
- Full interface definitions in data-model.md
- Typed props for all components
- Error handling for missing/invalid memory

**Development Workflow** ✅ PASS
- Story-first development (Phase 2A: Stories before implementation)
- Contract tests before implementation (TDD approach)
- Integration tests validate end-to-end scenarios
- Documentation updated (contracts, quickstart)

**Initial Check**: ✅ ALL GATES PASS - Ready for Phase 0
**Post-Design Check**: ✅ ALL GATES PASS - Design complete, no new violations

**Post-Design Notes**:
- Component-First maintained: All new components self-contained, contract-tested
- Storybook-Driven maintained: 10-15 stories planned before implementation
- Performance targets defined and measurable
- TypeScript strict mode in data model interfaces
- TDD approach enforced via contract tests
- No deviations from constitutional principles

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
├── clock/
│   ├── ClockAnchor.tsx              # Existing (no changes)
│   ├── TimeDisplay.tsx              # Existing (no changes)
│   └── TimerMemoryVisualization.tsx # NEW: Memory display component
├── runtime/
│   ├── hooks/
│   │   ├── useTimerElapsed.ts       # Existing (no changes)
│   │   └── useMemorySubscription.ts # Existing (no changes)
│   └── [other runtime files]
└── types/
    └── [existing type definitions]

stories/
├── clock/
│   ├── utils/
│   │   └── TimerTestHarness.tsx     # ENHANCED: Expose memory refs
│   ├── ClockMemoryStory.tsx         # NEW: Story wrapper component
│   ├── RunningTimers.stories.tsx    # NEW: Running timer stories
│   ├── CompletedTimers.stories.tsx  # NEW: Completed timer stories
│   ├── EdgeCases.stories.tsx        # NEW: Edge case stories
│   └── __archive__/
│       ├── ClockAnchor.stories.tsx  # MOVED: Old standalone stories
│       └── [other old stories]
└── runtime/
    └── [existing runtime stories]

tests/
├── stories/
│   └── ClockMemoryStories.integration.test.tsx  # NEW: Integration tests
└── unit/
    ├── TimerMemoryVisualization.contract.test.tsx  # NEW: Component contract tests
    ├── ClockMemoryStory.contract.test.tsx          # NEW: Wrapper contract tests
    └── TimerTestHarness.contract.test.tsx          # NEW: Harness contract tests
```

**Structure Decision**: Single project TypeScript library. All new components follow existing patterns:
- Components in `src/clock/` (co-located with ClockAnchor)
- Stories in `stories/clock/` (co-located with test harness)
- Contract tests in `tests/unit/` (component-level)
- Integration tests in `tests/stories/` (story-level)
- Old stories archived to `__archive__/` subdirectory (not deleted)

## Phase 0: Outline & Research ✅ COMPLETE

**Research Questions Identified from Spec**:
1. Interaction pattern: How to connect clock and memory visually?
2. Layout approach: How to arrange clock and memory panels?
3. Memory scope: Show all runtime memory or timer-specific only?
4. Multi-timer support: Single or multiple timers per story?

**Research Conducted**:
- Analyzed existing Runtime Stack & Memory Visualization pattern
- Reviewed existing clock component architecture
- Evaluated memory subscription and state management patterns
- Considered user experience and debugging use cases

**Decisions Made** (documented in `research.md`):

1. **Interaction Pattern: Hover-based highlighting (Option A)**
   - Rationale: Consistent with Runtime visualization, no UI clutter, intuitive bidirectional highlighting
   - Alternative rejected: Click-based selection (adds complexity, inconsistent with Runtime)

2. **Layout: Side-by-side panels (Option A)**
   - Rationale: Simultaneous view enables correlation, no context switching, optimal for debugging
   - Alternative rejected: Tabbed view (requires switching, loses correlation), overlaid view (obscures information)

3. **Memory Scope: Timer-specific only (Option A)**
   - Rationale: Focused scope, clear purpose, avoids overwhelming detail
   - Alternative rejected: All runtime memory (too much information, not relevant to clock feature)

4. **Multi-Timer: One timer per story (Option A)**
   - Rationale: Simple, clear, meets all requirements, extensible later if needed
   - Alternative rejected: Multiple timers (complex, unclear interaction, deferred to future)

**Output**: ✅ `research.md` complete with all clarifications resolved

## Phase 1: Design & Contracts ✅ COMPLETE
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`: ✅ DONE
   - `ClockMemoryStoryConfig`: Story configuration with durationMs, isRunning, timeSpans, title, description
   - `TimerMemoryState`: Memory snapshot with timeSpans array and isRunning boolean
   - `TimerMemoryVisualizationProps`: Component props including memory refs, blockKey, callbacks
   - `ClockMemoryHarnessResult`: Enhanced harness result with memory references exposed
   - `TimeSpan`: Existing type (reused) with start and optional stop timestamps
   - Validation rules: durationMs > 0, isRunning boolean, non-empty strings, valid TimeSpan arrays

2. **Generate component contracts** from functional requirements: ✅ DONE
   - `contracts/component-contracts.md`: Complete behavioral contracts for all components
   - TimerMemoryVisualization: Memory display, subscriptions, hover, error handling
   - ClockMemoryStory: Story wrapper, layout, hover state management
   - Enhanced TimerTestHarness: Runtime setup, memory exposure, validation
   - Performance targets: Story load <1s, render <10ms, updates <16ms, hover <100ms
   - Error handling contracts: Missing memory, invalid refs, disposed blocks

3. **Generate integration contracts** from story requirements: ✅ DONE
   - `contracts/integration-contracts.md`: Story structure, validation, testing patterns
   - Story file structure: Meta object, typed stories, required fields
   - Configuration validation: Schema and rules for ClockMemoryStoryConfig
   - Story organization: Categories (Running/Completed/Edge Cases) with 10-15 total stories
   - Test integration: Snapshot, accessibility, interaction, performance tests
   - Migration plan: Archive old stories, verify equivalence, update imports

4. **Extract test scenarios** from contracts: ✅ DONE
   - Contract test files specified for each component
   - Integration test scenarios defined
   - Test-driven development approach documented
   - Test execution order: Contract tests → Integration tests → Visual/manual

5. **Create quickstart.md**: ✅ DONE
   - Summary of feature, decisions, and critical information
   - Component contracts summary for quick reference
   - Story implementation guidance with file structure
   - Testing strategy with TDD approach
   - Performance targets table
   - Migration checklist and story categories
   - Constitutional compliance verification
   - Known risks and mitigations
   - Q&A section for common questions

6. **Update agent context**: ✅ DONE
   - Executed `.specify/scripts/powershell/update-agent-context.ps1`
   - Updated CLAUDE.md, GEMINI.md, .github/copilot-instructions.md
   - Added TypeScript, React, Storybook tech context
   - Preserved manual additions and recent changes

**Output**: ✅ data-model.md, contracts/*, quickstart.md, agent context files all complete

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**: Use `.specify/templates/tasks-template.md` as structure
2. **Generate from Design Docs**: Extract tasks from contracts, data-model, quickstart
3. **Component Development Tasks** (from `contracts/component-contracts.md`):
   - Task per contract test file (TDD: write failing test first)
   - Task per component implementation (make contract tests pass)
   - Task for enhanced TimerTestHarness (expose memory refs)
4. **Story Creation Tasks** (from `contracts/integration-contracts.md`):
   - Task per story category file (RunningTimers, CompletedTimers, EdgeCases)
   - Task for validation logic implementation
   - Task for story metadata and organization
5. **Testing Tasks** (from test scenarios in contracts):
   - Task for integration test file
   - Task for visual regression baseline
   - Task for accessibility testing
6. **Migration Tasks** (from integration contracts migration section):
   - Task to identify old story scenarios
   - Task to verify equivalence
   - Task to archive old files

**Ordering Strategy**:

**Phase 2A: Component Development** (TDD order)
1. [P] Write TimerMemoryVisualization contract tests (failing)
2. [P] Write ClockMemoryStory contract tests (failing)
3. [P] Write TimerTestHarness contract tests (failing)
4. Implement TimerMemoryVisualization (make tests pass)
5. Implement ClockMemoryStory (make tests pass)
6. Enhance TimerTestHarness (make tests pass)

**Phase 2B: Story Creation** (category order)
7. Create RunningTimers.stories.tsx (3-4 stories)
8. Create CompletedTimers.stories.tsx (3-4 stories)
9. Create EdgeCases.stories.tsx (3-4 stories)
10. Add validation logic to TimerTestHarness
11. Verify all stories in Storybook

**Phase 2C: Integration & Testing** (validation order)
12. Write integration tests (ClockMemoryStories.integration.test.tsx)
13. Run all contract tests (verify pass)
14. Run integration tests (verify pass)
15. Visual regression baseline (Storybook snapshots)
16. Accessibility testing (axe-core)

**Phase 2D: Migration & Cleanup** (finalization order)
17. Identify all old story scenarios
18. Compare old vs new (visual diff)
19. Archive old stories to __archive__/
20. Update any dependent imports
21. Final validation (all 10-15 stories working)

**Parallelization Markers**:
- [P] = Tasks 1-3 can execute in parallel (independent test files)
- Tasks 4-6 sequential (implementation depends on tests)
- Tasks 7-9 can execute in parallel (independent story files)
- Tasks 10-21 sequential (dependencies)

**Estimated Output**: 21 numbered, ordered tasks in tasks.md

**Task Template Structure** (per task):
```markdown
## Task N: [Task Name]
**Phase**: [2A/2B/2C/2D] | **Type**: [Test/Implementation/Story/Migration]
**Dependencies**: [Task numbers or "None"]
**Files**: [List of files to create/modify]
**Validation**: [How to verify completion]
**Estimated Time**: [minutes]
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan. The /plan command stops here.

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No constitutional violations detected**. All design decisions align with WOD Wiki Constitution v1.0.0:
- Component-First: New components are self-contained and testable
- Storybook-Driven: Stories created before implementation
- TypeScript Strict: All interfaces fully typed
- Performance: Targets defined and measurable
- TDD: Contract tests before implementation


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning approach documented (/plan command) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation execution (manual or via tools)
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved (4 clarifications in research.md) ✅
- [x] No complexity deviations (constitutional compliance maintained) ✅

**Deliverables Created**:
- [x] research.md (Phase 0) ✅
- [x] data-model.md (Phase 1) ✅
- [x] contracts/component-contracts.md (Phase 1) ✅
- [x] contracts/integration-contracts.md (Phase 1) ✅
- [x] quickstart.md (Phase 1) ✅
- [x] Updated agent context files (Phase 1) ✅
- [x] plan.md (this file) - Complete ✅
- [x] tasks.md (Phase 3) ✅

**Next Step**: Begin implementation starting with T001 (Setup verification)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
