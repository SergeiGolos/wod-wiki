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

Spec v2 additions (ticket 003): the bare `rows:{…}` alias **retires** —
`rows:all` is the explicit no-narrowing pseudo-target (`WQL_ROWS_TARGETS`
gains `all` via C2's vocabulary work; until C2's normalizer lands in the
same release, bare queries error with a migrate-to-`all` message). Content
 planes (`rows:note{note:x}`) gain their execution narrowing here. The
head rule is proven (ticket 001): targeted `rows:<t>` parses natively;
no grammar change unless the de-synthesized filter path needs a node.

Scope: `wql.grammar` + regenerated parser, `wql.ts` (`parseRowsQuery`
simplifies), `QueryService.runRows`, `rowsQuery.test.ts`,
`tests/parser/wql-grammar.test.ts`.
