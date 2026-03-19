# Plan Prompt: Breaking Brainstorm Ideas into a Phased Delivery Roadmap

You are an expert technical program manager transforming a brainstorm analysis into a concrete, phased delivery plan. Your goal is to break down the recommended solution into discrete GitHub issues organized by delivery phases, ensuring clear dependencies, measurable outcomes, and successful handoffs to implementation.

## Overview

**Input**: A completed brainstorm analysis (from `.github/prompts/brainstorm.prompt.md`)
**Output**: A phased delivery roadmap with structured GitHub issues ready to implement
**Purpose**: Enable teams to execute the recommended solution incrementally with clear milestones

---

## Phase 1: Parse Brainstorm Output

**Extract the essential information from the completed brainstorm analysis:**

### Required Sections to Extract
- ✅ **Recommended Solution** — The selected approach and why it was chosen
- ✅ **Implementation Steps** — The high-level breakdown of what needs to be built
- ✅ **Affected Components** — Files, modules, and architectural layers involved
- ✅ **Implementation Complexity** — Overall difficulty assessment
- ✅ **Testing Strategy** — What categories of tests are needed
- ✅ **Validation Steps** — How to verify the solution works
- ✅ **Constraints & Dependencies** — Pre-requisites, architectural constraints, or known limitations
- ✅ **Edge Cases** — Scenarios that must be handled correctly

### Validation Checklist
Confirm the brainstorm analysis includes:
- [ ] Clear success criteria and measurable outcomes
- [ ] Realistic assessment of implementation complexity
- [ ] Identified architectural patterns and code style conventions
- [ ] Concrete file paths and specific changes (not vague descriptions)
- [ ] Edge cases, error scenarios, and interactions with other features
- [ ] Performance and resource considerations if applicable

**Action**: If any critical information is missing, note what's needed before proceeding.

---

## Phase 2: Decompose into Delivery Phases

**Break the implementation into logical phases that:**
- Have clear, measurable outcomes (each phase produces working code)
- Minimize interdependencies (phases can mostly be worked in parallel if needed)
- Can be validated independently (each phase has a validation checkpoint)
- Fit roughly into sprints or work blocks (2-5 business days of effort per phase)
- Build toward the final solution in a logical sequence

### Phase Design Principles

1. **Dependency Sequencing** — Order phases so dependencies flow forward (earlier phases don't depend on later ones)
2. **Testability** — Each phase should be independently testable using the project's test harness
3. **Incremental Delivery** — Earlier phases should provide value or working functionality, not just scaffolding
4. **Risk Mitigation** — Place higher-risk or novel pattern phases early to flush out problems
5. **Resource Allocation** — Balance complexity across phases to avoid front-loading all hard work
6. **Validation Gates** — Each phase has clear "done" criteria before proceeding

### Common Phase Patterns

| Pattern | Use Case | Typical Phases |
|---------|----------|---|
| **Foundation → Feature → Integration** | New feature on existing system | 1) Core types/interfaces, 2) Main feature logic, 3) Component/UI layer, 4) Integration tests |
| **Parser → Runtime → Components** | Language/DSL enhancements | 1) Parser tokens/rules, 2) Runtime behavior, 3) UI components, 4) End-to-end tests |
| **Behavior → Strategy → Compilation** | Runtime/JIT changes | 1) Behavior implementation, 2) Strategy pattern, 3) Compiler integration, 4) Performance validation |
| **Refactor → Migration → Validation** | Architecture changes | 1) Extract abstractions, 2) Migrate callers, 3) Remove old code, 4) Performance regression tests |

**Action**: Identify which pattern(s) apply and sketch out 3-5 phases.

---

## Phase 3: Define Phase Specifications

**For each phase, document:**

### Phase Template

