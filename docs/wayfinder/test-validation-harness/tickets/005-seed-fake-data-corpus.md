---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
title: "Seed the fake-data corpus"
blocked-by: ["002-fake-data-corpus-shape"]
---

## Resolution

Four journals authored and seeded under `packages/wql/fixtures/corpus/`:
- `crossfit-multi-week.json` (60 records, 18 notes): 6 weeks Fran / Simple & Sinister / bodyweight chipper + Fran w5 events.
- `endurance-block.json` (56 records, 18 notes): 6 weeks run intervals / row steady / bike tempo + run events.
- `mixed-wellness.json` (17 records, 10 notes): strength + easy cardio with wellness summaries (sleep, session-rpe), missing unit edge, sparse week 3.
- `climb-yoga.json` (33 records, 15 notes): 5 weeks boulder / vinyasa / swim drill + boulder event rows.

Harness loader and store constructor at `packages/wql/tests/harness/corpus.ts` (`listCorpusJournals`, `loadJournal`, `journalStores`).

Verification: 27 invariant and contract tests in `packages/wql/tests/corpus.test.ts` (schema envelope, id grammar, referential integrity, canonicalKey/discipline/grain validation, monotonic timestamps, 10 disciplines coverage, 6+ week rollup spans, QueryService smoke); root typecheck clean; full packages suite passes.

## Question

Author the corpus per 002's shape:

1. The journals/notes 002's catalog plan calls for (disciplines, tags,
   multi-week windows, edge shapes).
2. Loader API usable from package vitest projects and the storybook app.
3. Loader unit tests (determinism, slice operations).

Verification: corpus loads through the API in one smoke scenario; storybook
app build stays clean importing it.
