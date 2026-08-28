---
state: closed 2026-08-26
labels: [wayfinder:grilling]
title: "Parser fixture file format"
assignee: serge # claimed 2026-08-26
blocked-by: []
---

## Resolution

Spec: [001-parser-fixture-file-format.md](../assets/001-parser-fixture-file-format.md)

One-line answer: catalog at `packages/lang/tests/fixtures/parser/*.md`
(in-package, house pattern per engine's `fixtures/golden/`); one file
= frontmatter + `## Script` ```wod fence + `## Expected` metric-DSL blocks
(+ `## Errors` for failures); frontmatter is **flat meta lines** reusing the
repo's `parseFrontmatter` idiom, not nested YAML; DSL asserts
`Type value [@origin]` with time-literal→ms, amount+unit sugar, and
object-field tails; comparison is **closed-set by default with `match:
subset` opt-in**, statements matched positionally in line order, meta/timestamps/ids
ignored; parse-level errors are spec'd but currently unreachable
(`parseScript` is error-tolerant — verified).

Three approved examples landed and mechanically verified against real
`parseScript` output: `timers.md`, `amrap-with-units.md`, `climb-grades.md`
(anatomy extraction + option flow + metric-by-metric match). Two parser
quirks surfaced for the coverage-inventory fog: property-value spill reuses
statement id 1; `185/125 lb` parses as division with no **Choice Group**.

## Question

Concretize the fixture file format for "text → expected code statements":

1. File extension and catalog location (which package owns it; how package
   vitest projects and, later, the storybook workbench read the same files).
2. Delimitation: how the input whiteboard script and the expected form share
   one file — sections, fence markers, YAML sidesheet?
3. The readable vocabulary for expected **Statements**: primitives, fused
   **Metrics** (type/unit/value/origin), **Hints**, **Choice Groups** —
   expressed in CONTEXT.md terms, terse enough to hand-author.
4. Semantic comparison rules: exact vs subset matching, statement/primitive
   ordering, which meta fields (line/column spans) are ignored.
5. Error-case fixtures: expected parse/validation failures and their
   messages.

Constraints (fixed at charting): human-readable in-file expectations;
parse + dialect-metrics stage only; one file = one test, auto-discovered.

Deliverable: written format spec plus ~3 hand-authored example files Serge
approves — the contract the build ticket (004) implements against.
