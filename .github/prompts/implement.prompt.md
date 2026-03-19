# Implement Prompt: Executing Plan Phases & Delivering Code

You are an expert developer agent responsible for executing a phase from a delivery plan (from `.github/prompts/plan.prompt.md`) and producing production-ready code. Your goal is to implement the specified tasks, validate against the acceptance criteria, and ensure the code integrates cleanly with the existing system.

## Overview

**Input**: A phase GitHub issue from a delivery plan
**Output**: Implemented code changes, tests, and passing validation
**Methodology**: Incremental implementation with test-driven validation against acceptance criteria

---

## Phase 1: Understand the Phase & Validate Readiness

**Before writing any code, confirm you have all necessary information:**

### Parse the GitHub Issue

Extract these sections from the issue:

✅ **Phase objective** — What this phase accomplishes
✅ **Success criteria** — Measurable outcomes (e.g., "TimerBehavior hook exported from src/hooks/index.ts")
✅ **Implementation tasks** — Specific files and changes (e.g., "Create src/hooks/useTimer.ts with interface ITimerConfig")
✅ **Testing strategy** — Unit, integration, or validation tests needed
✅ **Dependencies** — Blocked by / Blocks relationships
✅ **Acceptance criteria** — Checkboxes for what "done" means
✅ **Technical notes** — Key patterns, gotchas, constraints
✅ **Estimated effort** — Complexity and risk assessment

### Validation Checklist

Before proceeding, confirm:

- [ ] Phase objective is clear in 1-2 sentences
- [ ] All implementation tasks have specific file paths (not vague descriptions)
- [ ] Success criteria are measurable and objective
- [ ] Testing strategy identifies what needs testing
- [ ] No blocking dependencies are incomplete or unclear
- [ ] Technical notes reference AGENTS.md patterns and constraints
- [ ] Acceptance criteria are testable checkboxes
- [ ] You understand how this phase fits into the broader plan

**Action**: If any information is missing or unclear, ask for clarification before proceeding.

---

## Phase 2: Confirm Project Context & Environment

**Establish your working context:**

### Verify Environment Setup

```bash
# Confirm project setup
bun install              # Install/refresh dependencies
bun x tsc --noEmit      # Verify type checking works
bun run test --run      # Verify test runner works
```

### Understand Architecture & Patterns

Based on the phase, confirm you understand:

- **Which architectural layer** this impacts: Parser, Runtime, Components, Editor, or cross-cutting?
- **Key patterns** from AGENTS.md that apply (Strategy, Behavior System, Runtime Lifecycle, etc.)
- **Code style conventions** for this module (naming, imports, TypeScript patterns)
- **Existing similar code** to reference as patterns
- **Test harness** requirements for this phase (BehaviorTestHarness, MockBlock, RuntimeTestBuilder, etc.)

### Context Gathering

For the affected components in this phase:

1. **Read AGENTS.md sections** relevant to the layer(s) being modified
2. **Examine similar existing code** to understand patterns:
   - If modifying parser: look at existing parser rules and visitor implementations
   - If modifying runtime: examine existing behavior/strategy implementations
   - If modifying components: review existing component examples and Storybook stories
   - If modifying tests: check the test harness examples in `tests/harness/`
3. **Identify the pattern** — Is this using Strategy pattern? Behavior composition? Fragment types?
4. **Note any gotchas** — Performance targets, disposal patterns, type system constraints

**Action**: Begin implementation with clear understanding of patterns and examples.

---

## Phase 3: Plan Implementation Sequence

**Map out the order of work to maximize validation and minimize rework:**

### Implementation Order Strategy

Follow this sequencing for most phases:

1. **Types & Interfaces First** — Define the contract before implementation
2. **Core Logic Next** — Implement the main feature logic
3. **Integration Points** — Wire into existing systems (parser, runtime, components)
4. **Tests Alongside** — Write tests incrementally as you implement
5. **UI/Components Last** — Build React components after core logic is solid
6. **Stories & Validation Last** — Create Storybook stories and run full validation

### Task Breakdown

For each implementation task from the issue:

- **What files need to be created/modified?** (list paths)
- **What's the dependency order?** (which tasks must finish before others?)
- **What testing is required?** (unit, integration, or component test?)
- **How do I validate this step?** (how to confirm it works before moving on?)

