---
state: open
labels: [wayfinder:task]
title: "Seed the fake-data corpus"
blocked-by: ["002-fake-data-corpus-shape"]
---

## Question

Author the corpus per 002's shape:

1. The journals/notes 002's catalog plan calls for (disciplines, tags,
   multi-week windows, edge shapes).
2. Loader API usable from package vitest projects and the storybook app.
3. Loader unit tests (determinism, slice operations).

Verification: corpus loads through the API in one smoke scenario; storybook
app build stays clean importing it.
