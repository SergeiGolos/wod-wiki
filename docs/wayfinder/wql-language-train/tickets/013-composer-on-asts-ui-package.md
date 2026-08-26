---
state: closed 2026-08-26
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

## Resolution

Landed: engine main `48fdcee` + `07b4ef6` + `ed28149` (stamped 0.11.0,
publish pending — user's credentials); app metric-store `55d9bf73` +
`5286fba2`.

1. **Composer state is the AST.** New `packages/ui/src/composer/queryAst.ts`:
   restore is `parseQuery` + `astToPills` (structural projection); emission
   is `pillsToAst` + the engine serializer. The one private text builder
   (`buildCandidateText`) is the edit path INTO the parser only — no
   hand-rolled string leaves the composer (errored edits yield error ASTs,
   which the serializer echoes verbatim per its totality clause).
2. **Surface retired.** `clausesToWql`, `wqlToClauses`, `pivotClauses`,
   `CLAUSE_META`, `defaultMetricsClauses` — plus `clauseToWql`, `clauseValue`,
   `defaultClauses`, `setMetricClause`, `splitWhereTail`, `diagnoseClauses` —
   are gone from the package surface (index.ts and the built .d.ts). The pill
   vocabulary (types/options) stays internal.
3. **Round-trip green on the serializer.** 36 projection tests pin
   `pillsToWql(wqlToPills(q)) === serialize(parseQuery(q))`; non-expressible
   states reject honestly (negation, range windows, conflicts, unknown
   targets, real provenance on block/effort targets or rows; `source:all`
   absorbs as identity everywhere). One bounded salvage: the composer-native
   empty-metric aggregate (`sum:{}`) probes through the parser with a
   placeholder and blanks the metric pill back.
4. **App migration.** Hooks hold WQL strings (`query`/`setQuery`); pages
   wire `query`/`onQueryChange`; structural edits live in
   `playground/src/lib/wqlEdits.ts` (parse → mutate → serialize, total over
   unparseable input). Explorer subset/records derive from the parsed join,
   never regexes. Legacy URL migrations produce modern canonical queries.
5. **C1 capability unlocked.** The metrics plane has a time pill:
   `sum:tis{} by {week} last 6w` restores into the composer — the 011
   deferral (windows broke `wqlToClauses`-routed contracts) is gone, because
   restore is now the real parser. Verified in the browser (library radio
   pivot + explorer windowed-aggregate restore).

Review rounds (engine + app, both initially flagged): provenance projection
gaps, controlled raw-escape diagnostics, the brace-unaware subset regex,
hand-rolled records braces — all fixed and re-verified. Engine ui suite
48/48, storybook 15/15; app suite 2436/0, tsc at baseline, build:app green.

**Publish handoff**: engine main is stamped 0.11.0 and built — `npm publish`
per package is the user's step (same flow as 0.10.41/42); the app consumes
`^0.11.0` and will resolve once published (developed/verified against the
local tarball, identical content).
