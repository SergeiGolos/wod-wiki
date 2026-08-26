---
state: closed 2026-08-26
assignee: serge # claimed 2026-08-26
labels: [wayfinder:task]
blocked-by: ["005-seed-fake-data-corpus", "006-wql-scenario-format"]
---

## Resolution

Landed `apps/storybook/src/WqlGallery.stories.tsx` (Gallery/WQL Example Gallery):
- Curated example gallery grouped into 4 sections: Scalar Summaries, Grouped Breakdowns, Weekly Trends, Session Rows & Statement Scopes.
- Sourced directly from the four seeded corpus journals (`crossfit-multi-week.json`, `endurance-block.json`, `mixed-wellness.json`, `climb-yoga.json`) via `inMemoryEventStore` + `NoteQueryStore` adapters.
- Each card runs its query live through `QueryService` and renders via `@bitcobblers/wod-wiki-ui` widgets (`QueryValue`, `WqlTimeseries`, `WqlBars`, `TopList`) or rows lists.

Verification: `test:storybook` runs all stories including the gallery (4 files, 17 tests passed); `typecheck` clean.

## Question

Land the goal-4 gallery: a storybook surface listing curated WQL examples
over the corpus with live executed results:

1. Where it lives (story vs docs page) and how examples are listed
   (grouped by query family).
2. Examples are sourced from — and stay in sync with — the scenario corpus:
   what's shown in the gallery is asserted by 007's tests.
3. Rendering reuses the ui widgets already proven in
   `LanguageWorkbench.stories.tsx`.

Verification: `dev:storybook` renders the gallery over real corpus data;
`test:storybook` passes.
