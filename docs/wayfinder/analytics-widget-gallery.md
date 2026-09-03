---
labels: [wayfinder:map]
title: "Analytics widget gallery — one canonical live WQL showcase"
---

# Wayfinder Map — Analytics Widget Gallery

## Destination

One canonical Storybook gallery — `WqlGallery.stories.tsx` absorbs
`AnalyticsWidgets.stories.tsx` — where every graph type the codebase can
render (the 8 `DASHBOARD_WIDGET_TYPES` plus the `rows:`/`find:` families) is
shown **live**: corpus records flow through the store abstraction
(`inMemoryEventStore` / `UnifiedEventStore`), through `QueryService` with
real WQL (filters, group-bys, rollups), into the widget the query calls
for. Coverage is enforced by a manifest (every widget type, aggregator, and
rollup period appears at least once); edge states (empty/error/loading) are
produced live, not from static fixtures. Done = the merged gallery renders
in Storybook and `AnalyticsWidgets.stories.tsx` is deleted.

## Notes

- **Plan-mode override: this effort carries execution** (set at charting).
  Task tickets land code; still never resolve more than one ticket per session.
- Standing decisions from charting (2026-08-27 grilling):
  - **Merge, don't fork**: `WqlGallery.stories.tsx` (already live via
    `QueryService` over the 4 corpus journals) is the surviving file;
    `AnalyticsWidgets.stories.tsx` (static hand-built `QueryResult`
    fixtures) is absorbed and deleted at cutover.
  - **Hybrid widget selection**: one auto-inference section
    (`useChartShape`: scalar → value, multi-point → timeseries, else bars)
    proves what WQL determines by itself; curated sections pin widget types
    explicitly via `WidgetChart` (the fence-tag dispatcher) so all 8 types
    appear.
  - **Coverage checklist**: every widget type (table, value, timeseries,
    bar, toplist, stacked-bar, goal-rings, zone-distribution), every
    aggregator (sum, avg, min, max, count, last, delta), and both rollup
    periods (1d, 1w) appear at least once, tracked by a manifest.
  - **Datasets**: reuse the 4 corpus journals
    (`packages/wql/fixtures/corpus/`: crossfit-multi-week now 78 records,
    endurance-block, mixed-wellness, climb-yoga now 41); extend records
    only where a manifest combo has no honest data.
  - **Scope**: 8 `QueryResult` widget types + rows/find query families.
  - **Edge states live**: empty = filter matching nothing; error = malformed
    WQL through `parseQuery`; loading = natural suspense.
