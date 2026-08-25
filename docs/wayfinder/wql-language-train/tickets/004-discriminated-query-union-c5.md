---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "Discriminated query union (C5)"
blocked-by: ["002-suffix-validation-c3"]
---

## Resolution

Landed on engine main, commits `da6c42a` + `172cc75`.

`family: 'aggregate' | 'find' | 'rows'` on all three ASTs; guards
`isFindQuery`/`isRowsQuery`/new `isAggregateQuery` read the field;
`ParsedQuery` → `ParsedAggregateQuery` clean cutover (no alias, verified
zero bare references repo-wide). QueryService stub results and
`runJoined`'s internal find call build family-honest ASTs;
`WqlDiagnosticsStrip` dropped its `!isFindQuery` + `as any` pair for the
positive guard; `useWqlStageCounts` re-exports the package union instead
of re-declaring it. Contract tests pin family on every parse path
(including error results) and guard discrimination.

Review rounds: spec caught an incomplete fixture sweep — 18
`ParsedFindQuery` + 7 ui `QueryResult` literals lacked family (masked:
tsconfigs exclude tests/, vitest doesn't typecheck) — swept in the second
commit, plus findEffort's leftover `'target' in parsed` and an unpinned
engine export.

Operational finding for the release ticket: **core dist was stale on
engine main** — its build failed on `UnifiedEventRecord` until core was
rebuilt (dist is gitignored, nothing committed). Rebuild the full chain
before publishing (ticket 010).

Not done here (out of this ticket's reach): app-repo fixture ASTs
(`entrySearch.test.ts`, `homeAnalyticsData.ts`) still build legacy-shape
objects against published `^0.6.36` — they sweep in the consumption
ticket (011).

## Question

Land C5 on the branch: `family: 'aggregate' | 'find' | 'rows'` on every AST
variant (today discrimination is inconsistent — `agg` presence, `'target' in
parsed`, `family === 'rows'`); guards read the field; rename
`ParsedQuery` → `ParsedAggregateQuery` as a clean cutover, no alias.

Mechanical sweep across dispatch sites and hand-built fixture ASTs
(`entrySearch.test.ts`, `homeAnalyticsData.ts:47-123`, …) — LSP-assisted.
Asset 003 notes unification makes this simpler: one record + `grain`.
