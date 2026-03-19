# Brainstorm Prompt: Feature Requirements & Solution Analysis

You are an expert code architect analyzing a feature request or problem statement. Your goal is to deeply understand the requirements and propose solutions that align with the existing codebase architecture and patterns.

## Your Task

Transform the issue into actionable technical insights by:
1. **Extracting Requirements** — What needs to be built or fixed?
2. **Exploring the Codebase** — How does the existing system work?
3. **Identifying Patterns** — What architectural patterns and conventions apply?
4. **Proposing Solutions** — How should this be addressed given what exists?

---

## Phase 1: Understand the Requirement

**Examine the issue and answer:**

- **Core Problem**: What is the user trying to accomplish or what is broken?
- **Success Criteria**: How will we know this is working? What are the measurable outcomes?
- **Constraints**: Are there limitations, dependencies, or pre-requisites?
- **Scope**: Is this a new feature, bug fix, refactor, or documentation update?
- **User Impact**: Who uses this feature and why do they need it?

**Action**: Summarize the requirement in 2-3 clear sentences.

---

## Phase 2: Explore Relevant Code

**Systematically explore the codebase:**

### For Feature Requests:
- Find similar existing features or components
- Identify the architectural layer where this belongs (parser, runtime, components, editor, etc.)
- Look at test patterns and how similar features are tested
- Check documentation and Storybook stories for related features

### For Bug Fixes:
- Locate the problematic code
- Understand the call chain and dependencies
- Review recent changes to this area
- Check test coverage for the affected functionality

### Key Areas to Explore:
- **`src/parser/`** — If parsing or language features are involved
- **`src/runtime/`** — If execution, JIT compilation, or runtime behavior is involved
- **`src/components/`** — If UI components or fragments are involved
- **`src/editor/`** — If editor integration or suggestions are involved
- **`tests/`** — Examine test patterns and the test harness
- **`stories/`** — Review Storybook stories for UI patterns and documentation

**Action**: Document what you find, noting:
- File paths of relevant code
- Key interfaces/types involved
- Existing patterns and conventions
- Test coverage approach

---

## Phase 3: Identify Architectural Patterns

**Map the solution to project conventions:**

### Core Patterns in WOD Wiki:
- **Runtime Block Lifecycle** — Constructor-based init + consumer-managed disposal
- **Strategy Pattern** — Strategy implementations for compilation phases
- **Behavior System** — Composable behaviors for runtime blocks
- **Fragment Types** — Specialized fragment classes for workout metrics
- **Test Harness** — Use `BehaviorTestHarness`, `MockBlock`, `RuntimeTestBuilder` for testing

### Code Style Conventions:
- **Naming**: Components `PascalCase`, functions `camelCase`, constants `UPPER_SNAKE_CASE`
- **Imports**: External → internal (`@/*`) → relative
- **Types**: Prefer `interface` for object shapes, strict TypeScript
- **Styling**: Tailwind CSS only, no custom CSS
- **Testing**: Co-locate tests with source, use test harness instead of inline mocks

**Action**: Identify which patterns apply to your solution.

---

## Phase 4: Propose Solutions

**For each viable solution, document:**

1. **Approach Name** — Short descriptive title
2. **How It Works** — Brief technical description (2-3 sentences)
3. **Affected Components** — What files/modules change
4. **Implementation Complexity** — Low / Medium / High
5. **Alignment with Existing Patterns** — How well it fits current architecture
6. **Testing Strategy** — What tests are needed
7. **Risks or Tradeoffs** — Any downsides or considerations

### Evaluation Criteria:
- ✅ Aligns with existing architecture and patterns
- ✅ Minimal changes to existing files
- ✅ Reuses existing abstractions and components
- ✅ Testable with existing test harness
- ✅ Follows project naming and code style conventions
- ✅ Documented with examples if new public APIs

**Action**: Present 2-3 possible solutions, ranked by suitability.

---

## Phase 5: Recommend Implementation Path

**For the recommended solution, provide:**

1. **Summary** — Why this approach is best
2. **Files to Create/Modify** — Specific paths and operations
3. **Key Implementation Details** — Notable code patterns or gotchas
4. **Testing Plan** — Test categories and test case names
5. **Validation Steps** — How to verify the solution works
6. **Documentation Needs** — Any updates to docs or Storybook

**Include concrete examples** of key code patterns where appropriate.

---

## Phase 6: Consider Alternatives and Edge Cases

**Before concluding:**

- Are there simpler solutions you initially overlooked?
- What edge cases or error scenarios exist?
- How does this interact with other parts of the system?
- Are there performance implications?
- What happens if this feature is combined with other features?

---

## Output Format

Structure your analysis as follows:

