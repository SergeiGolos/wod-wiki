---
state: open
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Composer on ASTs (C6 ui package)"
blocked-by: ["009-ast-only-structured-interface-c6"]
---

## Question

Move `WqlComposer` internals (engine repo, `packages/ui`) onto the C6 world:
composer state is the AST; strings are produced only through the serializer
at emit points. Retire the clause model from the package surface —
`clausesToWql`, `wqlToClauses`, `pivotClauses`, `CLAUSE_META`,
`defaultMetricsClauses`. Composer round-trip suites go green against the
property-tested serializer.

Export removal is breaking for the app; it ships in the same train as the
app-side call-site migration — the release ticket sequences the two
([Consume the train](011-consume-the-train-in-the-app.md)).
