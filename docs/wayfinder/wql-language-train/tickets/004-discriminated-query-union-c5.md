---
state: open
labels: [wayfinder:task]
title: "Discriminated query union (C5)"
blocked-by: ["002-suffix-validation-c3"]
---

## Question

Land C5 on the branch: `family: 'aggregate' | 'find' | 'rows'` on every AST
variant (today discrimination is inconsistent — `agg` presence, `'target' in
parsed`, `family === 'rows'`); guards read the field; rename
`ParsedQuery` → `ParsedAggregateQuery` as a clean cutover, no alias.

Mechanical sweep across dispatch sites and hand-built fixture ASTs
(`entrySearch.test.ts`, `homeAnalyticsData.ts:47-123`, …) — LSP-assisted.
Asset 003 notes unification makes this simpler: one record + `grain`.