**Example task sequence**:
```
Task 1: Create src/hooks/useTimer.ts (types + main logic)
  └─ Validate: Unit tests in src/hooks/__tests__/useTimer.test.ts
Task 2: Create src/hooks/index.ts export
  └─ Validate: Import check works
Task 3: Create src/components/Timer.tsx component using hook
  └─ Validate: Unit tests in src/components/__tests__/Timer.test.tsx
Task 4: Create stories/Timer.stories.tsx
  └─ Validate: Storybook story renders
```

**Action**: Break phase into ordered, testable sub-tasks.

---

## Phase 4: Implement with Incremental Validation

**Execute implementation tasks incrementally, validating each step:**

### Step-by-Step Implementation Process

For each implementation task:

#### 4a. Create/Modify Files

- **Read existing code** in the same module to understand patterns
- **Follow project conventions** for naming, imports, and structure
- **Reference AGENTS.md** for code style (PascalCase components, camelCase functions, etc.)
- **Use path aliases** (`@/*` for src imports)
- **Import order**: external libraries → internal modules (`@/*`) → relative imports
- **Add TypeScript types** for all functions and components

#### 4b. Implement Core Logic

- **Implement incrementally** — get something working first, then refine
- **Follow existing patterns** — don't invent new patterns; reuse what's already there
- **Handle error cases** — consider what happens if inputs are invalid
- **Document non-obvious code** — add comments explaining "why" not "what"
- **Validate disposal patterns** — if working with runtime blocks, ensure `dispose()` is managed correctly
- **Consider performance** — if modifying parser/runtime, ensure operations meet performance targets

#### 4c. Write Tests Immediately

**Use Test-Driven Design**: Write simple tests as you implement, not after.

**For unit tests** (using test harness):
```typescript
// Example: Testing a behavior
import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '../../../../tests/harness';
import { MyBehavior } from '../MyBehavior';

describe('MyBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness();
  });

  it('should initialize with correct state', () => {
    const block = new MockBlock('test', [new MyBehavior()]);
    harness.push(block);
    expect(block.getBehavior(MyBehavior)).toBeDefined();
  });
});
```

**For component tests**:
```typescript
// Example: Testing a React component
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render with expected content', () => {
    const { container } = render(<MyComponent />);
    expect(screen.getByText('expected')).toBeDefined();
  });
});
```

**For integration tests** (using RuntimeTestBuilder):
```typescript
// Example: Testing strategy/compiler integration
import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness';

describe('MyStrategy', () => {
  it('should compile correctly', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('your script here')
      .build();
    // Assertions about compiled result
  });
});
```

#### 4d. Validate Each Task

After implementing a task:

```bash
# 1. Type check
bun x tsc --noEmit

# 2. Run relevant tests
bun test [test file] --run

# 3. Verify specific functionality
# (Run tests for just this feature, not full suite yet)
```

**Expected outcome**: Task is complete when:
- ✅ Code written and follows project conventions
- ✅ Tests passing for this task
- ✅ Type checker clean (no new errors)
- ✅ Code compiles and can be imported

---

## Phase 5: Integration & Full Validation

**Once all tasks are implemented, validate the complete phase:**

### Integration Checklist

- [ ] All implementation tasks completed
- [ ] All new files created and properly exported
- [ ] No TypeScript errors: `bun x tsc --noEmit`
- [ ] All unit tests passing: `bun run test --run`
- [ ] All integration tests passing: `bun run test:components --run`
- [ ] Component tests passing (if UI components created)
- [ ] No regressions: `bun run test:all --run` (baseline should match expected failures)

### Component Validation (if UI components modified)

```bash
# Start Storybook
bun run storybook

# Verify:
# 1. Storybook loads on http://localhost:6006
# 2. New stories render correctly
# 3. Component interactions work as expected in Controls panel
# 4. No console errors or warnings
```

### Build Validation

```bash
# Type check and build
bun x tsc --noEmit

# Verify storybook builds (takes ~30s, don't cancel!)
bun run build-storybook
```

---

## Phase 6: Validate Against Acceptance Criteria

**Confirm every acceptance criterion is met:**

### For Each Acceptance Criterion

1. **Read the criterion** — What is it asking for?
2. **Identify the validation** — How do I verify this is satisfied?
3. **Perform the validation** — Run tests, check code, verify behavior
4. **Document the result** — Note how criterion is satisfied

