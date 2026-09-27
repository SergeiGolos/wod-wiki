# Language Redesign — Gap Audit and Work Batches

**Status: audit evidence + proposed work order; no code changed by this document.**
Audits performed 2026-09-13 against commit `79b232db`. Every claim below was verified with file:line evidence by five parallel read-only code audits covering doc 19 §§3–12 (57 claims total); the two load-bearing negative findings were re-verified directly. Doc 19's own status claim ("proposed design; not implemented") is **correct**: every *Proposed* contract is absent from the codebase, and its *Current behavior* sections are accurate except where amended in §A.

## 0. Method

- 57 claims from doc 19 §§3–12 checked against `packages/{lang,wql,ui,core,engine}`.
- Verdicts: 55 CONFIRMED, 2 REFUTED (§A), 0 unverifiable. All 24 source files doc 19 references exist, as do docs 15–18.
- Verbatim evidence is cited inline; line numbers are valid at `79b232db`.

## A. Amendments required to doc 19 (2 inaccuracies)

| # | Doc 19 claim | Verified reality | Amendment |
| --- | --- | --- | --- |
| A1 | §5: "An operand uses only its explicitly authored window; absence means all time, not inheritance from the outer query." | True **only for find operands** (QueryService.ts:1187 passes just `join.last`). For **metric operands** the authored window is dropped at parse (MetricPredicate has no window field, wql.ts:312-319) and the **primary query's window is applied to the joined metric facts** (QueryService.ts:1199-1210, verified directly). Current baseline is inherited-window, not all-time. | §5 migration text "preserving all-time behavior" has the wrong baseline for the metric-operand half. The old→new expectation table must record: metric operand with no written window currently inherits the primary window. |
| A2 | §6: "…`defaults`, `show`, formulas, `(normalize ...)`, and `-> unit` remain supported." | `(normalize ...)` is parsed and stored (document.ts:125,152) but has **zero consumers repo-wide** — the only reference is its own declaration (document.ts:32). It parses; it does nothing. | Doc 19 cannot list `(normalize ...)` as a supported retained construct. Decide in the ledger: formally retire the spelling (breaking removal row) or leave the parse as documented-inert. Implementing consumption is out of scope (§4.8 excludes resampling). |

## B. Missing — described by doc 19, absent from the codebase

Expected per doc 19's status; listed with the concrete gap each implementation must close.

| Doc § | Proposed element                                                                             | Code gap                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | `where (...)` delimited operand; canonical clause order; refusal with insertion location     | `splitAtWhere` splits at a bare brace-aware `where` (wqlSuffix.ts:47-58); suffixes peel right-to-left in any authored order (wqlSuffix.ts:96-100); `parseJoinClause` never strips parentheses (wql.ts:296-312). Noncanonical order parses silently today.                                                                                                                    |
| 6     | Typed `$name` parameter nodes; parse→resolve→bind→validate                                   | No parameter node in either grammar; `$` is not lexable inside the wql `Word` token (wql.grammar:76). Only raw regex substitution exists: dashboard/model.ts:228, queryDocumentRunner.ts:144-148. No "requires value" diagnostics, no binding types, no parameter spans anywhere.                                                                                            |
| 6     | `"$name"` is literal text                                                                    | Both substitution regexes are quote-unaware — `"$foo"` interpolates today. Breaking change is real, as doc 19 states.                                                                                                                                                                                                                                                        |
| 4.5   | Reject calendar time dimension + `.rollup`; reject multiple calendar dimensions              | Silently ignored: `const rollupMs = timeDim ? null : …` (QueryService.ts:1007-1008). `by {week}.rollup(4w)` means weekly grouping with no diagnostic. Parse validates only the rollup unit (wql.ts:682-685).                                                                                                                                                                 |
| 4.6   | Refuse date-only observations under fixed-duration grouping                                  | Silent fetch-timestamp bucketing: rollup keys on raw `row.timestamp` (QueryService.ts:1022); civil-date facts fall back to `record.timestamp` (derivation.ts:432-435; storage.ts:245-249 "V16 fetch anchor").                                                                                                                                                                |
| 4.8   | Formula alignment by structural bucket and group identity; calendar/fixed mismatch diagnosis | Operands align by representative timestamps in a flat `Map<ts, value>` (documentRunner.ts:233,260); group identity absent from the key; `corr` pinned at ts 0 (documentRunner.ts:308-309).                                                                                                                                                                                   |
| 8     | Quoted named labels `("Warm up 2")`                                                          | Grammar `String` token exists but is unreachable from `Rounds` (whiteboardscript.grammar:62 vs :77); no quote handling anywhere in the parser (grep: zero hits). The `label?: string` slot in RoundsPrimitive (syntax-facts.ts:37) is the landing spot.                                                                                                                      |
| 11    | All 8 breaking removals + standalone migration operation                                     | None implemented: unquoted names still accepted (grammar:76), raw `$` still substitutes, legacy `in <scope>` and bare `rows:{…}` still advisory-normalized by `normalizeWql` (wql.ts:358-371). **No migration/codemod tooling exists** (scripts/, tools/, package.json audited) — the only mechanical conversion is the in-parser advisory rewrite doc 19 intends to remove. |
| 12    | Clean cutover: shared runner as THE execution path                                           | `queryDocumentRunner.ts:2-4`: "intentionally unwired — no production consumer yet." Only non-test consumer is a re-export (wql/src/index.ts:36-42). Engine CLI (engine/src/cli/query.ts:272-292), QueryBlockView, and DashboardView all call QueryService directly.                                                                                                          |
| 3     | Common tagged result envelope / shared table+card renderer                                   | None. QueryBlockView has three disjoint branches (rows→RowsTable :196-214, find→local FindResultList :216-219, aggregate→AnalyticsChart). DashboardView refuses `find:` outright (:162-165) and has **no rows branch**.                                                                                                                                                      |

