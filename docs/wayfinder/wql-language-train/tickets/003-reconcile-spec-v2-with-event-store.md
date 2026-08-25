---
state: open
labels: [wayfinder:grilling]
title: "Reconcile spec v2 with the event store"
blocked-by: ["001-lezer-unified-head-spike"]
---

## Question

Rewrite `docs/prototype/wql-interface-changes.md` in place into v2, folding in
what the unified-store decisions changed (asset 003 §6) and what the branch
already did:

1. Fix §1.0's store story: folds and `rows:` read the **UnifiedEventStore**
   (one authoritative projection) — not "Analytics Store fact rows +
   ResultLogStore, two materializations".
2. Grain vocabulary: `summary | event`, `rollup` retired — record what the
   branch already rejects at parse and what gaps remain (error UX, test
   coverage, docs).
3. Reword C4/C5/C6 per asset 003 (simpler / simpler / trivially satisfied),
   recording the spiked head rule from ticket 001.
4. Verify the dashboard `$window` token mechanism (`dashboard/model.ts`) and
   place the workloadRollup UTC-vs-local rider (own ticket vs folded into C1).
5. Scan CLI parity needs (`packages/engine/src/cli/query.ts`).
6. Re-confirm §3 sequencing still holds on the branch reality; adjust blast
   radii that cited pre-unification line numbers.
7. Decide the bare `rows:{…}` alias: retire it (explicit targets required,
   compat advisory migrates dashboards) or keep it via placeholder-target
   normalization at parse entry — ticket 001 proved every grammar-level
   empty-target shape conflicts (`Word` ∩ `By` after colon).
8. Engine time-dimension encoding inconsistency discovered by ticket 014:
   the `day` dimension groups by a locale display string
   (`toLocaleDateString`) while `week` uses a UTC ISO slice — decide and
   document canonical encodings when C1 lands.

Output: the v2 document plus newly graduated tickets/fog updates on this map.