```markdown
# Feature: [Feature Name]

## 1. Requirement Analysis
- **Core Problem**: [...]
- **Success Criteria**: [...]
- **Scope**: [...]

## 2. Code Exploration
### Relevant Files
- [file path]: [what it does]

### Similar Existing Features
- [feature]: [location and how it's relevant]

### Key Patterns
- [pattern name]: [how it applies]

## 3. Proposed Solutions

### Solution A: [Name]
[4-5 sentence explanation]
- Implementation Complexity: [Low/Medium/High]
- Alignment: [Good/Excellent/Fair]
- Key Files: [paths]

### Solution B: [Name]
[similar structure]

## 4. Recommendation
**Recommended: Solution [X]**

[Paragraph explaining why this is the best approach]

### Implementation Steps
1. [Create/modify file]: [specific changes]
2. [Create/modify file]: [specific changes]
3. [Add tests]: [test cases]

### Testing Strategy
- [Test category]: [test cases]

## 5. Validation & Next Steps
- [ ] [Validation step 1]
- [ ] [Validation step 2]
- [ ] [Update documentation]
```

---

## Phase 6: Create GitHub Issue for Planning Phase

**Handoff the brainstorm analysis to the planning phase:**

Once your brainstorm analysis is complete, create a new GitHub issue using the **Plan template** (`.github/ISSUE_TEMPLATE/plan.md`) to transition to the planning phase.

### GitHub Issue Template Selection

Use: `.github/ISSUE_TEMPLATE/plan.md`

### Issue Structure

```markdown
---
title: "[Plan] [Feature/Fix Name]"
labels:
  - phase
  - plan
  - features  # or bugfix, refactor, etc.
assignees: []
---

## Brainstorm Reference

**Brainstorm Issue**: #[number] — "[Feature] Brainstorm"
**Analysis Date**: [Date of brainstorm completion]

## Recommended Solution

[Copy from brainstorm output: The recommended solution section]

## Core Artifacts from Brainstorm

- **Requirement Analysis**: [Brief bullet summary of problem, success criteria, scope]
- **Recommended Approach**: [Solution name and why it was chosen]
- **Implementation Steps**: [Copy or link to the numbered implementation steps from brainstorm]
- **Affected Components**: [List of files/modules that will change]
- **Testing Strategy**: [Unit, integration, and validation test categories]
- **Estimated Complexity**: [Low/Medium/High]
- **Key Patterns**: [Architectural patterns identified in brainstorm]
- **Constraints & Risks**: [Dependencies, known limitations, and risks identified]

## Next Steps

1. Review the brainstorm analysis (see reference above)
2. Execute the planning phase using `.github/prompts/plan.prompt.md`
3. Break the recommended solution into delivery phases
4. Create GitHub issues for implementation using implement.md template
```

### What to Include

**From your brainstorm output, copy these sections into the issue body**:

1. **Recommended Solution Title** — Copy the exact title/name of the solution
2. **Why This Solution** — Copy the paragraph explaining why this was chosen
3. **Implementation Steps** — Copy the numbered list from the brainstorm
4. **Affected Components** — Copy the list of files/modules
5. **Testing Strategy** — Copy from brainstorm analysis
6. **Success Criteria** — Copy from brainstorm requirement analysis
7. **Constraints & Risks** — List any constraints or known limitations from brainstorm

### Key Artifacts to Reference

Identify and link to these brainstorm outputs:

- The **brainstorm analysis document** (if stored separately)
- The **requirement analysis section** (problem, success criteria)
- Examples of **similar existing features** you referenced
- **Edge cases and scenarios** you identified
- **Performance considerations** if applicable

### Issue Labels

Add labels to categorize the work:
- `phase` — This is a delivery phase
- `plan` — Planning phase designation  
- `feature` or `bugfix` or `refactor` — Type of work
- Any domain labels (e.g., `parser`, `runtime`, `components`, `editor`)

### Validation Before Creating Issue

- [ ] Issue title is clear: "[Plan] [Feature Name]"
- [ ] All core artifacts from brainstorm are referenced
- [ ] Recommended solution is clearly identified
- [ ] Implementation steps are specific (not vague)
- [ ] Testing strategy is outlined
- [ ] Links to related brainstorm materials
- [ ] Issue is actionable for planning phase agent

**Action**: Create the GitHub issue with all brainstorm artifacts clearly documented for handoff to the planning phase.

---

## Best Practices for This Analysis

1. **Read AGENTS.md First** — It's the canonical source for project conventions
2. **Examine Real Examples** — Look at how similar features are implemented, not just documentation
3. **Consider Performance** — Runtime operations have specific performance targets (see AGENTS.md)
4. **Test-First Thinking** — Identify test patterns early, use the test harness
5. **Minimize Surface Area** — Prefer solutions that change few files and reuse existing abstractions
6. **Document Assumptions** — Be explicit about why you chose this approach
7. **Anticipate Questions** — Address why not the alternatives

---

## Resources

- **Project Overview**: AGENTS.md (canonical source)
- **Architecture**: AGENTS.md "Project Architecture" section
- **Test Patterns**: tests/harness/ and AGENTS.md "Test Harness" section
- **Code Examples**: Review similar features in stories/ and src/
- **TypeScript Setup**: tsconfig.json and existing typed modules

