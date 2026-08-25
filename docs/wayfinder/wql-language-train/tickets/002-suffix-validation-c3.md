---
state: closed 2026-08-24
assignee: serge # claimed 2026-08-24
labels: [wayfinder:task]
title: "Suffix validation errors (C3)"
blocked-by: []
---

## Resolution

Implemented on engine main (packages/wql + packages/ui guard).

One-line answer: every suffix kind (`by {}`, `.rollup()`, `last`, display-unit
`in`, scope `in`) now strips exhaustively per kind; more than one occurrence
yields `conflicts` naming the first and last spans ("Duplicate 'by' clause:
'by {week}' conflicts with 'by {effort}'"), surfaced as `error` at all three
parse entry points with precedence over other diagnostics; single-occurrence
parsing is byte-identical to pre-C3 (out-of-order singles still rejected via
the normal cannot-parse path). `wqlToClauses` rejects conflicting strings
(`null`) instead of silently truncating — caught by spec review.
Verification: wql suite 221/221, ui composer suite green incl. new rejection
regression test; workspace failures unchanged from clean tree (pre-existing
published-core staleness).

## Question

Land C3 on the branch: a second clause of the same kind is an error-as-value
naming both spans (`wqlSuffix.ts` anchored regexes today silently drop
duplicates — `by {a} by {b}` keeps `{b}` at :117-121; conflicting
`last`+range would too). Valid queries unaffected.

Engine-only: `wqlSuffix.ts`, `wql.ts` error assembly,
`wqlSuffix.test.ts`, `wql.test.ts`. Lands first — every later change
inherits trustworthy parsing.
