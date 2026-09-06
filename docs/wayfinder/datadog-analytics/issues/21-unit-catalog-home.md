# Shared unit catalog home, conversion evidence, and extension propagation

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none
Prerequisites: [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md); [Unit normalization, output defaults, and reducer correctness](13-units-and-arithmetic.md); [Shared unit recognition and conversion](../deepening/02-unit-policy.md)

## Question

Where does the shared unit recognition/conversion catalog physically live, and how do conversion evidence, contextual units, and dialect-added entries reach every consumer — given the verified package topology (`wql` and `lang` each depend only on `core`; there is no `wql → lang` dependency)?

Resolve:

- **Physical home and dependency direction.** Extend `packages/core` with recognition + conversion evidence (the vocabulary's stated home, a package both consumers already depend on), or core defines the extended `UnitDef` while `lang` keeps hosting. The seam is the same either way; the choice must not create a `core → lang` import, and calc's `AUTHORITATIVE_CASTS` must never be imported by the WQL path.
- **Conversion evidence model.** Fixed factors; contextual requirements (`bw` only with genuine measurement-time context) with the persisted representation and versioning of that evidence agreed here so ticket 14 can write it; the error taxonomy (`unknown-unit`, `dimension-mismatch`, `scale-mismatch`, `missing-context`, `non-finite`, `non-convertible`). A blanket rejection of all `bw` values is not an acceptable resolution.
- **Extension propagation.** How validated dialect-added aliases, scales, and factors reach every consumer as one composed catalog snapshot — including dialect fusion views — with invalid or contextless evidence remaining diagnosable rather than silently dropped. Recognition spellings do not change mid-migration.
- **System-default output table ownership** given the chosen home (mass `kg`, distance `m`, duration `s`, count, energy `cal`, speed `m/s`, pace `min/km`, ratio unitless — values already agreed; the question is where the table lives).

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets. Ticket 13's converter rewrite consumes this resolution; until then 13 proceeds only with its contract-required families on the interim path the Answer names.

## Answer

Agreed 2026-09-06, grilling session with serge (four questions, one at a time):

1. **Home — core-owned catalog.** Recognition and conversion evidence move to `packages/core` beside the vocabulary. `lang` and `wql` consume through their existing core dependency; no `wql → lang` edge is created; calc's authoritative casts remain in `packages/lang`'s calc layer and are never imported by the WQL path. Recognition spellings do not change during migration — moves are import-path updates.
2. **Contextual conversion — snapshot evidence at write.** A `bw` measurement persists its contemporaneous body-mass snapshot (value + provenance) beside the original `bw` value; read-time conversion fills its context from the row itself. Today's measurements never reinterpret history; `bw` without evidence yields the `missing-context` limitation — never silent pass-through, never blanket rejection. Ticket 14 owns the physical encoding and versioning.
3. **Extension propagation — validated overlay, one composed snapshot.** Dialects add aliases and fixed factors freely; contextual or scale entries only with explicit evidence; conflicts with core canonical spellings are compose-time errors. One composed snapshot threads through the captured execution context (ticket 12) so recognition, conversion, and display read identical additions; invalid evidence is a compose-time diagnostic, never silent.
4. **System defaults — core data, wql policy.** The default output unit table lives in core beside the catalog with the values agreed in ticket 13 (mass `kg`, distance `m`, duration `s`, count, energy `cal`, speed `m/s`, pace `min/km`, ratio unitless; named speed/pace take precedence); the application policy (defaulting, explicit `in <unit>` override, incompatible error) stays wql's.

Glossary: **Conversion Evidence** and **Composed Catalog Snapshot** added to [CONTEXT.md](../../../../CONTEXT.md). Ticket 13's rewrite target is now fixed; it remains blocked by 11 and 12.

**Interim path for ticket 13:** `packages/wql/src/units.ts` stays frozen until 13 starts — no interim extension of the wql-local table, since adding families there would recreate a divergent unit table that the core migration would then have to re-absorb. When 13 unblocks (11 and 12 done), its first milestone lands the core catalog and overlay consumption with recognition spellings unchanged; the strict-conversion policy and system defaults flip in that same ticket per the arithmetic contract. Until then the current table remains bug-for-bug.

Evidence base: [Shared unit recognition and conversion](../deepening/02-unit-policy.md) (verified three-table survey and package-dependency facts); consumers [ticket 13](13-units-and-arithmetic.md), [ticket 14](14-db-v17-lifecycle.md).
