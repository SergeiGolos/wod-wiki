---
state: open
labels: [wayfinder:task]
title: "Release the language train"
blocked-by: ["009-ast-only-structured-interface-c6"]
---

## Question

Merge the `event-store` branch to engine main and ship it as the release that
carries store + language together:

1. Engine suite green on the branch (wql, core, lang, ui, engine packages).
2. Merge to main; `stamp-version.ts`; publish `@bitcobblers/*` packages.
3. Storybook smoke / e2e pass on the release candidate.

Answer records released versions — the consumption and docs tickets block on
exactly those.
