---
state: open
labels: [wayfinder:task]
title: "AST-only structured interface (C6)"
blocked-by: ["008-de-overload-in-c2"]
---

## Question

Land the engine half of C6 against the settled post-C1/C2 AST: a total
`serialize.ts` exported beside `parseQuery` with the properties
`serialize(parse(x)) === x` for canonical inputs and `parse(serialize(a)) ===
a` for all ASTs — proven by a property test. Strings remain the only format at
document edges.

Asset 003: unification makes C6 trivially satisfied data-wise; the work is
the serializer + property test. The UI-package half has its own ticket:
[Composer on ASTs](013-composer-on-asts-ui-package.md).