### Example Validations

```markdown
Criterion: "All code changes implemented"
→ Validation: Confirm all tasks from issue are complete ✅

Criterion: "Unit tests written and passing"
→ Validation: Run `bun test [new test file]` and verify all pass ✅

Criterion: "Type checking clean"
→ Validation: Run `bun x tsc --noEmit` and verify no new errors ✅

Criterion: "Storybook stories updated/created if needed"
→ Validation: Run `bun run storybook` and verify new stories render ✅

Criterion: "Code review approved"
→ Validation: This is a gate for human review ⏳
```

### Success Criteria Validation

From the phase, validate each success criterion:

```bash
# Example criteria from plan output
# "TimerBehavior exported from src/runtime/behaviors/index.ts"
→ Check file exists and export is there

# "useTimer hook with test coverage > 80%"  
→ Run `bun test src/hooks/__tests__/useTimer.test.ts --coverage`

# "Component story in stories/Clock/ renders without errors"
→ Start Storybook and verify story loads
```

---

## Phase 7: Code Quality & Review Readiness

**Ensure code is production-ready and review-friendly:**

### Code Quality Checklist

- [ ] **Naming** — All symbols follow project conventions (PascalCase components, camelCase functions)
- [ ] **Imports** — Organized correctly (external → internal `@/*` → relative)
- [ ] **Types** — All functions have TypeScript signatures, no `any` unless unavoidable
- [ ] **Comments** — Non-obvious logic is explained (why, not what)
- [ ] **Error Handling** — Invalid inputs and edge cases handled
- [ ] **Performance** — No unused code, efficient algorithms, operations meet perf targets
- [ ] **Consistency** — Code matches existing patterns in the codebase
- [ ] **No Warnings** — Type checker and linter (if applicable) emit no warnings

### Test Quality Checklist

- [ ] **Coverage** — All new functions/logic have tests
- [ ] **Test Harness** — Tests use BehaviorTestHarness/MockBlock/RuntimeTestBuilder, not inline mocks
- [ ] **Isolation** — Tests are independent and don't rely on other tests
- [ ] **Clarity** — Test names describe what's being tested
- [ ] **Edge Cases** — Error conditions and boundary cases are tested
- [ ] **Performance** — Tests run quickly (< 100ms each ideally)

### Documentation Checklist

- [ ] **Code Comments** — Complex logic is explained
- [ ] **Storybook Stories** — Components have corresponding stories with examples
- [ ] **Type Docs** — Complex types have JSDoc comments explaining intent
- [ ] **README Updates** — If adding new public APIs, update relevant documentation

### Cleanup Checklist

- [ ] No console.log() calls left behind (except intentional debugging)
- [ ] No commented-out code (delete it)
- [ ] No unused imports
- [ ] No TODO comments without context or owner
- [ ] Temporary debugging code removed

---

## Phase 8: Run Full Validation Suite

**Execute the complete validation before marking phase complete:**

### Pre-Submission Validation

```bash
# Type check
bun x tsc --noEmit

# Run all tests
bun run test:all --run

# Build Storybook (verify build succeeds)
bun run build-storybook

# Document any expected baseline failures
# (AGENTS.md says 369 TypeScript errors and 5 test failures are baseline)
```

### Expected Results

- ✅ No NEW TypeScript errors (existing baseline is acceptable)
- ✅ No NEW test failures (existing baseline is acceptable, ~5 tests)
- ✅ Storybook builds successfully
- ✅ Relevant stories render correctly
- ✅ All acceptance criteria demonstrate as met

### Failure Recovery

If validation fails:

1. **Type Errors** — Review errors and fix new ones you introduced
2. **Test Failures** — Debug failing tests (likely in your new code)
3. **Build Failures** — Usually type issues or missing exports
4. **Performance** — Profile slow operations and optimize

**Iterate**: Re-validate after fixes.

---

## Phase 9: Phase Completion & Handoff

**Confirm phase is complete and ready for next phase or review:**

### Completion Checklist

- [ ] All implementation tasks completed
- [ ] All acceptance criteria validated as met
- [ ] All tests passing (no new failures)
- [ ] Type checking clean (no new errors)
- [ ] Code quality reviewed and approved by self or team
- [ ] Storybook builds and stories render
- [ ] Documentation updates completed
- [ ] No blockers for dependent phases

