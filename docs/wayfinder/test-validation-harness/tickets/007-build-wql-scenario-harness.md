---
state: open
labels: [wayfinder:task]
title: "Build the WQL scenario harness"
blocked-by: ["005-seed-fake-data-corpus", "006-wql-scenario-format"]
---

## Question

Land the goal-2 harness in-repo:

1. Scenario runner over `QueryService` + the corpus loader (005): execute
   each scenario's query against its slice, compare against the expected
   readable form per 006's rules.
2. Glob-discovery — new scenario file adds a test, mirroring 004's harness.
3. Wiring into `bun run test:packages`.
4. Initial scenario set: 006's approved examples expanded to its mandatory
   family list.

Verification: root suite green; new scenario file adds a test; wrong
expected output fails with a readable table diff.