- Key machinery (verified):
  - Widget dispatcher: `packages/ui/src/widgets/WidgetChart.tsx` (type +
    result + params → widget); auto-shape: `useChartShape.ts`.
  - Round trip: `inMemoryEventStore(records)` + `QueryService.run/runRows`
    — pattern already in `WqlGallery.stories.tsx` `buildServiceForJournal`.
  - Fact dims are query-time projections off the record
    (`QueryService.factTagValue`: effort, discipline, grade, intensity,
    note, origin) — audit done: dims live per journal except grade/round
    (see [Decisions so far](#decisions-so-far)).
  - Widget params (goal-ring target, zone targets) ride the `/`-separated
    body params (`splitWidgetBody` in `packages/wql/src/dashboard/model.ts`).
  - Vocabulary: `packages/wql/src/vocabulary.ts` (aggregators, rollup
    periods 1d/1w, virtual dims day/week/session/round, tag keys).
- Skills: `/grilling`, `/domain-modeling` for HITL tickets. Verify UI
  changes by driving Storybook (localhost:6006) with the browser tool.

## Decisions so far

<!-- one line per closed ticket: gist + link to its asset -->
- [Corpus coverage audit — what can the four journals honestly show?](tickets/001-corpus-coverage-audit.md) —
  all 7 aggregators live on every journal; grade/calc.*/round absent
  everywhere; event-grain rows can't group by discipline/intensity;
  climb-yoga is the only 3-tier intensity journal; `rows:` planes verify,
  `find:block`/`find:effort` need store wiring (not fixture data) —
  [asset](assets/001-corpus-coverage-audit.md) with the full matrix.
- [Fixture extension for gallery coverage](tickets/002-fixture-extension.md) —
  additive only, all pinned consumer values unchanged: climb-yoga grew 8
  grade-tagged `calc.sends` event rows (grade dim now honest: 6 groups),
  crossfit grew 18 weekly calc.acwr/monotony/strain summary rows (calc.*
  now honest: scalar + 1w timeseries), round dim dropped (engine-side
  unimplemented), event-grain discipline accepted as `(none)`, wellness
  density deferred to the manifest.
- [Gallery architecture and coverage manifest](tickets/003-gallery-architecture-and-coverage-manifest.md) —
  manifest = typed card array + vitest coverage test; one story per
  section in one file; curated cards run the real Dashboard Note contract
  (`splitWidgetBody` → `WidgetChart`); cards gain type chip + stages
  readout; 22 gallery + 5 rows/find + 2 edge cards drafted across all
  axes; proposed-metric badges excluded —
  [spec asset](assets/003-gallery-architecture-and-coverage-manifest.md).
- [Unit-preference showcase — is kg/lb a coverage axis?](tickets/008-unit-preference-showcase.md) —
  yes: optional `preferredUnit` on cards plumbed through the executor;
  manifest pair `sum:totalVolume{}` default-lb vs preferred-kg
  (fixtures are lb-denominated — no kg rows exist); coverage test
  enforces ≥1 preferred-unit card.
- [Aggregate widget sections — all 8 types, live](tickets/004-aggregate-widget-sections.md) —
  built: `gallery/` modules (journals, manifest, card renderers), 9
  section stories, 25 live cards, mechanical coverage guard (53/53
  tests green); verified in Storybook with zero card errors; two spec
  corrections recorded on the ticket (intensity cards → tis; auto
  charts need sized containers) — legacy gallery shrank to its rows
  half pending ticket 005.
- [Rows and find family sections](tickets/005-rows-and-find-sections.md) —
  built: RowsTable renders the four rows cards; content plane wired
  (derived block index + bundled efforts from lang); find:{target}
  renders via gallery-local FindResultList; legacy rows view deleted;
  app vitest config restructured (stories browser project + node unit
  project) so the coverage guard actually runs — 61/61 green, verified
  live in Storybook.
- [Live edge states — empty, error, loading](tickets/006-live-edge-states.md) —
  built: edge-states section and EdgeStatesSection story in Storybook;
  5 live cards (empty aggregate with honest stages telemetry, malformed WQL
  surfacing parse errors via useChartShape error branch, in-flight loading
  suspense via WqlEmptyState, empty rows plane via RowsTable, and empty find
  plane via FindResultList); mechanical coverage guard in galleryManifest.test.ts
  enforces edge coverage; no static fixtures survive.

## Not yet specified

- **Visual-regression snapshots**: the merged gallery is live and therefore
  non-deterministic across time-windowed queries; whether storyshots/pinned
  `rangeEnd` snapshots are wanted is unaddressed.
- **Auto-inference convergence**: gallery auto section uses `useChartShape`
  while `WidgetChart` dispatches on declared type — whether these converge
  into one shared shape-resolver is a design question beyond this map.

## Out of scope

- Dashboard chrome: `DashboardView`, `DashboardTokenControls`, frontmatter
  `$token` substitution, `RangeSelector` interactivity (ruled out at
  charting — scope is query widgets + rows/find families). The static
  `RangeSelectorWidget` story dies with AnalyticsWidgets unless ticket 007
  relocates it.
- New widget types or changes to `packages/ui` widget internals.
- Implementing the `round` virtual dim in the engine (no `factTagValue`
  case / `dimValue` branch — found unimplementable via fixtures by
  [Fixture extension](tickets/002-fixture-extension.md)); excluded from
  gallery coverage.
- WQL grammar / language-surface changes (separate effort:
  [WQL language train](wql-language-train.md)).
- App-side (IndexedDB) data sources — the gallery runs on in-memory corpus
  stores only.
