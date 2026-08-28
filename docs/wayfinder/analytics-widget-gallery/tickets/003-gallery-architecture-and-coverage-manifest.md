---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Gallery architecture and coverage manifest"
blocked-by: ["001-corpus-coverage-audit", "002-fixture-extension"]
---

## Question

Lock the merged gallery's structure before any build-out (HITL grilling).

1. **Coverage manifest**: exact checklist axes (8 widget types × 7
   aggregators × rollups none/1d/1w × query families aggregate/rows/find)
   and where it lives — story file header comment, or a linked markdown
   asset? How is "covered" marked and kept honest as the gallery evolves?
2. **Section layout**: order and grouping of the auto-inference section,
   the eight curated per-widget sections, the rows/find section, and the
   edge-states section. One long page or multiple stories in one file?
3. **Dispatch mechanics**: curated sections render through `WidgetChart`
   with explicit `type` + `params` (fence-tag parity); how are params
   (goal-ring target, zone-distribution zone targets) showcased — via the
   `/`-separated body-param syntax from `splitWidgetBody`?
4. **Card anatomy**: does the existing `ExampleCard` survive (title,
   description, query string, journal badge), and what does it gain —
   stages telemetry (`result.stages`), matched-record counts, widget-type
   badge?
5. Which of the audit's honest-data combos map to which section/card —
   the concrete manifest entries. Post-fixtures (002): grade toplists
   (`count:calc.sends{} by {grade}`, climb) and calc.\* cards (acwr /
   monotony / strain, crossfit weekly) are now honest; **`round` is
   excluded** (engine-side unimplemented dim, ruled out of scope); the
   `by {metric}` dim is available if a card wants it; event-grain
   discipline stays `(none)` — decide whether that empty card appears or
   the dim is dropped from curated sections.

## Resolution

Spec: [003-gallery-architecture-and-coverage-manifest.md](../assets/003-gallery-architecture-and-coverage-manifest.md)

One-line answer: the manifest is a **typed exported card array** (section,
widgetType, title, question, journal, query, params) enforced by a vitest
coverage test over `DASHBOARD_WIDGET_TYPES` × 7 aggregators × rollups; the
gallery stays one file with **one story per section** (auto-inference, 8
curated widget sections, rows & find, edge states); curated cards run the
**real Dashboard Note contract** (`splitWidgetBody` + `parseQueryWidgetSuffix`
→ `WidgetChart`, `/`-separated params); cards keep ExampleCard's anatomy and
gain a type chip + stages readout (`selected → buckets → aggregated →
groups`); the approved manifest drafts **22 gallery + 5 rows/find + 2 edge
cards** across all 4 journals, all 7 aggregators, both rollups. Proposed-
metric badges excluded; `round` excluded; units axis graduated to
[ticket 008](008-unit-preference-showcase.md) (blocks 004).