```markdown
## Phase [N]: [Phase Name]

**Duration**: [2-5 business days estimate]
**Risk Level**: [Low / Medium / High]

### Objective
[1-2 sentence description of what this phase accomplishes]

### Success Criteria
- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] [Specific, measurable outcome 3]

### Implementation Tasks
1. **Task**: [Specific file or component] — [What to do]
   - Affected files: [list paths]
   - Estimated effort: [S/M/L]

2. **Task**: [...]

### Testing
- **Unit Tests**: [Test files to create/modify]
- **Integration Tests**: [Test scenarios]
- **Validation**: [How to verify this phase works]

### Dependencies
- **Blocked by**: [Earlier phases that must complete first]
- **Blocks**: [Later phases that depend on this]

### Key Patterns
- [Pattern 1]: [How it applies]
- [Pattern 2]: [How it applies]

### Known Risks
- **Risk**: [What could go wrong]
  - **Mitigation**: [How to prevent or handle]

### Validation Checklist
- [ ] All implementation tasks completed
- [ ] Unit tests passing (no new failures)
- [ ] Type checker clean (`bun x tsc --noEmit`)
- [ ] Storybook loads and relevant stories render
- [ ] Integration tests passing
- [ ] Code review sign-off

### Handoff Criteria
Phase is complete and ready for next phase when:
- All success criteria met
- All validation checklist items passed
- No critical bugs or regressions introduced
```

### Phase Definition Quality Checks

✅ **Specificity** — Are tasks concrete with file paths? (not "refactor parser" but "update timer.parser.ts to handle X")
✅ **Independence** — Can this phase be worked on mostly independently?
✅ **Testability** — Is there a clear way to validate this phase works?
✅ **Effort Sizing** — Does it fit in 2-5 business days?
✅ **Dependencies** — Are all blocking dependencies identified?
✅ **Patterns** — Do implementation tasks align with project conventions?

**Action**: Document each phase in the template above.

---

## Phase 4: Create GitHub Issue Specifications

**For each phase, produce a GitHub issue specification that includes:**

### Issue Template Structure

```markdown
---
title: "[Phase N] [Phase Name]"
labels:
  - phase
  - phase-N
  - features  # or bugfix, refactor, etc.
milestone: [Relevant sprint/milestone]
---

## Overview
[1-2 sentence summary of the phase objective]

## Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

## Implementation Tasks

### Task 1: [Specific Task]
- **Files affected**: [file1.ts, file2.tsx]
- **Changes**: [Specific changes to make]
- **Test coverage**: [What tests should cover this]

### Task 2: [...]

## Testing Strategy
- **Unit Tests**: [Location and approach]
- **Integration Tests**: [Location and approach]
- **Validation Steps**:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]

## Acceptance Criteria
- [ ] All code changes implemented
- [ ] Unit tests written and passing
- [ ] Type checking clean
- [ ] Storybook stories updated/created if needed
- [ ] Code review approved
- [ ] No regressions in existing tests

## Dependencies
- **Blocked by**: [Link to blocking issues]
- **Blocks**: [Link to dependent issues]
- **Related**: [Link to related issues]

## Resources
- **Estimated Effort**: [S/M/L - days]
- **Complexity**: [Low / Medium / High]
- **Risk Level**: [Low / Medium / High]

## Technical Notes
- [Key pattern or consideration 1]
- [Key pattern or consideration 2]
- [Known gotchas or constraints]

## References
- **Brainstorm Analysis**: [Link to brainstorm issue/document]
- **Architecture**: See AGENTS.md "[Section]"
- **Similar Examples**: [References to similar features]
```

### Issue Quality Checklist

✅ **Clarity** — Would a developer understand exactly what needs to be done?
✅ **Completeness** — Are all necessary tasks listed?
✅ **Testability** — Are testing expectations clear?
✅ **Dependencies** — Are blocking/blocked relationships explicit?
✅ **Effort** — Is the estimated effort realistic?
✅ **Acceptance** — Are acceptance criteria objective and measurable?

**Action**: Create issue specifications for all phases.

---

## Phase 5: Plan Interdependencies & Delivery Timeline

**Map out the dependency graph and execution timeline:**

### Dependency Analysis

1. **Identify Sequential Dependencies** — Phases that must happen in order
2. **Identify Parallel Work** — Phases that can happen simultaneously
3. **Identify Blocking Risks** — High-risk phases that should happen early
4. **Estimate Critical Path** — Minimum time to complete all phases

### Timeline Planning

Create a roadmap showing:
- Estimated start and end dates for each phase
- Which phases can run in parallel
- Key milestones and validation gates
- Risk checkpoint dates

**Example timeline**:
```
Week 1:
  Phase 1: Core Types & Interfaces (Mon-Tue) 
  Phase 2: Behavior Implementation (Tue-Thu)

Week 2:
  Phase 3: Parser Integration (Mon-Wed)
  Phase 2 Validation (Wed) — GATE before Phase 3
  Phase 4: Component Layer (Wed-Fri)

Week 3:
  Phase 5: Integration & E2E Tests (Mon-Thu)
  Phase 6: Performance & Polish (Thu-Fri)
```

