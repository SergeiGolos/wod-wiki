<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: Initial adoption (all principles added)
- Added sections: Core Principles; Quality Gates; Development Workflow; Governance
- Removed sections: None
- Templates requiring updates:
	✅ .specify/templates/plan-template.md (footer version and path)
	✅ .specify/templates/spec-template.md (reviewed - no changes needed)
	✅ .specify/templates/tasks-template.md (reviewed - no changes needed)
	✅ .specify/templates/agent-file-template.md (reviewed - no changes needed)
- Follow-up TODOs: None
-->

# WOD Wiki Constitution

## Core Principles

### I. Tests-First and Continuous Verification (NON-NEGOTIABLE)
WOD Wiki MUST practice TDD. For any user-visible behavior or public API:
- Write unit tests (Vitest) and/or interaction tests (Storybook test runner) that FAIL
	before implementation.
- Every PR MUST include tests covering new behavior and regression fixes.
- Critical UI flows MUST have Storybook interaction tests; core language/runtime logic
	MUST have deterministic unit and integration tests.
Rationale: Prevent regressions in the workout language, editor, and runtime while
enabling safe refactors.

### II. Language-as-Contract (WodScript Stability)
The WodScript grammar, tokens, and semantics define a contract with users:
- Any breaking change to syntax or semantics REQUIRES a Major version and a documented
	migration path.
- Grammar and visitors MUST be documented and reflected in examples and Storybook.
- Deprecations MUST be announced one Minor ahead, with tests demonstrating old and new
	behaviors until removal.
Rationale: Workout definitions are content users keep; stability preserves value.

### III. Deterministic Runtime and Time Control
Runtime execution MUST be deterministic and reproducible:
- Inject clocks/timers; forbid implicit reliance on system time in logic.
- No hidden global state; state transitions must be explicit and observable.
- Event ordering MUST be well-defined; asynchronous behavior MUST preserve determinism
	in outcomes.
Rationale: Reliable results, predictable audio cues, and reproducible runs.

### IV. Observability and Debuggability
The system MUST be inspectable during development and usage:
- Structured logging and traceable event IDs for key runtime transitions.
- Developer-mode diagnostics in Storybook to visualize parser trees and runtime events.
- Errors MUST be actionable: clear messages, context, and failing input excerpts.
Rationale: Faster feedback loops and simpler issue reproduction.

### V. API Surface, SemVer, and Simplicity
Keep the public API small, composable, and versioned via SemVer:
- Public modules and types MUST be explicitly exported and documented.
- Breaking changes REQUIRE Major version; additive changes are Minor; fixes/wording are
	Patch.
- Prefer small, orthogonal features over complex all-in-ones (YAGNI, avoid incidental
	complexity).
Rationale: Stability for consumers and maintainable evolution.

## Quality Gates

The following gates MUST pass on every change:
- Lint and Typecheck: No new TypeScript errors or ESLint critical issues.
- Tests: Unit tests (Vitest) and Storybook interaction tests pass in CI.
- Determinism: New runtime features include tests that assert deterministic outcomes.
- Docs: Public API changes and language changes are reflected in README/Storybook
	examples and, where relevant, migration notes.

## Development Workflow

Use the `.specify` templates to plan and track work:
- Spec first: Use `spec-template.md` to produce clear, testable requirements.
- Plan: Use `plan-template.md` and perform a Constitution Check; if violations are
	necessary, document them under Complexity Tracking.
- Tasks: Generate `tasks.md` from the plan; follow TDD ordering (tests must fail before
	implementation).
- Reviews: PRs MUST justify any Constitution deviations and include tests and docs.

## Governance

This Constitution supersedes other ad-hoc practices where in conflict.
- Amendment procedure: Open a PR labeled "governance" with a rationale, version bump
	proposal (SemVer), and migration/communication plan.
- Versioning policy (for this document):
	- MAJOR: Backward-incompatible governance or principle redefinitions/removals.
	- MINOR: New principle/section or materially expanded guidance.
	- PATCH: Clarifications/wording/typos with no semantic change.
- Compliance review: During planning and PR review, run the Constitution Check and
	document outcomes. Violations MUST be justified or resolved before merge.

**Version**: 1.0.0 | **Ratified**: 2025-09-22 | **Last Amended**: 2025-09-22