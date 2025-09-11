# Copilot Agents – How to pick and invoke the right one

Use this guide to select the right agent for your task and to wire it into a GitHub Issue via a simple “System Prompt” block.

## How to use in GitHub Issues

Add a “System Prompt” section to your issue body with two lines:

- agent=<agent-key>
- instruction_file=.instructions/<instruction-file>

Example:

- agent=write-code
- instruction_file=.instructions/__write-code.md

Copilot will load the specified instructions and behave as that agent for the issue.

## Agent catalog (keys, when to use, instruction files)

- write-code — Implement small, safe code changes per an existing design; updates tasks and runs checks.
  - instruction_file: .instructions/__write-code.md
  - use when: a feature is already designed and you want code delivered.

- debug-code — Reproduce, isolate, fix a bug; adds a regression test and validates.
  - instruction_file: .instructions/__debug-code.md
  - use when: errors, failing tests, or unclear defects.

- design — Turn requirements into a technical design plus requirements docs.
  - instruction_file: .instructions/__design.md
  - use when: you need a clear design/requirements before coding.

- plan — Break a feature into atomic, testable tasks in a tasks.md backlog.
  - instruction_file: .instructions/__plan.md
  - use when: you need an implementation plan or task breakdown.

- design-test — Produce a focused testing plan (unit/integration/E2E, risks, data).
  - instruction_file: .instructions/__design-test.md
  - use when: you need a test strategy/coverage before or during dev.

- review-code — Review a diff/PR for correctness, quality, and conventions.
  - instruction_file: .instructions/__review-code.md
  - use when: you have a code change to review with actionable feedback.

- research — Deep-dive on questions/topics; captures findings and sources.
  - instruction_file: .instructions/__research.md
  - use when: you need exploration, options, or external references.

- bootstrap — Create/refresh .ground/ foundational docs for the project.
  - instruction_file: .instructions/__bootstrap.md
  - use when: starting a repo or establishing project-wide standards.

- draw — Convert a design into an Obsidian Canvas map linking repo files.
  - instruction_file: .instructions/__draw.md
  - use when: visual architecture/flow map is helpful.

- journal — Generate user/dev/operator docs from existing specs/ground.
  - instruction_file: .instructions/__journal.md
  - use when: you need external-facing docs or summaries.

- catalog — Keep library summaries in sync with .ground/ content.
  - instruction_file: .instructions/__catalog.md
  - use when: refreshing the internal library catalog.

## Copy-paste System Prompt snippets

Use one of these blocks in your issue under “System Prompt”.

- write-code
  - agent=write-code
  - instruction_file=.instructions/__write-code.md

- debug-code
  - agent=debug-code
  - instruction_file=.instructions/__debug-code.md

- design
  - agent=design
  - instruction_file=.instructions/__design.md

- plan
  - agent=plan
  - instruction_file=.instructions/__plan.md

- design-test
  - agent=design-test
  - instruction_file=.instructions/__design-test.md

- review-code
  - agent=review-code
  - instruction_file=.instructions/__review-code.md

- research
  - agent=research
  - instruction_file=.instructions/__research.md

- bootstrap
  - agent=bootstrap
  - instruction_file=.instructions/__bootstrap.md

- draw
  - agent=draw
  - instruction_file=.instructions/__draw.md

- journal
  - agent=journal
  - instruction_file=.instructions/__journal.md

- catalog
  - agent=catalog
  - instruction_file=.instructions/__catalog.md

## Notes

- Many agents read/write under `.blackboard/specs/{feature or ticketId}/`. See `.instructions/blackboard.md` for structure and best practices.
- The `.ground/` folder holds project-wide standards and context referenced by multiple agents.
- Keep issue bodies concise and link any relevant files (design.md, tasks.md, failing test output).