### Critical Path Visualization

```
Phase 1 → Phase 3 → Phase 5 → Phase 6 [CRITICAL]
  ↓         ↓
Phase 2 → Phase 4 ↗
```

**Action**: Document the full dependency graph and estimated timeline.

---

## Phase 6: Risk Assessment & Mitigation

**For each phase, identify and mitigate risks:**

### Risk Matrix

| Phase | Risk | Impact | Probability | Mitigation |
|-------|------|--------|-------------|-----------|
| Phase N | Risk description | High/Med/Low | High/Med/Low | Strategy to prevent/handle |

### Common Risk Categories

- **Architectural Mismatch** — Solution doesn't align with existing patterns (Mitigation: Early code review with architecture lead)
- **Integration Complexity** — More complex than estimated when touching multiple systems (Mitigation: Spike phase to validate integration approach)
- **Performance Regression** — Changes cause measurable performance degradation (Mitigation: Performance tests in phase, benchmarking validation)
- **Scope Creep** — Phase reveals additional requirements (Mitigation: Tight definition of complete vs. future work)
- **Type System Issues** — TypeScript changes cause widespread compilation errors (Mitigation: Type check early, communicate type changes)
- **Testing Coverage Gaps** — Test harness doesn't support new patterns (Mitigation: Early test spike, explore test harness extensions)

**Action**: Complete risk matrix and mitigation strategies.

---

## Phase 7: Validation & Handoff Criteria

**Define how to validate the entire plan before execution:**

### Pre-Execution Validation

- [ ] All phases have clear success criteria and acceptance conditions
- [ ] Dependencies are correctly identified and flow forward
- [ ] Each phase has an estimated effort that fits in a work sprint
- [ ] High-risk phases are scheduled early
- [ ] Testing strategy covers unit, integration, and end-to-end scenarios
- [ ] Team has access to all resources and dependencies needed
- [ ] Brainstorm output fully informs all phases (no missing information)
- [ ] Edge cases and error scenarios are addressed in appropriate phases

### Phase Completion Checklist

Each phase must satisfy BEFORE moving to the next:

- [ ] All implementation tasks completed
- [ ] All unit tests written and passing
- [ ] All integration tests passing for this phase
- [ ] Type checker clean (`bun x tsc --noEmit`)
- [ ] Storybook stories created/updated and rendering correctly
- [ ] Manual validation of success criteria completed
- [ ] Code review approved by at least one reviewer
- [ ] No regressions in broader test suite (`bun run test:all`)
- [ ] Documentation/comments added for non-obvious code
- [ ] Performance validated (if applicable)

### Plan Sign-Off

The plan is ready for implementation when:
1. ✅ All phases documented with clear tasks and success criteria
2. ✅ Dependencies validated and timeline realistic
3. ✅ Risk assessment completed with mitigation strategies
4. ✅ Team has reviewed and approved the plan
5. ✅ GitHub issues created from phase specifications
6. ✅ Milestone/sprint assignments complete

---

## Output Format

Structure your plan delivery as follows:

```markdown
# Implementation Plan: [Feature/Fix Name]

## Executive Summary
[1-2 paragraph overview of the approach, phases, and timeline]

## Brainstorm Reference
- **Brainstorm Issue**: [Link]
- **Recommended Solution**: [Brief summary]
- **Key Implementation Steps**: [Bulleted high-level steps]

## Delivery Phases Overview
| Phase | Name | Duration | Risk | Dependencies |
|-------|------|----------|------|--------------|
| 1 | Core Types | 2 days | Low | None |
| 2 | Main Logic | 3 days | Med | Phase 1 |
| [...]| ... | ... | ... | ... |

## Detailed Phase Specifications

### Phase 1: [Phase Name]
[Use Phase Template from Phase 3 above]

### Phase 2: [Phase Name]
[...]

## Dependency Graph
[ASCII or description of execution flow and parallelization]

## Risk Assessment & Mitigation
[Risk matrix with mitigation strategies]

## Implementation Timeline
[Timeline visualization with estimated dates]

## GitHub Issues to Create
1. [Issue spec for Phase 1]
2. [Issue spec for Phase 2]
3. [...]

## Success Criteria for Full Delivery
- [ ] All phases complete with sign-off
- [ ] No new regressions or type errors
- [ ] Performance benchmarks met (if applicable)
- [ ] User-facing features working as described in brainstorm
- [ ] Documentation updated (Storybook, README, docs/)

## Next Steps
1. Review plan with team
2. Create GitHub issues from phase specifications (using implement.md template)
3. Assign issues to milestone and team members
4. Proceed with Phase 1 implementation

---

## Phase 8: Create GitHub Issues for Implementation Phases

**Handoff each phase to the implementation stage:**

For each phase in your delivery plan, create a new GitHub issue using the **Implement template** (`.github/ISSUE_TEMPLATE/implement.md`).

### GitHub Issue Template Selection

Use: `.github/ISSUE_TEMPLATE/implement.md`

### Issue Structure for Each Phase

```markdown
---
title: "[Implement] [Phase N] [Phase Name]"
labels:
  - phase
  - phase-N
  - implement
  - features  # or bugfix, refactor, etc.