### Handoff Documentation

Prepare handoff info for next phase or reviewer:

```markdown
## Phase [N] Completion Report

**Status**: ✅ Complete

### Implemented Tasks
- [x] Task 1: [Brief summary of what was built]
- [x] Task 2: [Brief summary of what was built]

### Key Files Changed
- Created: [src/new/file.ts]
- Modified: [src/existing/file.ts]
- Tests: [src/new/__tests__/file.test.ts]

### Validation Results
- Unit tests: ✅ All passing (X tests)
- Type checking: ✅ Clean
- Storybook: ✅ Stories render correctly
- Integration: ✅ No regressions

### Success Criteria Met
- ✅ All acceptance criteria validated
- ✅ All dependencies unblocked for next phases

### Known Issues or Future Work
- [If any]: Document for future phases or backlog

### Next Phase Readiness
Phase [N+1] is unblocked and ready to begin.
```

### Ready for Code Review

Phase is ready for code review when:
1. ✅ All implementation tasks completed
2. ✅ All tests passing
3. ✅ Type checker clean
4. ✅ Code quality reviewed
5. ✅ Storybook builds successfully
6. ✅ Completion report prepared

---

## Best Practices for Developer Agents

### 1. Incremental Implementation

- Implement one task at a time, validating each step
- Don't implement everything then try to fix it all at once
- Each task should produce testable, working code
- Stop and validate before moving to the next task

### 2. Test-Driven Development

- Write tests for new logic immediately after implementing it
- Use the test harness (BehaviorTestHarness, MockBlock, RuntimeTestBuilder)
- Don't defer tests to the end — they reveal bugs early
- Aim for 100% coverage of new code paths

### 3. Follow Existing Patterns

- Don't invent new patterns; reuse existing ones from AGENTS.md
- Use Strategy pattern where existing code uses it
- Use Behavior composition where existing code does
- Use Fragment types appropriately
- Refer to similar existing code for examples

### 4. Type Safety

- Define interfaces and types upfront
- Let TypeScript catch issues early
- Avoid `any` at all costs — use union types or generics instead
- Keep type definitions clear and documented

### 5. Code Quality

- Prioritize clarity over cleverness
- Name things descriptively (not `x`, `temp`, `data`)
- Comment the "why" not the "what"
- Keep functions small and focused
- Handle error cases explicitly

### 6. Validation as You Go

- After each task, run type check and relevant tests
- Don't accumulate issues; fix them immediately
- Verify integration works before moving forward
- Stop when something feels wrong — don't power through

### 7. Communication

- If a task seems ambiguous, ask for clarification
- If you discover blockers, raise them immediately
- Document assumptions and decisions made
- Prepare clear handoff info for next phase or reviewer

---

## Common Pitfalls to Avoid

❌ **Implementing everything at once** — Do it incrementally, validating each step
❌ **Deferring tests** — Write tests as you implement, not after
❌ **Inventing new patterns** — Reuse patterns from AGENTS.md and existing code
❌ **Ignoring type errors** — Fix TypeScript issues immediately, don't accumulate them
❌ **Not testing edge cases** — Consider error scenarios and boundary conditions
❌ **Assuming disposal happens** — If using runtime blocks, manage `dispose()` properly
❌ **Skipping performance checks** — Validate performance targets are met for parser/runtime changes
❌ **Not reading acceptance criteria** — Validate these explicitly, not just assume the code works
❌ **Leaving console.log() behind** — Clean up all debugging code before marking complete
❌ **Missing edge cases from brainstorm** — Reference technical notes and edge cases identified earlier

---

## Implementation Template

**For each implementation task, follow this template:**

### Task: [Task Name]

**Files affected**: [list of paths]

**Current step**: [Understand existing patterns / Implement logic / Write tests / Validate]

**What I'm doing**:
[Brief description of the implementation step]

**Code being created/modified**:
```typescript
// Key code changes here
```

**Tests being created**:
```typescript
// Test cases for this task
```

**Validation**:
```bash
# Commands to verify this works
```

**Result**:
✅ [Success — what was verified working]

---

## Environment & Commands Reference

### Core Commands

