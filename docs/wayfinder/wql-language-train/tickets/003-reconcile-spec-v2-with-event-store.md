---
state: closed 2026-08-25
assignee: serge # claimed 2026-08-25
title: "Reconcile spec v2 with the event store"
blocked-by: ["001-lezer-unified-head-spike"]
---

## Resolution

`docs/prototype/wql-interface-changes.md` rewritten in place as **spec v2**
(grilling session, 2026-08-25). All eight agenda items resolved:

1. §1.0 store story: UnifiedEventStore, one authoritative projection —
   two-materializations language deleted; read-time shape derivation noted.
2. Grain vocabulary: `summary|event`, `rollup` retired at parse; residual
   gaps recorded in v2 §5 (docs rows → docs-cutover ticket; app error UX →
   consumption ticket).
3. C4/C5/C6 reworded per asset 003; C3/C5/C7 marked **landed** with
   commits; C5's "one record" simplification explicitly not taken.
4. `$window` verified dissolved (absent from `dashboard/model.ts`); the
   workloadRollup rider **folds into C1** (decision 3).
5. CLI parity: none needed — `WqlSyntaxError` flows all parse errors; the
   window parses in the suffix layer. Recorded in v2 §3.
6. Sequencing re-confirmed; blast radii de-lined-numbered (structural).
7. **Bare `rows:{…}` retires; `rows:all` adopted** (decision 1) — C2's
   normalizer rewrites bare→`all` during deprecation; app's 7 bare-usage
   sites migrate in the consumption ticket.
8. **Time-dim keys: local civil ISO dates** (decision 2) — day
   `YYYY-MM-DD` local components, week civil-Monday `YYYY-MM-DD`
   component math; kills locale-string day keys and the DST-unsafe week
   label; lands with C1.

Graduated: ticket 006 (+rows:all, +content-plane execution), ticket 007
(+civil-ISO rider), ticket 008 (+bare→all normalizer rewrite). Fog
narrowed: CLI parity and grain-vocab gaps resolved/recorded; C2 hard-drop
timing and Explorer window-emission stay fog.

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