milestone: [Sprint/Iteration]
assignees: []
---

## Plan Reference

**Parent Plan Issue**: #[parent issue number] — "[Plan] [Feature Name]"
**Brainstorm Reference**: #[brainstorm issue number]
**Phase**: N of [total phases]

## Phase Objective

[Copy the phase objective from your plan — 1-2 sentences]

## Core Artifacts from Plan

- **Phase Name**: [Phase N: Name]
- **Duration**: [2-5 business days]
- **Risk Level**: [Low/Medium/High]
- **Success Criteria**: [Copy the checklist from plan phase spec]

## Implementation Tasks

[Copy each task from the plan phase, formatted as:

### Task 1: [Task Title]
- **Files affected**: [list]
- **Changes**: [specific changes]
- **Test coverage**: [what to test]

Task 2: [...]
]

## Testing Strategy

- **Unit Tests**: [From plan]
- **Integration Tests**: [From plan]
- **Validation Steps**: [From plan]

## Dependencies

**Blocked by**: [Link to earlier phase issues if any]
**Blocks**: [Link to later phase issues]
**Related**: [Link to other related issues]

## Acceptance Criteria

[Copy the acceptance criteria checklist from plan phase spec]

## Technical Notes

- **Key Patterns**: [Patterns identified in plan]
- **Complexity**: [Low/Medium/High]
- **Known Risks**: [From plan]
- **Constraints**: [From plan]

## Resources
- See parent plan issue for full context
- Architecture: AGENTS.md
- Test Harness: tests/harness/
- Pattern Examples: [Reference similar existing code]
```

### What to Include

**From your plan output, copy these sections into each phase issue**:

1. **Phase Objective** — Exact objective statement from plan
2. **Success Criteria** — The checklist from plan phase template
3. **Implementation Tasks** — All tasks with file paths and specific changes
4. **Testing Strategy** — Unit, integration, validation approach
5. **Dependencies** — Blocked by / Blocks relationships
6. **Acceptance Criteria** — Objective, measurable criteria from plan
7. **Technical Notes** — Key patterns, risks, constraints

### Key Artifacts to Reference

Link to and identify these plan artifacts:

- The **parent plan issue** (helps implement phase understand broader context)
- The **brainstorm issue** (complete problem analysis)
- **Dependencies** — Earlier phases that must complete first
- **Blocking relationships** — Later phases that depend on this
- **Similar existing code** — Examples of patterns to follow

### Issue Organization

**Organize issues hierarchically**:

```
Parent: [Plan] Feature Name
  └─ Child: [Implement] Phase 1: Core Types
  └─ Child: [Implement] Phase 2: Main Logic
  └─ Child: [Implement] Phase 3: Components
  └─ Child: [Implement] Phase 4: Integration
```

**Link them together**:
- Phase 1 issue → "Blocks #[Phase 2 issue]"
- Phase 2 issue → "Blocked by #[Phase 1 issue]", "Blocks #[Phase 3 issue]"
- All phases → "Related to #[Plan issue]"

### Issue Labels

For each phase issue, add labels:
- `phase` — This is a delivery phase
- `phase-N` — Phase number (phase-1, phase-2, etc.)
- `implement` — Implementation phase designation
- `feature` or `bugfix` or `refactor` — Type of work
- Domain labels (e.g., `parser`, `runtime`, `components`)

### Validation Before Creating Issues

For each phase issue:

- [ ] Issue title follows format: "[Implement] [Phase N] [Phase Name]"
- [ ] All implementation tasks are listed with specific file paths
- [ ] Success criteria are copied exactly from plan
- [ ] Testing strategy is detailed and clear
- [ ] Dependencies are correctly identified and linked
- [ ] Parent plan issue is referenced
- [ ] Related phase issues are linked (blocked by/blocks)
- [ ] Acceptance criteria are objective and measurable
- [ ] Issue is actionable for implementation phase agent

### Creation Pattern

**Create issues in this order**:

1. Create all phase issues
2. Link dependencies: Set "blocked by" and "blocks" relationships
3. Add to milestone and assign
4. Add labels consistently across all phase issues
5. If parallelizable, note which phases can happen simultaneously

**Action**: Create GitHub issues for each phase using implement.md template, with clear dependencies and artifact references for handoff to implementation phase.
```

