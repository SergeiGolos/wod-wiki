---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
labels: [wayfinder:task]
title: "Rows-in-grammar cutover (C4)"
blocked-by: ["003-reconcile-spec-v2-with-event-store", "005-find-target-validation-c7"]
---

## Resolution

Landed on engine main, commits `17ecde2` + `3c19185`.

One validation layer: `parseRowsQuery` hands the whole primary text to the
unchanged Lezer grammar (`Word colon Word` fits `rows:<target>` natively,
ticket 001) — the synthetic `find:_` head is dead, and **no grammar change
was needed**. Rows filter rules (exact `result:`/`block:`/`note:` keys, no
negation/wildcards) and the scope requirement moved into the parse mapper;
`runRows` executes only.

Bare `rows:{…}` retires: structurally ungrammatical, intercepted before the
tree parse for a migrate-to-`rows:all` message (conflict errors still win
C3-style when both apply). `rows:all` normalizes to no narrowing;
`WQL_ROWS_TARGETS` gains `all`. Content-plane targets scope by content —
`rows:note{note:x}` now executes instead of silently matching zero rows.

Review rounds: spec caught **two live in-repo emitters** still producing the
bare form (sessionQueryWql session blocks, RowsResultsChrome's widen query)
— both migrated; the CLI `--stdin-log` rows test also migrated (this was
the one failing root-suite test). Standards nits: vocabulary dedupe
(content planes derive from `WQL_FIND_TARGETS`, scope keys live in
`WQL_ROWS_TARGETS`'s vocabulary as `WQL_ROWS_SCOPE_KEYS`), message const,
JSDoc/test-name hygiene.

Verification: wql 231/231, engine 34/34, root suite **1151 pass / 0 fail**,
ui pre-existing set unchanged, all tsc zero, full build clean.

Composer: emits `rows:all` when no output clause; salvage migrates bare
queries to `all` on edit (rewrite-on-edit; C2's normalizer covers stored
docs in the same release).

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