## C. Done wrong — verified code behaviors that contradict doc 19's intent or hide failures

Work items in their own right; owner noted per batch.

	1. **`runQuery` silently returns an empty count-0 aggregate for find/rows** (QueryService.ts:506-519, verified directly) — exactly the "misleading empty-success" §12.4 bans. DashboardView's rows path hits this stub today, since it has no rows branch.
1. **`find:effort` + `where (join)` silently dropped at execution** — parse accepts and stores the join, `runFindEffort` never reads `parsed.join`, no advisory. §5 proposes refusal; today it is silence.
2. **Cross-workout `rows:segment` passes an empty `noteTags` map** — a positive `tags:` filter can never match in cross-workout mode; only promoted fields work.
3. **Label truncation is total, not partial** — mapper keeps only the first Identifier (syntax-parser.ts:207) and sequence wins (semantic-classifier.ts:70-72): `(Warm up 2)` → `RoundsMetric(2)` with the whole label discarded; `(25 each leg)` → `RoundsMetric(25)`, "each leg" silently dropped. Nothing is ever rejected — the §8 migration plan ("distinct previews … block execution until resolved") has no preview/blocking machinery to build on.
4. **Silent ignore paths doc 17 owns diagnostics for**: interleaved group headers `(3 Rounds 21-15-9)` (extra Sequences dropped), heterogeneous choices `Run | 5` (no ChoiceGroup emitted, fuseUnits.ts:117-123), `*:30:?` (two DurationMetrics, no diagnostic).
5. **ClimbDialect runs in the default full stack without `:sport`** (DialectStack.dialectsFor returns all) — climb hints, `@12` attempt counts, and V5 grades leak into plain ` ```time ` blocks.
6. **Formula operand clobbering** — two series of one assignment sharing a bucket timestamp overwrite each other in `byPosition` (documentRunner.ts:233): a correctness bug distinct from §4.8's alignment contract.
7. **Dead surfaces**: `language.ts` attaches `fetchEntries` to completion results — not a CodeMirror `CompletionResult` field, so catalog key/grouping suggestions are inert (only metric/value completions merge). `documentRunner.ts:165-166` and `queryDocumentRunner.ts:66-67` declare `rangeStart`/`rangeEnd` options never read. Stale raw-log comment wql.ts:54-55 ("logs win", #800) contradicts the stored-event implementation (QueryService.ts:1279-1280) — doc 19 §5 already flags it.
8. **Token regexes disagree**: dashboard `/\$([A-Za-z][\w-]*)/` forbids a leading underscore; shared runner `/\$([A-Za-z_][\w-]*)/` allows it — same macro, two spellings.
9. **Object-kind property values get no `fieldRef`** (PropertyMetric.ts:46) — §9's "provenance through … catalog extraction, and WQL projection" has a hole for object values.
10. **Aggregate membership is delegated to the store fetch bound + by-metric-date union**, not per-row `inRange` (QueryService.ts:948-964); the in-package test double uses an inclusive `<=` end (reviewFixes.test.ts:15), so the store's boundary behavior is unverifiable from wql alone.
11. **Bare `rows:` without a brace already hard-errors** (`BARE_ROWS_RETIRED`, wql.ts:458) — half of ledger row 8 is pre-done; only the brace form still advisory-normalizes.

## D. Proposed work batches

Ordered shortest-diff-first, respecting ownership boundaries: doc 17 owns correctness diagnostics without new syntax; doc 18 owns consumer-inert removals; doc 19 owns breaking changes and cutover. No batch mixes owners.

### Batch 1 — Doc 19 amendments (paper)

1. Apply §A1 and §A2 amendments.
2. Add to the §11 ledger, if selected: `(normalize ...)` retirement row with refusal text.

**Acceptance:** doc 19's before/after tables match verified behavior for both join directions; no construct is listed as supported that has no consumer.

### Batch 2 — Correctness fixes and diagnostics (doc 17 owner)

1. Route find/rows away from the `runQuery` empty stub: DashboardView delegates rows → `runRows` + RowsTable, find → explicit refusal with explanation (completes doc 13's open action item). C3.1 fixed as a side effect.
2. Advisory (later refusal at cutover) for `find:effort` windows/joins — the parse-side advisories exist (wql.ts:763-780); add the execution-side drop advisory.
3. Diagnostics for the §C.4/§C.5 silent ignores: truncated labels, interleaved sequences, heterogeneous pipes, duplicate-primary timer combinations.
4. Cross-workout rows tags filter: load note tags or reject positive `tags:` filters with a diagnostic — never a silent no-match.
5. Formula `byPosition` clobber fix: key by `(groupIdentity, ts)` or refuse collision — behavioral change to formula results, so gated behind doc 17's observable gate.

**Acceptance:** no code path returns a fabricated empty success; each previously silent ignore emits a diagnostic naming the span.

### Batch 3 — Inert-surface cleanup (doc 18 owner)

1. Remove the dead `fetchEntries` attachment, the unread `rangeStart`/`rangeEnd` runner options, and the stale raw-log comment.
2. Unify the two token regexes on the runner spelling (`[A-Za-z_]`), documented as consumer-inert.

**Acceptance:** doc 18's consumer-inert demonstration per removal; no output change in existing tests.

### Batch 4 — Doc 19 implementation, in dependency order

| # | Item | Doc § | Notes |
| --- | --- | --- | --- |
| 4.1 | Calendar+rollup and multi-time-dimension conflict rejection | 4.5 | Smallest breaking change; rejection spans already computable from parse state (wqlSuffix + wql.ts store both clauses). |
| 4.2 | Date-only / fixed-duration incompatibility refusal | 4.6 | Requires `temporalKind` propagation into the rollup bucket stage (QueryService.ts:1022). |
| 4.3 | Formula alignment by bucket + group identity; mismatch diagnosis | 4.8 | Depends on 4.2's kind propagation; supersedes the Batch 2.5 stopgap. |
| 4.4 | `where (...)` operand ownership, canonical order, refusal diagnostics | 5 | New grammar node for the join half; migration wrapper = Batch 5 tooling, not an alias. |
| 4.5 | Quoted named labels; mixed-header refusal previews | 8 | Grammar change (String into `Rounds`) lands in the existing `label` slot; the preview/block machinery must be built first (§C.4 — none exists). |
| 4.6 | Typed parameters: nodes, bind/validate, unbound diagnostics | 6 | Grammar nodes in both grammars; binding contract per §6; quoted-literal rule lands here as the declared breaking change. |
| 4.7 | Cutover: wire shared runner everywhere; common result envelope; migration tooling; remove advisory aliases | 3, 11, 12 | Every §11 row needs its standalone migration operation before `normalizeWql` rewrites are deleted. |

**Acceptance:** per doc 19 §§3–10 acceptance lines; §12.6 consumer matrix (editor, CLI, Explorer, embedded blocks, dashboards, previews, exports) exercised on the shared runner before any alias removal.

## E. Evidence index

Primary evidence lives inline above; key files: `packages/wql/src/wql.ts`, `wqlSuffix.ts`, `QueryService.ts`, `calendar.ts`, `derivation.ts`, `selection.ts`, `document.ts`, `documentRunner.ts`, `queryDocumentRunner.ts`, `dashboard/model.ts`, `language.ts`, `catalog.ts`, `vocabulary.ts`, `grammar/wql.grammar`; `packages/lang/src/grammar/whiteboardscript.grammar`, `parser/syntax-parser.ts`, `parser/semantic-classifier.ts`, `parser/syntax-facts.ts`, `dialects/*`, `runtime/compiler/strategies/components/GenericLoopStrategy.ts`, `runtime/compiler/metrics/{PropertyMetric,RoundsMetric,ActionMetric,DurationMetric}.ts`, `metrics/units/UnitRegistry.ts`; `packages/core/src/types/{section,storage}.ts`; `packages/ui/src/blocks/QueryBlockView.tsx`, `packages/ui/src/widgets/{DashboardView,RowsTable}.tsx`; `packages/engine/src/cli/query.ts`.
