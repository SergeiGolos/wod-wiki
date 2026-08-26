---
state: closed 2026-08-26
labels: [wayfinder:grilling]
title: "Fake-data corpus shape"
assignee: serge # claimed 2026-08-26
---

## Resolution

Spec: [002-fake-data-corpus-shape.md](../assets/002-fake-data-corpus-shape.md)

One-line answer: canonical unit = one **journal** — a `.json` of
**UnifiedEventRecord** rows (`kind: "event-journal"` envelope, id =
filename) at `packages/wql/fixtures/corpus/` (unpublished, engine-golden
house pattern); no shared loader — queries slice, consumers read JSON
directly; golden is **absorbed** (regenerated as a corpus journal, cutover
cut as its own ticket [010](010-golden-fixture-cutover.md): CLI loader
accepts event-journal payloads, parity + storybook migrate, both golden
copies deleted); four journals to seed — crossfit-multi-week,
endurance-block, mixed-wellness, climb-yoga — with referential-integrity
and id-grammar invariants enforced by 005's helper tests.

Grounding notes: golden was byte-duplicated across engine + storybook
(md5-equal) — duplication dies with the cutover; wql publishes dist-only,
so the corpus must not live in `src/`; `inMemoryFactStore` is a legacy
fact→event adapter the storybook side drops at cutover.

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
