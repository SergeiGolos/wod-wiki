---
state: closed 2026-08-28
assignee: serge # claimed 2026-08-28
title: "Corpus coverage audit — what can the four journals honestly show?"
blocked-by: []
---

## Question

Before a coverage manifest can be written, what do the four corpus journals
(`packages/wql/fixtures/corpus/`: crossfit-multi-week, endurance-block,
mixed-wellness, climb-yoga) actually support when queried through
`inMemoryEventStore` + `QueryService`?

1. Which **fact dims** are populated per journal (effort, discipline, grade,
   intensity, note, origin — resolved by `QueryService.factTagValue` off the
   projected fact row; records carry no `tags` field)?
2. Which **aggregators** produce meaningful output per journal (sum, avg,
   min, max, count, last, delta)?
3. Are records dense enough for **1d rollups** and long enough for **1w
   rollups**? Which journals can show multi-bucket timeseries?
4. Which **virtual dims** (day, week, session, round) yield >1 group?
5. What feeds **rows:** planes (result/note scopes, outputType planes) and
   **find:** targets (note/block/effort) — and do the gallery's current
   stores (only `noteStore` is wired in `buildServiceForJournal`) suffice?
6. Which widget types already have honest data (goal-rings needs
   target-worthy metrics; zone-distribution needs intensity-tagged
   sessionLoad over time)?

Produce a coverage matrix asset (journal × dim/aggregator/rollup/widget)
marking each cell honest-data / thin / absent. The gaps list is the input
to [Fixture extension for gallery coverage](002-fixture-extension.md).

## Resolution

Spec: [001-corpus-coverage-audit.md](../assets/001-corpus-coverage-audit.md)

One-line answer: all four journals answer **all 7 aggregators** live and
feed every widget type except the four named gaps — **grade is absent in
every journal** (all `(none)`), **calc.\* is empty everywhere** (no
materialized rollup facts), the **round virtual dim is dead** in all
journals, and **event-grain facts can't group by discipline/intensity**
(no such metadata on rep/elapsed rows) — everything else is honest data:
crossfit/endurance are the dense timeseries journals (18 days, 1d+1w
rollups), climb-yoga is the only 3-tier intensity journal (stacked-bar,
zone-distribution), wellness owns the `origin:user` scalar story (sleep,
session-rpe), `rows:` planes verify end-to-end (segment plane on
`res-fran-w5`), and `find:block`/`find:effort` need **store wiring in the
gallery** (block/effort stores), not fixture data.
