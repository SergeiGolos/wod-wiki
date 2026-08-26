---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Docs cutover for WQL v2"
blocked-by: ["010-release-the-language-train"]
---

## Question

Bring user/contributor docs to the shipped surface:

1. `docs/09-wql-deep-dive.md`: head rule (`rows:` primary, `find:` deprecated
   alias), window clauses on every family, `in` = units + `source:` filters,
   grain tags `summary|event` with `rollup` retired, error-as-value catalog.
2. Prototype doc marked implemented (status header), spec v2 confirmed
   accurate against what shipped.
3. Composer/cookbook references elsewhere in `docs/` swept for the old
   syntax examples.

## Resolution

Landed on metric-store, commits `454d5139` + `cd34d28d`.

1. **Deep-dive to the shipped surface** (`docs/09-wql-deep-dive.md`): family
   table + §2 rewritten — windows (C1) on every family with tail-rightmost
   order and civil-date ranges; rows head rule (target required, `rows:all`,
   content planes scope by content) with `find:` labeled the legacy
   content-discovery family (`runFind`), not an alias; `in` = units on
   **aggregates** (legacy find/rows `in <scope>` normalizes to `source:` +
   advisory); grains `summary|event` with `rollup` retired; C5 union AST
   with `QueryWindow`; window-first SELECT; civil-component `day`/`week`
   bucket keys; joins described as store-authoritative (finalize-owned
   summary rows via `getEventsByContent`); vocabulary table to shipped
   constants; error-as-value catalog with verbatim C2/C3/C7 message shapes;
   deprecation advisories documented.
2. **Prototype marked implemented** (`docs/prototype/wql-interface-changes.md`):
   status header, all seven changes landed (0.10.41/0.10.42), and the
   spec-vs-ship divergences recorded — `find:` kept as its own family;
   source vocabulary shipped plural (`journal|collections|feeds|all` +
   compound ids, no `playground`); join halves `find:`-only; `in`-units
   aggregate-only. Spec body otherwise accurate (its §1.3 C1 example was
   self-inconsistent with its own §1.2 tail order — fixed to parse).
3. **Sweep** (`docs/08-analytics.md`): `by {dim}` braces, `delta`
   aggregator, `totalVolume` key, grains table → summary|event, rollup
   retired. No other main docs carry legacy syntax.

**Verification**: every real query example in both docs parses against the
shipped engine (39/39 via `parseQuery`; the two review rounds caught five
examples that didn't — all fixed). Suite 2421/0 (docs-only). Reviewers'
first pass returned `incorrect` (parse failures + stale join claims); all
blockers and nits addressed in the review round.

Known pre-existing (not this ticket): §8's dashboard example nests
` ```query ` fences inside a ` ```markdown ` block — renders jankily in
strict CommonMark since before the train.
