---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
title: "Find-target validation (C7)"
blocked-by: ["004-discriminated-query-union-c5"]
---

## Resolution

Landed on engine main, commits `9ef6dcc` + `85a2da0`.

Closed plane enums at parse: `find:` validates against `WQL_FIND_TARGETS`
(note|block|effort); `rows:` against new `WQL_ROWS_TARGETS` = content
planes ∪ `WQL_RESULT_PLANES` (re-exported core `KNOWN_OUTPUT_TYPES` — the
promoted `outputType` column, per asset 003 "validates against naturally").
Unknown targets error-as-value listing valid targets (`Unknown find target
"x". Try: note, block, effort`); join halves inherit validation through
`parseJoinClause`'s reuse of `parseFindQuery`.

Scope decisions recorded: the STORE vocabulary stays open (core ticket 002
— unknown outputTypes stored and returned); only the TEXT surface closes.
Custom types stay queryable programmatically via hand-built ASTs — rowsQuery
tests cover runtime narrowing that way plus parse-level rejection.

Composer verified: picker derives only valid targets; **salvage no longer
rewrites unknown `find:x` into `find:note`** — it rejects so the engine
error surfaces. Rows salvage restores verbatim (lossless) by design.

RED-first C7 block in wql.test; vocabulary/engine re-export pins. Review
verdicts: spec `correct`, standards `clean` (one pre-existing stale JSDoc
fixed in follow-up). Docs cookbook row deferred to the docs-cutover ticket
(012).

## Question

Land C7 on the branch: `find:`/`rows:` targets validate at parse against
`WQL_FIND_TARGETS` (`vocabulary.ts:85`) widened to the result planes per the
rows model — unknown target becomes an error-as-value listing valid targets
(today any Word parses and silently returns empty at runtime). Closed enum;
composer target picker reads the same vocabulary (verify).

Per asset 003, C7's targets are now promoted columns, which it validates
against naturally.
