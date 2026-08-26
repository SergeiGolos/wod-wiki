---
state: open
labels: [wayfinder:grilling]
title: "Fake-data corpus shape"
blocked-by: []
---

## Question

Concretize the shared fake-data corpus ("WQL examples with predefined data
structures"):

1. What one unit of the corpus is: a journal of UnifiedEventRecord seeds? A
   note + execution-log pair? Both — and which is canonical?
2. File format and directory location that package vitest projects *and* the
   storybook app can import (workspace boundary — no app→package-reverse
   imports).
3. How scenarios and stories reference/slice it (whole journal, by note, by
   time window).
4. Relationship to the existing golden
   `apps/storybook/fixtures/golden/multi-week-journal.json` — absorb,
   replace, or extend?
5. Required coverage: disciplines, tags, multi-week windows (for `.rollup`),
   edge shapes (missing units, **Choice Groups**, wellness vs workout notes).

Constraint (fixed at charting): one corpus feeds scenario tests, example
gallery, and workbench.

Deliverable: shape spec + catalog plan (what journals get seeded in 005).