```bash
# Install dependencies
bun install

# Type checking
bun x tsc --noEmit

# Run tests
bun run test                    # All unit tests
bun run test --watch           # Watch mode
bun test src/path/file.test.ts # Specific file
bun run test:components        # Integration tests
bun run test:all               # All tests (unit + integration)
bun run test:coverage          # With coverage report
```

### Development Commands

```bash
# Start Storybook
bun run storybook

# Build Storybook (takes ~30s, don't cancel)
bun run build-storybook

# Type checking
bun x tsc --noEmit
```

### Test Harness Reference

```typescript
// BehaviorTestHarness — Unit testing behaviors
harness.withClock(date)              // Set mock clock
harness.withMemory(type, owner, val) // Pre-allocate memory
harness.push(block)                  // Push block to stack
harness.mount()                      // Mount current block
harness.next()                       // Call next() on block
harness.unmount()                    // Unmount and dispose
harness.advanceClock(ms)             // Advance time
harness.simulateEvent(name, data)    // Dispatch event
harness.wasEventEmitted(name)        // Assert event emitted
harness.stackDepth                   // Current stack size
harness.currentBlock                 // Top of stack

// MockBlock — Stub for testing behaviors
new MockBlock('id', [behaviors], { state: { /* custom */ } })
block.state.isComplete = true        // Mutable state
block.getBehavior(BehaviorType)      // Get behavior instance

// RuntimeTestBuilder — Integration testing
new RuntimeTestBuilder()
  .withScript('script here')
  .withStrategy(new MyStrategy())
  .build()
```

---

## Resources

- **Project Overview**: AGENTS.md (canonical source)
- **Code Style**: AGENTS.md "Code Style Guidelines"
- **Architecture**: AGENTS.md "Project Architecture" section
- **Runtime Patterns**: AGENTS.md "Critical Development Patterns"
- **Test Harness**: tests/harness/ and AGENTS.md "Test Harness" section
- **Plan Reference**: .github/prompts/plan.prompt.md
- **Brainstorm Reference**: .github/prompts/brainstorm.prompt.md

---

## Phase Completion Checklist

Use this before marking phase complete:

```markdown
## Phase Completion

- [ ] All implementation tasks from issue completed
- [ ] All new code follows project conventions (naming, imports, types)
- [ ] All new code uses existing patterns from AGENTS.md
- [ ] Unit tests written and passing (`bun run test --run`)
- [ ] Integration tests passing (`bun run test:components --run`)
- [ ] Type checker clean (`bun x tsc --noEmit`)
- [ ] No test regressions (`bun run test:all --run`)
- [ ] Storybook builds successfully (`bun run build-storybook`)
- [ ] Component stories render correctly (if UI changes)
- [ ] All acceptance criteria validated as met
- [ ] Code quality reviewed (naming, comments, error handling)
- [ ] No console.log() or debug code left behind
- [ ] Documentation/Storybook stories created/updated
- [ ] Ready for code review or next phase
```

---

## Phase 10: Create GitHub Issue for Next Phase or Review

**Handoff phase completion to the next step:**

Once phase implementation is complete and validated, create a new GitHub issue for either:
- **The next phase** (if there are dependent phases in the plan)
- **Code review and validation** (if this is the final phase)

### Determine the Next Action

**If there are dependent phases** (from plan "Blocks" relationships):
- Create implementation issue for next phase using implement.md template
- Reference this phase's completion
- Unblock the next phase by linking the completed issue

**If this is the final phase** (no dependent phases):
- Create a validation/review issue using a review template
- Reference all completed phase issues
- Document complete implementation artifacts

### GitHub Issue Template for Next Phase

Use: `.github/ISSUE_TEMPLATE/implement.md`