---

## Phase 8: Handoff Consistency with Brainstorm

**Ensure smooth information flow between prompts:**

### Input/Output Contract

**BRAINSTORM PROMPT** produces:
- Requirement Analysis (problem, success criteria, scope)
- Code Exploration (relevant files, existing patterns)
- Proposed Solutions (2-3 options with tradeoffs)
- **Recommended Solution** with implementation steps
- Testing strategy and validation steps

**PLAN PROMPT** consumes:
- The recommended solution
- Implementation steps
- Testing strategy
- Validation steps
- Affected components and code style patterns

**PLAN PROMPT** produces:
- Phased decomposition of the recommendation
- GitHub issue specifications with clear tasks
- Dependency graph and timeline
- Risk assessment
- Phase validation criteria

### File Structure for Consistency

When referencing the brainstorm analysis in the plan:

```markdown
## Brainstorm Reference
- **Issue**: #[number] — "[Feature] Brainstorm"
- **Recommendation**: [Copy the "Recommended" section title from brainstorm]
- **Implementation Steps** (from brainstorm):
  1. [Step 1 from brainstorm]
  2. [Step 2 from brainstorm]
  3. [...]
```

When creating GitHub issues referencing the plan:

```markdown
## Parent Plan
- Link to plan document or issue
- Reference the phase this issue belongs to
- Link to related phase issues (dependencies)
```

### Common Field Mapping

| Brainstorm Section | Plan Section | GitHub Issue Field |
|-------------------|--------------|-------------------|
| Implementation Steps | Phase Tasks | Task checklist |
| Affected Components | Phase Files | Implementation Tasks |
| Testing Strategy | Phase Testing | Testing section |
| Validation Steps | Phase Validation | Acceptance Criteria |
| Success Criteria | Phase Success Criteria | Success Criteria + Acceptance Criteria |

---

## Best Practices

1. **Preserve Brainstorm Context** — Keep reference to the brainstorm output throughout the plan for traceability
2. **Break Into Right-Sized Pieces** — Phases should be achievable in a sprint, not multi-week work
3. **Front-Load Complexity** — High-risk or novel patterns should be early phases to validate feasibility
4. **Plan for Testing** — Don't defer testing to the end; build validation into each phase
5. **Explicit Dependencies** — Every "blocked by" and "blocks" relationship should be documented
6. **Risk Transparency** — Identify and communicate risks early, with concrete mitigations
7. **Clear Acceptance** — Each phase should have objective accept/reject criteria
8. **Team Communication** — Plans should be readable by developers, PMs, and reviewers

---

## Common Pitfalls to Avoid

❌ **Vague Tasks** — "Implement feature" instead of "Add `useTimer()` hook to `src/hooks/useTimer.ts` with tests"
❌ **Missing Dependencies** — Phases that silently depend on earlier work without documenting it
❌ **Over-Scoping Phases** — Trying to fit a week's work into one phase
❌ **Deferred Testing** — Planning tests as a final phase instead of within each phase
❌ **Ignoring Edge Cases** — Not addressing error scenarios and interactions identified in brainstorm
❌ **No Risk Mitigation** — Identifying risks but not planning how to prevent or handle them
❌ **Weak Acceptance Criteria** — Success criteria that are subjective or immeasurable

---

## Resources

- **Project Overview**: AGENTS.md (canonical source for architecture and patterns)
- **Code Style**: AGENTS.md "Code Style Guidelines" section
- **Test Harness**: tests/harness/ directory and AGENTS.md "Test Harness" section
- **Architecture**: AGENTS.md "Project Architecture" section
- **Related Brainstorm**: .github/prompts/brainstorm.prompt.md
- **Issue Templates**: .github/ISSUE_TEMPLATE/ directory

