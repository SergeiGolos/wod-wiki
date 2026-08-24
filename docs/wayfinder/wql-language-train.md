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

- Preconditions owned elsewhere: the unified store **is merged to engine
  main** (PR #1 plus review commits `9201a61`/`2d78e17`: grade roundtrip,
  origin-scoped finalize, `AnalyticsDataPoint.grain` narrowed to
  `'event' | 'summary'`, CLI emits `'event'`; **still no C1–C7 language
  work**). Publish/release remains. The app-side V16 migration
  (`DB_VERSION = 15` today) is *not* this map's job.

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

## Not yet specified

- Dashboard `$window` token substitution: mechanism unverified
  (`dashboard/model.ts`); graduates into the window ticket or a sibling when
  the v2 spec examines it.
- `workloadRollup.ts` buckets by **local** date while QueryService buckets by
  UTC ms — the C1 correctness rider. Own test or folded into the window
  ticket: decided by the v2 spec ticket.
- Residual grain-vocabulary gaps between the branch and asset 003
  (parse-error UX, vocabulary test coverage) — enumerated by the v2 spec
  ticket.
- CLI query-surface parity (`packages/engine/src/cli/query.ts`) for new
  parse errors and windows — scoping falls out of the v2 spec ticket.
- C2 hard-drop timing for the legacy `in <scope>` compatibility normalizer —
  a post-train minor; decidable once the app consumes the train.
- Explorer window-emission details (`useExplorerQueryState` interplay with
  emitted `last Nw` text) — sharpens during the consumption ticket.

## Out of scope

- App-side V16 unified-store migration **execution** (external effort; this
  map sequences behind it only through the release train).
- Open target/metric registries — C7 stays a closed enum (prototype non-goal).
- Changes to filter algebra, aggregators, cross-store join semantics, or
  grains beyond the inherited `summary|event` tag retirement.
- New units beyond kg/lb/m/km passthrough behavior.
- Storage engines beyond IndexedDB; sync/multi-device concerns.
