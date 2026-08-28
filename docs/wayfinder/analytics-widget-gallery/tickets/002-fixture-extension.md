---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Fixture extension for gallery coverage"
blocked-by: ["001-corpus-coverage-audit"]
---

## Question

Close the data gaps the audit found so every manifest combination has
honest backing data — by extending records in the existing four corpus
journals (charting decision: reuse + extend, no purpose-built fixture
unless the audit proves a journal can't carry a combo).

1. The audit's concrete gap list (see
   [001 asset §Gaps](../assets/001-corpus-coverage-audit.md)): **grade
   metadata absent in all journals** — add grades to climb-yoga boulder
   sessions (engine stars grade tags on climb sends,
   `packages/lang/src/analytics/engine.ts:97`); **round dim dead** —
   round-tagged event rows or the manifest drops the dim; **calc.\*
   empty** — wire the ensure-rollup-facts path vs materialize rollup
   facts (this decision belongs to this ticket); **event-grain
   discipline/intensity metadata missing** on rep/elapsed rows — extend
   or accept `(none)` as the honest empty example; **wellness
   timeseries thin** (3–4 pts) — densify only if the manifest wants a
   wellness timeseries card.
2. Do extensions stay hand-authored JSON in the existing fixture style,
   and do the parity/golden tests that consume these fixtures
   (`packages/engine/tests/parity.test.ts`, storybook tests) still pass
   with the new rows?
3. If a combo genuinely can't be carried by any existing journal, is one
   new small fixture justified — and what is its minimal shape?

Resolution records: the per-journal record additions (and any new fixture),
plus confirmation the existing fixture consumers are unaffected or updated.

## Resolution

Additive-only fixture extensions; every pinned consumer value unchanged
(corpus schema, parity, CLI, scenario harness, storybook suites all green).

1. **grade** → added: 8 event-grain `calc.sends` segment rows on
   `res-boulder-w4` (climb-yoga, 33→41 records) with
   `metadata: {effortSlug, grade}` (V1–V6) — the exact persisted shape of
   the calc engine's climb-send annotations
   (`packages/lang/src/analytics/calc/engine.ts:101,134-152`). Verified
   live: `count:calc.sends{} by {grade}` → 6 honest groups.
2. **round** → dropped: `by {round}` is an **engine-side unimplemented
   dim** — no case in `QueryService.factTagValue` (QueryService.ts:264)
   and no branch in `dimValue` (QueryService.ts:318) — no fixture can
   make it group. Manifest (ticket 003) excludes it; implementing it is
   an engine change, out of scope.
3. **calc.\*** → **materialized in fixtures**: no `ensureRollupFacts`
   implementation exists anywhere yet (only the optional callback slots),
   so wiring would mean building a new engine-side derivation; hand-
   authored summary rows in the exact persisted shape (metadata.canonicalKey)
   match the existing totalVolume/tis honesty contract. Added 18 rows to
   crossfit (60→78 records): calc.acwr / calc.monotony / calc.strain
   anchored on each week's final session (res-chip-w0…w5), units
   ratio/ratio/AU per seeds.ts. Verified live: `avg:calc.monotony{}` →
   1.77, `sum:calc.strain{} by {week}.rollup(1w)` → 6-point series.
4. **event-grain discipline/intensity** → accepted `(none)`: derivation's
   event branch reads only effortSlug/intensityTier/grade from metadata
   (`derivation.ts:322-324`), so a discipline dim on event facts needs an
   engine change — out of scope for a fixture ticket. `(none)` stays as
   the honest empty example.
5. **wellness timeseries density** → deferred to the manifest (ticket 003)
   per the ticket's own condition; no rows added.

Consumer updates: `LanguageWorkbench.test.tsx` exact-count 60 → 78 (only
test change; lint clean, 3 pre-existing warnings untouched). No new
fixture file needed — every combo carried by an existing journal.
