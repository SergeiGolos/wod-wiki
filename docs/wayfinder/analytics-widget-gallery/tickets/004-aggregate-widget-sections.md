---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Aggregate widget sections — all 8 types, live"
blocked-by: ["002-fixture-extension", "003-gallery-architecture-and-coverage-manifest"]
---

## Question

Build the aggregate-query half of the merged gallery per the locked
manifest ([003 asset](../assets/003-gallery-architecture-and-coverage-manifest.md)):

1. Auto-inference section: queries rendered purely via `useChartShape`
   (scalar → QueryValue, multi-point → WqlTimeseries, else WqlBars),
   demonstrating what WQL determines without a declared type.
2. Eight curated sections — table, value, timeseries, bar, toplist,
   stacked-bar, goal-rings, zone-distribution — each card a live
   declared type, per the manifest's aggregator/rollup assignments.
   Units axis (ticket 008): cards carry optional `preferredUnit`; the
   manifest's `sum:totalVolume{}` pair (default lb / preferredUnit kg)
   rides in the Value section.
3. Rollup variety visible across sections: unrolled group-bys, `.rollup(1d)`,
   `.rollup(1w)` all represented.
4. Every card shows its query string and journal provenance (existing
   ExampleCard pattern), so the data-source → WQL → render round trip is
   legible on the page.

Acceptance: each manifest row for the aggregate family renders in
Storybook with real corpus data; no hand-built `QueryResult` fixtures
remain in these sections.

## Resolution

Built per the locked manifest. New modules: `apps/storybook/src/gallery/`
— `journals.ts` (corpus loading + `buildServiceForJournal` + `rangeEnd`
pinning), `galleryManifest.ts` (typed `GALLERY_CARDS`, 25 cards),
`GalleryCard.tsx` (card + section renderers; auto path via
`useChartShape`, curated path via `splitWidgetBody` +
`parseQueryWidgetSuffix` → `WidgetChart`). Stories: one per section
(Auto Inference, Value, Timeseries, Bar, Top List, Stacked Bar, Goal
Rings, Zone Distribution, Table) in `WqlGallery.stories.tsx`; the legacy
gallery shrank to its rows half (`Rows Legacy`, ticket 005 replaces).

Coverage guard: `apps/storybook/test/galleryManifest.test.ts` — 8 widget
types, 7 aggregators, rollups none/1d/1w, 4 journals, units axis
(default/preferredUnit pair), plus parse checks for every card query and
declared type. Storybook suite 53/53 green; eslint clean; tsc clean for
gallery files.

Verified live in Storybook (browser-driven, screenshots on the ticket):
all 25 cards render with real corpus data and zero errors; stages
readouts show the round trip (e.g. grade toplist: selected 8 → groups 6);
units pair 53,775 lb vs 25,695.11 kg (rep-unit rows pass through
unconverted, per D6); goal rings read `/ 10` → 80%; zone distribution
reads `/ 70 20 10`. Build corrections to the spec asset (recorded there):
stacked-bar + zone cards use `sum:tis{} by {intensity}.rollup(1w)` —
climb's sessionLoad has only 2 intensity tiers; the audit's 3-tier series
is tis. Auto charts needed sized containers (`h-48`) for recharts.
