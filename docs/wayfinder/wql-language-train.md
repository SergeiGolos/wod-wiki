---
labels: [wayfinder:map]
title: "WQL language train — apply the interface changes on the event-store line"
---

# Wayfinder Map — WQL Language Train

## Destination

The seven WQL interface changes ([prototype](../prototype/wql-interface-changes.md),
C1–C7), reconciled with the unified-event-store decisions, are **applied
end-to-end**: spec v2 written, changes landed on engine main and released,
consumed by this app repo (version bump + all app-side deltas), legacy
queries still parsing, docs updated.

## Notes

- Store half DELIVERED (2026-08-24 review): engine unified store merged and
  published (app on `^0.6.36`), app V16 migration live (`DB_VERSION = 16`).
  Language work targets engine **main**. Fog findings from the review: the
  dashboard `$window` token does not exist anywhere (dissolved); the
  workloadRollup dual day-bucketing is confirmed live → graduated to
  [Fix workloadRollup dual bucketing](tickets/014-fix-workload-rollup-dual-bucketing.md).

- **Plan-mode override: this effort carries execution** (set at charting).
  Task tickets land code; still never resolve more than one ticket per session.
- Preconditions owned elsewhere: the engine-side unified store lives on the
  `event-store` branch of `/home/serge/projects/wod-wiki-engine-event-store`
  (4 commits ahead of main, +1202/−381: `UnifiedEventStore` +
  `appendEvents`/`finalizeSummaries`/`deleteEvents` done, grain `rollup`
  retired; **no C1–C7 work yet**). The app-side V16 migration (`DB_VERSION
  = 15` today) is *not* this map's job.
- The app consumes engine packages as published npm versions (`^0.6.32`).
  Consequence: engine tickets stay in the engine repo; **all app-repo edits
  concentrate in the post-release consumption ticket**.
- Domain background: [map A assets](unified-event-store-map.md) — especially
  [Query service and WQL impact](assets/../assets/003-query-service-and-wql-impact.md)
  (C4/C5 simpler, C6 trivially satisfied, grain tags `summary|event`),
  [09-wql-deep-dive.md](../09-wql-deep-dive.md).
- Skills: `/grilling`, `/domain-modeling` for HITL tickets. Output style:
  ADHD mode (lead with action, numbered steps, ≤5-item lists).
- Inherited sequencing law (prototype §3): C3 → C5 → C7 → C4 → C1 → C2 → C6.

## Decisions so far

- [Lezer unified-head conflict spike](tickets/001-lezer-unified-head-spike.md) —
  targeted `rows:<target>` already parses natively; every grammar shape for
  the bare `rows:{…}` alias conflicts (`Word` ∩ `By` after colon) — grammar
  stays strict, alias retire-or-normalize decided at spec v2.
- [Suffix validation errors (C3)](tickets/002-suffix-validation-c3.md) —
  duplicate suffix clauses now error naming first/last spans at every parse
  entry point; single-occurrence parsing unchanged; composer salvage parser
  rejects conflicting strings.
- [Fix workloadRollup dual bucketing](tickets/014-fix-workload-rollup-dual-bucketing.md) —
  single truth chosen: LOCAL training days (engine `day` dim groups by local
  date strings, so the ticket's epoch-UTC premise inverted); dayBucket is now
  a civil-day ordinal (DST-collapse-proof), wellness stamps local midnight.
- [Discriminated query union (C5)](tickets/004-discriminated-query-union-c5.md) —
  `family` on every parsed AST; guards read it; `ParsedQuery` renamed
  `ParsedAggregateQuery` (no alias) on engine main `da6c42a`+`172cc75`;
  core dist was stale on main — full rebuild needed before release.
- [Find-target validation (C7)](tickets/005-find-target-validation-c7.md) —
  closed enums at parse: find → note|block|effort, rows → content planes ∪
  KNOWN_OUTPUT_TYPES; store stays open, text surface closed; composer
  salvage rejects instead of rewriting unknown targets.
- [Reconcile spec v2 with the event store](tickets/003-reconcile-spec-v2-with-event-store.md) —
  prototype doc rewritten as spec v2: three decisions — bare `rows:` retires
  for `rows:all` (C2 normalizer migrates), time-dim keys become local civil
  ISO dates (lands with C1), day-dim rider folded into C1; C3/C5/C7 marked
  landed; `$window` verified dissolved; CLI parity: none needed.
- [Rows-in-grammar cutover (C4)](tickets/006-rows-in-grammar-c4.md) —
  grammar-native rows head (no grammar change needed), synthetic `find:_`
  dead, all validation at parse, `runRows` executes only; bare form retired
  for `rows:all`; content planes execute; engine main `17ecde2`+`3c19185`.
- [Window module everywhere (C1)](tickets/007-window-module-c1.md) —
  `QueryWindow` on every family (`last` + `from/to` civil ranges, mutual
  exclusion, one predicate); day/week rider landed as civil bucketing —
  goldens updated from epoch-Thursday weeks to civil Mondays; engine main
  `7549814`+`499a7d6`.

## Not yet specified

- C2 hard-drop timing for the legacy `in <scope>` **and bare `rows:{`**
  compatibility normalizer — a post-train minor; decidable once the app
  consumes the train.
- Explorer window-emission details (`useExplorerQueryState` interplay with
  emitted `last Nw` text) — sharpens during the consumption ticket.
- App-side error UX for the new parse errors (single composer error line) —
  re-examined in the consumption ticket (v2 §5).

## Out of scope

- App-side V16 unified-store migration **execution** (external effort; this
  map sequences behind it only through the release train).
- Open target/metric registries — C7 stays a closed enum (prototype non-goal).
- Changes to filter algebra, aggregators, cross-store join semantics, or
  grains beyond the inherited `summary|event` tag retirement.
- New units beyond kg/lb/m/km passthrough behavior.
- Storage engines beyond IndexedDB; sync/multi-device concerns.
