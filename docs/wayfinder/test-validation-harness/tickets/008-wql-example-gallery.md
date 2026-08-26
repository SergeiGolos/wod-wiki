---
state: open
labels: [wayfinder:task]
title: "WQL example gallery"
blocked-by: ["005-seed-fake-data-corpus", "006-wql-scenario-format"]
---

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
