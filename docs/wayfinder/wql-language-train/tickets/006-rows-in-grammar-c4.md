---
state: open
labels: [wayfinder:task]
title: "Rows-in-grammar cutover (C4)"
blocked-by: ["003-reconcile-spec-v2-with-event-store", "005-find-target-validation-c7"]
---

## Question

Land C4 using the head rule proven by ticket 001 and recorded in spec v2:
the grammar admits the unified head; the synthetic `find:_…` trick dies
(`wql.ts:248`); rows-only filter-key rules (exact `result:`/`block:`/`note:`
keys, no negation/wildcards) move from `runRows` post-parse into the AST
mapper — `runRows` executes only. Errors arrive at parse time.

Scope: `wql.grammar` + regenerated parser, `wql.ts` (`parseRowsQuery`
simplifies), `QueryService.runRows`, `rowsQuery.test.ts`,
`tests/parser/wql-grammar.test.ts`.
