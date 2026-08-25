---
state: open
labels: [wayfinder:task]
title: "Release the language train"
blocked-by: ["009-ast-only-structured-interface-c6"]
---

## Question

Publish from engine **main** — the store is already merged and consumed
(app on `^0.6.36`) — as the release carrying the seven language changes
with the C2 compatibility normalizer active:

1. Engine suite green (wql, core, lang, ui, engine packages).
2. `stamp-version.ts`; publish `@bitcobblers/*` packages (next minor).
3. Storybook smoke / e2e pass on the release candidate.

Answer records released versions — the consumption and docs tickets block on
exactly those.
