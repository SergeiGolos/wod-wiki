---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Rows and find family sections"
blocked-by: ["003-gallery-architecture-and-coverage-manifest"]
---

## Question

Give the non-aggregate query families first-class, component-rendered
sections (today `WqlGallery` renders rows with ad-hoc markup and has no
find: examples):

1. **Rows section**: replace the custom runs markup with the real
   `RowsTable` component (`packages/ui/src/widgets/RowsTable.tsx`);
   cover `rows:{result:…}`, `rows:{note:…}`, and at least one outputType
   plane (`WQL_RESULT_PLANES`).
2. **Find section**: live `find:note`, `find:block`, `find:effort`
   examples. `buildServiceForJournal` currently wires only `noteStore`;
   audit finding: `find:block`/`find:effort` return **empty** without
   their stores — candidates are a BlockQueryStore derived from records'
   `blockContentId`/`noteId`/`segmentId` and an EffortQueryStore from the
   engine's effort registry. What renders a `FindQueryResult` (existing
   component or a gallery-local list card — decided per ticket 003's
   architecture)?
3. Scoped rows + aggregate interplay: at least one card showing a
   `rows:`-scoped result feeding understanding of an aggregate card (the
   "drill-down" story).

Acceptance: rows/find families render through real UI components against
live corpus stores; the ad-hoc rows markup in `WqlGallery.stories.tsx`
is gone.

## Resolution

Built. `buildServiceForJournal` now wires the full content plane:

1. **Rows**: the ad-hoc runs markup is gone; the four rows cards render
   through the real `RowsTable` (`rows:all{result:res-fran-w0}`,
   `rows:segment{result:res-fran-w5}` plane, `rows:all{result:res-boulder-w4}`
   showing the 13 boulder statements incl. grade-tagged sends,
   `rows:all{note:note-well-2026-06-03}`).
2. **Find**: `buildServiceForJournal` wires a **derived BlockQueryStore**
   (one `BlockIndexRow` per distinct noteId/segmentId/segmentVersion/
   blockContentId, `dataType: 'wod'`, `rawContent` = note title — a
   documented gallery-side projection; the journals carry no markdown
   body) and an **EffortQueryStore over `bundledEfforts`**
   (`@bitcobblers/wod-wiki-lang`, the seed set the app's
   CompositeEffortRegistry loads; lang/wql IEffort index-signature split
   cast as in the app's RegistryEffortStore). Rendering: **gallery-local
   `FindResultList`** — no dashboard widget exists for content discovery
   (decision per ticket 003's architecture). Verified live:
   `find:note{tags:benchmark}` → 6, `find:block{text:fran}` → 6 blk-fran
   rows, `find:effort{intensity:high}` → Rowing + Burpee.
3. **Drill-down**: "Fran session statements" describes itself as the
   facts behind Fran's bar in Weekly tonnage and sits adjacent in the grid.

Runner fix (necessary for any of this to be enforced): the storybook app's
vitest config only collected `src/**/*.stories.*` — unit tests under
`test/` never ran (pre-existing gap; LanguageWorkbench.test.tsx included).
Restructured `apps/storybook/vitest.config.ts` into two projects
(`storybook-workbench` browser runner unchanged, new `app-unit` node
runner for `test/**/*.test.ts`). Suite: 12 files / 61 tests green (53
story renders + 8 manifest-coverage tests incl. the new family axis).
Known leftover: `test/*.test.tsx` files still have no runner (pre-existing;
LanguageWorkbench.test.tsx) — flagged, not silently widened.
