# Gallery architecture & coverage manifest

Ticket: [003-gallery-architecture-and-coverage-manifest](../tickets/003-gallery-architecture-and-coverage-manifest.md) ·
Resolved 2026-08-28 (HITL grilling). This is the build-out spec for
[ticket 004](../tickets/004-aggregate-widget-sections.md),
[ticket 005](../tickets/005-rows-and-find-sections.md), and
[ticket 006](../tickets/006-live-edge-states.md).

## Decisions

- **D1 — Manifest home & honesty**: the curated gallery renders from one
  typed, exported card array (the manifest: section, widgetType, title,
  question, journal, query, params, optional `preferredUnit: 'kg' | 'lb'`).
  A vitest test iterates `DASHBOARD_WIDGET_TYPES`, the 7 aggregators,
  rollup periods, and the units axis against the array and fails on
  regression. Human-readable mirror lives here.
- **D2 — Layout**: single `WqlGallery.stories.tsx`, **one story per
  section** (Auto Inference, Value, Timeseries, Bar, TopList, Stacked Bar,
  Goal Rings, Zone Distribution, Table, Rows & Find, Edge States);
  manifest array + helpers in a non-story module.
- **D3 — Dispatch**: curated cards exercise the real **Dashboard Note**
  contract — one-line body `query / param1 param2` parsed via
  `splitWidgetBody` + `parseQueryWidgetSuffix`
  (`packages/wql/src/dashboard/model.ts`), rendered through `WidgetChart`
  with the parsed type and params. Wrong type strings show the real
  unknown-widget badge.
- **D4 — Card anatomy**: title, description (coaching question), query
  string, journal badge (kept from ExampleCard) **plus** a declared-type
  chip and a stages readout (`selected → buckets → aggregated → groups`)
  off `result.stages`.
- **D5 — Manifest entries**: approved as drafted below (25 gallery cards
  incl. the kg/lb pair, 5 rows/find, 2 edge states). Proposed-metric
  badges (`calc.readiness` …) are **not** in the manifest — the
  `isProposedMetric` path stays editor-side.
- **D6 — Units are a coverage axis** (ticket 008, 2026-08-28): cards
  carry an optional `preferredUnit` plumbed through the executor call
  (`service.run(parsed, { preferredUnit })`); the manifest includes a
  same-query default/`preferredUnit: 'kg'` pair and the coverage test
  enforces ≥1 preferred-unit card. Conversion is family-scoped
  (`packages/wql/src/units.ts`: mass kg↔lb, distance m↔km; `convert`
  passes values through unchanged across/without families). Fixture
  facts are lb-denominated (no kg rows exist), so the honest demo is
  default→lb vs preferred→kg. `in <unit>` directive cards remain
  welcome but unenforced.

## The manifest

### Auto Inference — `useChartShape` decides alone

| Query | Journal | Shape → render |
|---|---|---|
| `avg:tis{}` | crossfit | scalar → value |
| `sum:sessionLoad{} by {effort}` | crossfit | 3×1pt → bars |
| `sum:calc.strain{} by {week}.rollup(1w)` | crossfit | 1×6pt → timeseries |
| `sum:sessionLoad{} by {intensity}.rollup(1w)` | climb | 3×Npt → timeseries |

(Auto cannot produce stacked-bar — the declared type's reason to exist.)

### Curated (WidgetChart, declared type)

| Section | Query | Journal | Params | Coverage note |
|---|---|---|---|---|
| value | `avg:sleep{}` | wellness | | origin:user story |
| value | `min:tis{}` / `max:tis{}` | crossfit | | 38 / 62 |
| value | `last:totalVolume{}` | crossfit | | 435 |
| value | `delta:sessionLoad{}` | endurance | | +40 |
| value | `sum:totalVolume{}` (default) | crossfit | | units pair — renders first-source **lb**, 53,775 |
| value | `sum:totalVolume{}` | crossfit | `preferredUnit: 'kg'` | units pair — same query, mass family applies, ≈24,389 kg |
| timeseries | `sum:totalVolume{} by {week}.rollup(1w)` | crossfit | | 1w |
| timeseries | `sum:distance{}.rollup(1d)` | endurance | | 1d, 18 pts |
| timeseries | `sum:calc.strain{} by {week}.rollup(1w)` | crossfit | | calc.* series |
| bar | `sum:totalVolume{} by {effort}` | crossfit | | |
| bar | `sum:distance{} by {discipline}` | endurance | | |
| toplist | `count:calc.sends{} by {grade}` | climb | | 6 grades |
| toplist | `sum:totalVolume{} by {note}` | crossfit | | 18 groups, limit 6 |
| stacked-bar | `sum:tis{} by {intensity}.rollup(1w)` | climb | | 3 tiers (climb sessionLoad has only 2 — build correction) |
| goal-rings | `sum:calc.sends{}` | climb | `/ 10` | target param |
| goal-rings | `avg:sleep{}` | wellness | `/ 8` | sleep target |
| zone-distribution | `sum:tis{} by {intensity}.rollup(1w)` | climb | `/ 70 20 10` | zone params, 3 honest tiers (build correction) |
| table | `sum:sessionLoad{} by {effort}` | crossfit | | bars-shaped table |
| table | `sum:totalVolume{}.rollup(1w)` | crossfit | | timeseries table |

### Rows & Find (built in ticket 005)

| Query | Journal | Note |
|---|---|---|
| `rows:all{result:res-fran-w0}` | crossfit | drill-down pair with Weekly tonnage |
| `rows:segment{result:res-fran-w5}` | crossfit | outputType plane |
| `rows:all{result:res-boulder-w4}` | climb | the send rows feeding Sends by grade |
| `rows:all{note:note-well-2026-06-03}` | wellness | |
| `find:note{tags:benchmark}` | crossfit | 6 matches |
| `find:block{text:fran}` | crossfit | derived block index (rawContent = note title) |
| `find:effort{intensity:high}` | crossfit | bundled effort registry (5 efforts) |

Store wiring (ticket 005 decision): `buildServiceForJournal` now wires a
`BlockQueryStore` DERIVED from the journal's records (one
`BlockIndexRow` per distinct noteId/segmentId/segmentVersion/blockContentId,
`dataType: 'wod'`, `rawContent` = note title — a gallery-side projection;
the corpus journals carry no markdown body) and an `EffortQueryStore` over
`bundledEfforts` from `@bitcobblers/wod-wiki-lang` (the same seed set the
app's CompositeEffortRegistry loads). `find:{target}` renders through a
gallery-local `FindResultList` — no dashboard widget exists for content
discovery.

### Edge States (build-out = ticket 006)

| Query | Journal | Produces |
|---|---|---|
| `sum:totalVolume{effort:nonexistent}` | crossfit | empty |
| `sum:totalVolume by` (malformed) | crossfit | parse error |
| — | — | loading = natural suspense |

## Coverage axes (what the vitest enforces)

- Widget types: value, timeseries, bar, toplist, stacked-bar, goal-rings,
  zone-distribution, table — 8/8 in curated sections.
- Query families: aggregate, rows, find — 3/3 (rows/find guarded by
  parse + family checks in the coverage test).
- Aggregators: sum, avg, min, max, count, last, delta — 7/7.
- Rollups: none, 1d, 1w — 3/3.
- Journals: crossfit, endurance, wellness, climb — 4/4.
- Units: ≥1 card with `preferredUnit` set, incl. the `sum:totalVolume{}`
  default-lb / preferred-kg pair (same query, both units).
- Explicitly excluded: `round` dim (engine-side unimplemented), proposed
  calc.* badges.
