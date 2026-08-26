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
- [De-overload in with compat (C2)](tickets/008-de-overload-in-c2.md) —
  `in` means units always; scope folds into `source:` filters; `ParsedFindQuery.scope`
  removed; `WQL_SCOPES` retired to `WQL_SOURCE_VALUES`; `normalizeWql`
  compatibility normalizer rewrites legacy `in <scope>` and bare `rows:{…}`
  heads with advisories; engine main `2462ec9`+`da4c967`.
- [AST-only structured interface (C6)](tickets/009-ast-only-structured-interface-c6.md) —
  total `serialize` beside `parseQuery`: fixed-point on canonical text,
  structural round-trip for all text-surface-representable ASTs (raw/advisories
  excluded by contract), errored ASTs echo raw; 400-AST property test with
  coverage guards; engine main `0942f88`+`1b9b771`.
- [Release the language train](tickets/010-release-the-language-train.md) —
  `@bitcobblers/*` published at 0.10.41 carrying the full wql train; RC smoke
  caught the umbrella missing the new surface (fixed `588a0fd`+`79c6d18`,
  guarded by reexport tests) — **republish 0.10.42 before consuming**; the 24
  pre-existing ui failures resolved on the train (41/41 green).
- [Consume the train in the app](tickets/011-consume-the-train-in-the-app.md) —
  app on ^0.10.42; C1 windows in query text (range math deleted, equivalence
  proven), C2 modern recordsWql + source:/legacy URL parity pinned, C5
  family-aware chips, C6 serializeQuery on the engine serializer; explorer
  window emission deferred to 013 (breaks wqlToClauses-routed contracts);
  suite 2421/0; metric-store `9832b07c`+`006a5aef`.
- [Docs cutover for WQL v2](tickets/012-docs-cutover-for-wql-v2.md) —
  deep-dive/spec/analytics docs on the shipped surface; every real query
  example parses against the engine (39/39); spec-vs-ship divergences
  recorded on the prototype doc (find: own family, plural source vocab,
  find:-only join halves, aggregate-only in-units); metric-store
  `454d5139`+`cd34d28d`.
- [Composer on ASTs (C6 ui package)](tickets/013-composer-on-asts-ui-package.md) —
  composer state is the AST (parseQuery + astToPills in, pillsToAst +
  serializer out); clause-model exports retired from the ui surface;
  round-trip pinned on the serializer; app hooks hold WQL strings,
  structural edits via wqlEdits; metrics plane has a time pill (011's
  window deferral resolved); engine `48fdcee`+`07b4ef6`+`ed28149` (0.11.0,
  publish pending), app `55d9bf73`+`5286fba2`; suite 2436/0.
- Explorer window-emission — resolved by 013: restore is now the real
  parser, so windowed aggregates round-trip into the composer (metrics
  plane time pill). The page keeps `?weeks=` chrome + `rangeStart` for its
  dashboard-style range; a future pass may fold it into the text.
- App-side error UX for the new parse errors — resolved: the existing
  single composer error line (`urlQueryError`, #854) carries the C2/C7
  errors unchanged; pinned by the useLibraryQueryState suite.
## Not yet specified

- C2 hard-drop timing for the legacy `in <scope>` **and bare `rows:{`**
  compatibility normalizer — a post-train minor; decidable now that the app
  consumes the train.

## Out of scope

- App-side V16 unified-store migration **execution** (external effort; this
  map sequences behind it only through the release train).
- Open target/metric registries — C7 stays a closed enum (prototype non-goal).
- Changes to filter algebra, aggregators, cross-store join semantics, or
  grains beyond the inherited `summary|event` tag retirement.
- New units beyond kg/lb/m/km passthrough behavior.
- Storage engines beyond IndexedDB; sync/multi-device concerns.
