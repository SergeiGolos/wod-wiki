---
state: open
labels: [wayfinder:task]
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
