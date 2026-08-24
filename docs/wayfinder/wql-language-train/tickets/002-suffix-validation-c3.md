---
state: open
labels: [wayfinder:task]
title: "Suffix validation errors (C3)"
blocked-by: []
---

## Question

Land C3 on the branch: a second clause of the same kind is an error-as-value
naming both spans (`wqlSuffix.ts` anchored regexes today silently drop
duplicates — `by {a} by {b}` keeps `{b}` at :117-121; conflicting
`last`+range would too). Valid queries unaffected.

Engine-only: `wqlSuffix.ts`, `wql.ts` error assembly,
`wqlSuffix.test.ts`, `wql.test.ts`. Lands first — every later change
inherits trustworthy parsing.
