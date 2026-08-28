# Corpus Coverage Audit — what the four journals can honestly show

Ticket: [001-corpus-coverage-audit](../tickets/001-corpus-coverage-audit.md) ·
Method: a throwaway probe script (bun, run 2026-08-28) executed every
aggregator / dim / rollup / rows / find query against each journal through
`inMemoryEventStore` + `QueryService` — the same round trip the gallery
uses. Fact dims resolve per `projectEventToFacts`
(`packages/wql/src/derivation.ts:261`): metric `metadata` keys
`effortSlug`, `effortDiscipline`, `effortIntensityTier`, `grade`, plus the
row's top-level `origin`.

## Journals at a glance

| Journal | Recs | Span | Days (weeks) | Summary metrics | Event metrics |
|---|---|---|---|---|---|
| crossfit-multi-week | 60 (54+6) | 2026-06-01 → 07-11 | 18 (6), ≤9/day | totalVolume, tis, sessionLoad | rep (×6, segment plane) |
| endurance-block | 56 | 2026-06-02 → 07-12 | 18 (6), ≤5/day | tis, sessionLoad, distance | elapsed (×2) |
| mixed-wellness | 17 | 2026-06-03 → 06-29 | 10 (5), ≤2/day | sleep, session-rpe (origin `user`), totalVolume, tis, distance | — |
| climb-yoga | 33 | 2026-06-04 → 07-05 | 15 (5), ≤5/day | tis (15), sessionLoad (10), distance (5) | rep (×3) |

## Dimension coverage (group-by / filter honesty)

| Dim | crossfit | endurance | wellness | climb |
|---|---|---|---|---|
| effort | 3 (fran, simple-sinister, bodyweight-chipper) | 3 (run-400s, row-steady, bike-tempo) | 1 (back-squat-5x5; sleep/rpe = `(none)`) | 3 (boulder-session, vinyasa-flow, swim-drill) |
| discipline | 3 (gymnastics, kettlebell, bodyweight) | 3 (running, rowing, cycling) | 1 (strength) | 3 (strength, recovery, swimming) |
| intensity | 2 (high, moderate) | 2 (high, moderate) | 1 (high) | **3 (high, moderate, low)** |
| grade | — all `(none)` in every journal | | | |
| origin | `journal` only | `journal` | `journal` + **`user`** (sleep, session-rpe) | `journal` |
| note | 18 groups | 18 | 3–4 | 15/10/5 by metric |

Event-grain facts (rep, elapsed) carry **no** `effortDiscipline`/`effortIntensityTier`
metadata (`derivation.ts:322-324` reads only effortSlug/intensityTier/grade, and the
fixtures carry none) — so `rep by {discipline}` → `(none)` everywhere. Only
summary facts group by discipline/intensity.

## Aggregators — all 7 live on every journal

Every summary metric answers sum/avg/min/max/count/last/delta with real
values. Samples: crossfit totalVolume sum 53775 / avg 2987.5 / min 360 /
max 5850 / count 18 / last 435 / delta −2355; wellness sleep avg 7.25,
delta −0.7. No aggregator gaps.

## Time density — rollups & virtual dims

| Journal | `.rollup(1d)` | `.rollup(1w)` | by {day} | by {week} | by {session} | by {round} |
|---|---|---|---|---|---|---|
| crossfit | 18 pts | 7 pts | 18 pts | 6 pts | 18 series | `(none)` |
| endurance | 18 pts | 7 pts | 18 pts | 6 pts | 18 series | `(none)` |
| wellness | 3–4 pts (thin) | 3–4 pts | 3 pts | 3 pts | 3 series | `(none)` |
| climb | 15 pts | 5 pts | 15 pts | 5 pts | 15 series | `(none)` |

`by {intensity}.rollup(1w)` stacked series: climb **3** (15 pts),
crossfit/endurance **2** (13/12 pts), wellness 1.

## Query families

- **rows:** works on all journals — `rows:all{result:…}` (3–9 events),
  `rows:all{note:…}`, plane narrowing verified: `rows:segment{result:res-fran-w5}`
  → 6 events, `rows:analytics{…}` → summary events. Note: crossfit's 6
  segment records all sit on `res-fran-w5` (not w0).
- **find:note** works (noteStore wired). **find:block / find:effort return
  empty** — the gallery's `buildServiceForJournal` wires only `noteStore`;
  BlockQueryStore could be derived from records' `blockContentId`/`noteId`/`segmentId`,
  EffortQueryStore from the engine's effort registry (wiring question for
  ticket 005, not fixture data).
- **calc.\* (all 10 targets)**: parse fine, return **empty** on every
  journal — no materialized rollup facts. Gallery would need the
  `onEnsureRollupFacts` path (as `useAnalyticsQueries` does) or fixtures
  carrying rollup facts.

## Widget-feed matrix (honest data today)

| Widget | crossfit | endurance | wellness | climb |
|---|---|---|---|---|
| value (scalar) | ✔ | ✔ | ✔ (avg:sleep, avg:session-rpe) | ✔ |
| timeseries (1d/1w) | ✔✔ | ✔✔ | thin (3–4 pts) | ✔ (15 pts) |
| bar (by effort/discipline) | ✔ 3 groups | ✔ 3 | ✔ 1 (weak) | ✔ 3 |
| toplist | ✔ (by note: 18; by effort: 3) | ✔ | weak (≤4) | ✔ (by note: 15) |
| stacked-bar (intensity × 1w) | ✔ 2 | ✔ 2 | — | ✔✔ **3 tiers** |
| goal-rings (last point vs target param) | ✔ (tis/sessionLoad) | ✔ | ✔ (sleep vs 8h) | ✔ |
| zone-distribution (intensity) | ✔ 2 tiers | ✔ 2 tiers | weak (1 tier) | ✔✔ **3 tiers** |
| rows table | ✔ | ✔ | ✔ | ✔ |
| find | note ✔; block/effort need store wiring | same | same | same |

## Gaps → inputs to ticket 002 (fixture extension)

1. **grade is absent everywhere** — `by {grade}` / grade toplist has no
   honest data. Natural fix: climb-yoga boulder sessions carrying grade
   metadata (engine already stars grade tags on climb sends —
   `packages/lang/src/analytics/engine.ts:97-101`).
2. **round virtual dim dead** — `(none)` in all journals; needs round-tagged
   event rows or the manifest drops it.
3. **calc.\* empty** — decide: wire the ensure-rollup-facts path in the
   gallery, or materialize rollup facts in fixtures.
4. **event-grain discipline/intensity** — rep/elapsed rows can't group by
   discipline/intensity; either extend event rows' metadata or accept `(none)`
   as the honest empty-state example.
5. **wellness timeseries thin** (3–4 pts) — fine for scalar/goal-rings; a
   denser patch would make wellness timeseries honest.
6. **find:block/find:effort** — store wiring (ticket 005), not fixture data.

## Standing constraint for the gallery

Journal timestamps are June–July 2026; default "last N weeks" windows are
empty. Every card must pin `rangeEnd` to the journal's newest record
timestamp (pattern already in `WqlGallery.stories.tsx`).
