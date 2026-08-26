# Ticket 001 — Lezer unified-head conflict spike (evidence)

**Status**: resolved 2026-08-24 · prototype · empirical, run against
`wod-wiki-engine@main` (post PR #1) with its own
`lezer-generator --typeScript` toolchain.

## Question

Can the grammar admit the rows model head — primary `rows:<target>{…}` plus
the legacy alias `rows:{…}` (colon present, target absent) — under the
single-word-token discipline (`packages/wql/src/grammar/wql.grammar:14-29`)?

## Evidence

Control (unchanged grammar) parses with the committed parser, suffixes peeled
JS-side as production does:

| Input | Result |
|---|---|
| `sum:tis{}` | ok |
| `sum:totalVolume{discipline:strength} by {effort}.rollup(1w) last 6w` | ok |
| `rows:results{note:abc}` | **ok — targeted rows needs no grammar change** |
| `rows:{note:abc} last 4w` | **ERROR** — empty node after Aggregator |
| `find:note{tags:pr} in journal last 8w` | ok |

Three head-rule variants generated:

| Variant | Rule | Generator verdict |
|---|---|---|
| A | `Head { Aggregator (colon Metric)? }` (prototype literal) | clean — **but wrong language**: covers `rows {…}` (no colon), not the actual `rows:{…}` alias |
| B | `Head { Aggregator colon Metric? }` | **conflict** — `Overlapping tokens Word and By used in same context (example: "b" vs "by") / After: Aggregator colon` |
| C1 | dedicated branch `\| RowsPrefix { Aggregator colon }` | **same conflict, same site** — shared `Word colon` prefix puts both continuations in one state |

## Root cause

Any parser state *after* `Aggregator colon` that tolerates a missing metric
admits both a `Word` continuation (Metric) and Head-completion lookaheads
(`By`, `braceOpen`, `.rollup`). The token discipline makes `By` a keyword
token, so `Word` ∩ `By` overlap — exactly the global-shadowing failure the
grammar header documents. The conflict is **structural to the shared
`Word colon` prefix**, so every optional-metric shape and the dedicated-node
fallback share it. Fixing it means abandoning the `by` keyword token — a
discipline overhaul the header records as a hard-won lesson against.

## Recommendation

Keep the grammar strict (`Head { Aggregator colon Metric }`). C4's real goals
need **no grammar change**:

1. Targeted `rows:<target>` already parses natively (control row 3).
2. The synthetic `find:_…` trick dies by rejecting/normalizing the bare alias
   at parse entry instead.
3. Filter-key validation moves into the AST mapper; `runRows` executes only.

The bare `rows:{…}` alias is a **language decision for spec v2**, two options:

- **Retire it** — require explicit targets; compat pass (C2-style advisory)
  migrates dashboards. Cleanest.
- **Placeholder normalization** — parse-entry rewrite before the parser sees
  text (same JS seam that peels `last`/`in` today), mapper validates the
  placeholder like any target (C7-widened covers it):

```ts
// parse entry, rows dispatch only — mirrors wqlSuffix peeling seam
function normalizeBareRowsAlias(queryText: string): string {
  const normalized = queryText.replace(/^rows:\s*\{/, 'rows:_:{');
  return normalized === queryText ? queryText : normalized;
}
```

Feeds ticket [Reconcile spec v2](../tickets/003-reconcile-spec-v2-with-event-store.md)
agenda item 7; C4 implementation ([Rows-in-grammar cutover](../tickets/006-rows-in-grammar-c4.md))
proceeds either way with a strict grammar.