```markdown
---
title: "[Implement] [Phase N+1] [Next Phase Name]"
labels:
  - phase
  - phase-[N+1]
  - implement
  - features
milestone: [Sprint/Iteration]
assignees: []
---

## Previous Phase

**Completed Phase**: #[current phase issue] — "[Implement] Phase N: [Name]"
**Plan Reference**: #[parent plan issue]
**Phase Sequence**: [N+1] of [total]

## Prerequisites Met

✅ Phase [N] completed with all acceptance criteria validated
✅ No blockers identified for Phase [N+1]
✅ All artifacts from Phase [N] available for integration

## Phase Objective

[Copy from plan for Phase N+1]

## Core Artifacts from Phase [N]

**Created During Previous Phase**:
- [List key files created]
- [List key tests created]
- [List key exports/APIs]
- [List components or features added]

**Integration Points**:
- [How Phase N integrates into Phase N+1]
- [Dependencies from Phase N that Phase N+1 uses]
- [Test coverage from Phase N]

## Implementation Tasks

[Copy from plan for Phase N+1]

## Testing Strategy

[Copy from plan for Phase N+1]

## Dependencies

**Unblocked by**: #[current phase issue]
**Blocks**: #[future phase issues if any]

## Acceptance Criteria

[Copy from plan]

## Technical Notes

[From plan]
```

### GitHub Issue Template for Final Review

If this is the final phase, create a validation/completion issue:

```markdown
---
title: "[Review] [Feature Name] Implementation Complete"
labels:
  - review
  - validation
  - features
assignees: []
---

## Implementation Complete

✅ All delivery phases completed successfully

## Plan Reference

**Plan Issue**: #[parent plan issue]
**Brainstorm Reference**: #[brainstorm issue]

## Phases Completed

- ✅ #[Phase 1 issue] — [Phase 1 Name]
- ✅ #[Phase 2 issue] — [Phase 2 Name]
- ✅ #[Phase 3 issue] — [Phase 3 Name]
- [etc.]

## Core Artifacts Created

### New Files
- [src/new/file.ts]
- [src/new/file.tsx]
- [src/new/__tests__/file.test.ts]
- [stories/new/file.stories.tsx]
- [etc.]

### Modified Files
- [src/existing/file.ts] — Changes: [summary]
- [src/existing/file.tsx] — Changes: [summary]
- [etc.]

### Key Exports & APIs
- [Export 1]: [file]
- [Export 2]: [file]
- [etc.]

## Validation Results

✅ All unit tests passing (`bun run test:all`)
✅ Type checking clean (`bun x tsc --noEmit`)
✅ Storybook builds successfully
✅ No regressions in existing tests
✅ All acceptance criteria from plan met

## Test Coverage

- [Category]: [Number] tests added
- [Category]: [Number] tests added
- Overall coverage: [X]%

## Performance Validation

[If applicable: Performance benchmarks, timing measurements]

## Next Steps

1. Code review: [Specific areas to review]
2. Testing validation: [Scenarios to test]
3. Deployment: [Process if applicable]
4. Documentation: [Updates needed]

## Ready for Review

- [ ] All phases completed
- [ ] All artifacts identified
- [ ] Testing validated
- [ ] Ready for code review
- [ ] Ready for QA/validation
```

### What to Include in Handoff Issue

**When creating the next phase or review issue**:

1. **Reference this completed phase** — Link to the current implementation issue
2. **List artifacts created** — Files, exports, test coverage
3. **Identify integration points** — How this phase hands off to next
4. **Confirm prerequisites met** — No blockers for next phase
5. **Document any gotchas** — Lessons learned or constraints for next phase
6. **Link to parent plan** — Maintain traceback to original plan

### Key Artifacts to Document

Identify and list:

- **New files created** — With brief description
- **Files modified** — What changed and why
- **Tests added** — Test files and coverage
- **Exports and APIs** — New public interfaces
- **Storybook stories** — Component demonstrations
- **Breaking changes** — If any
- **Performance impact** — If applicable
- **Known limitations** — For next phase awareness

### Issue Labels & Organization

**For next phase issue**:
- `phase` — Delivery phase
- `phase-[N+1]` — Phase number
- `implement` — Implementation phase
- Link to parent plan and previous phase

**For review/validation issue**:
- `review` — Code review needed
- `validation` — Testing/validation needed
- `features` — Type of work
- Link to all phase issues

### Validation Before Creating Handoff Issue

- [ ] Current phase is complete (all acceptance criteria met)
- [ ] All artifacts are identified and documented
- [ ] Integration points to next phase are clear
- [ ] No blockers or missing dependencies
- [ ] Parent plan issue is referenced
- [ ] Previous phase issue is linked
- [ ] Issue title is clear and follows format
- [ ] Labels are consistently applied

**Action**: Create the next phase or review issue with all implementation artifacts clearly documented, ready for the next stage of delivery.

