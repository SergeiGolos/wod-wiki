---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "AST-only structured interface (C6)"
blocked-by: ["008-de-overload-in-c2"]
---

## Resolution

Landed on engine main, commits `0942f88` + `1b9b771`.

`packages/wql/src/serialize.ts` — total serializer over the C5 union,
exported beside `parseQuery` via the package index. Proven by
`tests/serialize.test.ts`:

- `serialize(parse(x)) === x` on a 15-string canonical corpus;
- `parse(serialize(a))` structurally equal to `a` — equality excludes `raw`
  (provenance text) and `advisories` (parse-time deprecation notices), the
  documented weakening of the literal `===` property: serialization emits
  modern canonical syntax, so a legacy-normalized AST cannot reproduce its
  own advisories;
- serializer fixed point: `serialize(parse(serialize(a))) === serialize(a)`;
- 400-iteration seeded property test across all three families with
  generator-coverage guards (370 unique texts, 74 joins, 206 windows);
- errored ASTs echo `raw` (no structure to re-emit — keeps the function
  total).

Round-trip contract is text-surface-representable ASTs; three unexpressible
value shapes are documented in the serializer (quotes inside values — the
quoted token has no escape; quoted values with `wildcard: true` — the parser
forces wildcard=false on quoted atoms; exponential-number thresholds).

Canonical forms pinned: aggregate heads always braced (`sum:tis{}`), find
braces only with filters (`find:note`), `rows:all` for un-narrowed
outputType, suffix order by/rollup/unit/window/where matching the peel
order, `by {a, b}` dims with space, filters comma-tight, catalog-id values
bare, multi-word values quoted.

Review round: shared `serializeAggHead` (aggregate + metric join halves),
`serializeFindHead` composes `serializeFindHalf`; `serialize` pinned in the
index.test.ts public-surface test; test helper made file-local.

Out-of-scope rider noted: the commit also fixes the C2-round composer test
assertion (`'tags'` → `'tag'` clause type) — correct but UI-package; ticket
013 owns that package.

Verification: wql vitest 274/274, root suite 1197/0, tsc clean, build clean.
## Question

Land the engine half of C6 against the settled post-C1/C2 AST: a total
`serialize.ts` exported beside `parseQuery` with the properties
`serialize(parse(x)) === x` for canonical inputs and `parse(serialize(a)) ===
a` for all ASTs — proven by a property test. Strings remain the only format at
document edges.

Asset 003: unification makes C6 trivially satisfied data-wise; the work is
the serializer + property test. The UI-package half has its own ticket:
[Composer on ASTs](013-composer-on-asts-ui-package.md).
